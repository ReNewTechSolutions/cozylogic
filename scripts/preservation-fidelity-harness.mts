import { createHash } from "node:crypto";
import { channel } from "node:diagnostics_channel";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, extname, resolve } from "node:path";
import { performance } from "node:perf_hooks";

import dotenv from "dotenv";
import OpenAI from "openai";

import { buildFreeFixImagePrompt } from "../lib/cozylogic/freeFixPrompt.ts";
import {
  getConfiguredImageGeneration,
  type ImageQuality,
  type ImageSize,
} from "../lib/cozylogic/generationConfig.ts";
import { getImageEditInputFidelity } from "../lib/cozylogic/imageEditPolicy.ts";
import { scorePreservationReview } from "../lib/cozylogic/preservationScore.ts";

dotenv.config({ path: resolve(process.cwd(), ".env.local"), quiet: true });

const argv = process.argv.slice(2);

function option(name: string) {
  const inline = argv.find((item) => item.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : undefined;
}

function clean(value: string | undefined) {
  return value?.trim() || "";
}

const scorePath = option("--score");
if (scorePath) {
  const review = JSON.parse(readFileSync(resolve(scorePath), "utf8"));
  console.log(JSON.stringify(scorePreservationReview(review), null, 2));
  process.exit(0);
}

const variant = option("--variant");
if (variant !== "current" && variant !== "candidate") {
  throw new Error("Choose --variant=current or --variant=candidate.");
}

const fixturePath = resolve(
  option("--fixture") ?? "tests/fixtures/free-fix-canary.json"
);
const fixture = JSON.parse(readFileSync(fixturePath, "utf8"));
const selections = fixture.selections;
const prompt = buildFreeFixImagePrompt({
  roomTypeLabel: selections.roomTypeLabel,
  styleLabel: selections.styleLabel,
});

const qualityValues = new Set(["low", "medium", "high", "auto"]);
const sizeValues = new Set(["1024x1024", "1536x1024", "1024x1536", "auto"]);

function candidateConfig() {
  const model = clean(process.env.COZYLOGIC_PRESERVATION_CANDIDATE_MODEL);
  const quality = clean(process.env.COZYLOGIC_PRESERVATION_CANDIDATE_QUALITY);
  const size = clean(process.env.COZYLOGIC_PRESERVATION_CANDIDATE_SIZE);

  if (!model || !quality || !size) {
    throw new Error(
      "Candidate runs require COZYLOGIC_PRESERVATION_CANDIDATE_MODEL, _QUALITY, and _SIZE."
    );
  }
  if (!qualityValues.has(quality)) throw new Error("Invalid candidate quality.");
  if (!sizeValues.has(size)) throw new Error("Invalid candidate size.");

  return { model, quality: quality as ImageQuality, size: size as ImageSize };
}

const config =
  variant === "current"
    ? getConfiguredImageGeneration({
        budgetTier: selections.budgetTier,
        defaultQuality: "low",
        defaultSize: "auto",
      })
    : candidateConfig();
const inputFidelity = getImageEditInputFidelity(config.model, selections.budgetTier);
const confirmedPaidCall = argv.includes("--confirm-paid-call");

const audit = {
  fixtureId: fixture.id,
  variant,
  config: {
    ...config,
    inputFidelity: inputFidelity ?? "omitted",
  },
  promptSha256: createHash("sha256").update(prompt).digest("hex"),
  expectedInventory: fixture.expectedInventory,
  target: fixture.targets,
  imageInvocationsPlanned: 1,
  fallbackCalls: 0,
  textModelCalls: 0,
  paidCallConfirmed: confirmedPaidCall,
};

if (!confirmedPaidCall) {
  console.log(JSON.stringify({ ...audit, dryRun: true }, null, 2));
  process.exit(0);
}

const inputValue = option("--input") ?? clean(process.env.COZYLOGIC_PRESERVATION_INPUT_IMAGE);
if (!inputValue) {
  throw new Error("Provide an existing --input image or COZYLOGIC_PRESERVATION_INPUT_IMAGE.");
}
const inputPath = resolve(inputValue);
if (!existsSync(inputPath)) throw new Error(`Input image does not exist: ${inputPath}`);

const apiKey = clean(process.env.OPENAI_API_KEY);
if (!apiKey) throw new Error("OPENAI_API_KEY is required for a confirmed paid call.");

const extension = extname(inputPath).toLowerCase();
const mimeType =
  extension === ".png" ? "image/png" : extension === ".webp" ? "image/webp" : "image/jpeg";
const totalStartedAt = performance.now();
const inputPreparationStartedAt = performance.now();
const inputBytes = readFileSync(inputPath);
const inputFile = new File([new Blob([inputBytes], { type: mimeType })], basename(inputPath), {
  type: mimeType,
});
const inputPreparedAt = performance.now();

let outboundOpenAIRequests = 0;
let blockedAdditionalRequests = 0;
let fetchStartedAt: number | null = null;
let requestBodySentAt: number | null = null;
const bodySentChannel = channel("undici:request:bodySent");
const onRequestBodySent = (message: unknown) => {
  const origin = String((message as { request?: { origin?: string } })?.request?.origin ?? "");
  if (origin.includes("api.openai.com") && requestBodySentAt === null) {
    requestBodySentAt = performance.now();
  }
};

const guardedFetch: typeof fetch = async (input, init) => {
  const requestUrl = input instanceof Request ? input.url : String(input);

  // The SDK probes FormData support with a local data: URL before file uploads.
  // It is not a network or API request and must not consume the one-call budget.
  if (requestUrl === "data:,") {
    return globalThis.fetch(input, init);
  }

  const parsedUrl = new URL(requestUrl);
  if (
    parsedUrl.origin !== "https://api.openai.com" ||
    parsedUrl.pathname !== "/v1/images/edits"
  ) {
    blockedAdditionalRequests += 1;
    throw new Error("QA guard blocked a non-edit API request.");
  }

  if (outboundOpenAIRequests >= 1) {
    blockedAdditionalRequests += 1;
    throw new Error("QA guard blocked an additional OpenAI request.");
  }

  outboundOpenAIRequests += 1;
  fetchStartedAt = performance.now();
  return globalThis.fetch(input, init);
};

const openai = new OpenAI({ apiKey, maxRetries: 0, fetch: guardedFetch });
const params: any = {
  model: config.model,
  prompt,
  image: inputFile,
  size: config.size,
  quality: config.quality,
  n: 1,
  output_format: "png",
};
if (inputFidelity) params.input_fidelity = inputFidelity;

bodySentChannel.subscribe(onRequestBodySent);
const submittedAt = performance.now();
let response;
try {
  response = await openai.images.edit(params);
} finally {
  bodySentChannel.unsubscribe(onRequestBodySent);
}
const responseReceivedAt = performance.now();
const imageBase64 = response.data?.[0]?.b64_json;
if (!imageBase64) throw new Error("The single image invocation returned no image bytes.");
const responseMetadata = {
  quality: response.quality ?? null,
  size: response.size ?? null,
  usage: response.usage
    ? {
        inputTokens: response.usage.input_tokens,
        inputImageTokens: response.usage.input_tokens_details?.image_tokens ?? null,
        inputTextTokens: response.usage.input_tokens_details?.text_tokens ?? null,
        outputTokens: response.usage.output_tokens,
        totalTokens: response.usage.total_tokens,
      }
    : null,
};

const outputPath = resolve(
  option("--output") ??
    `/private/tmp/cozylogic-preservation-${variant}-${Date.now()}.png`
);
if (existsSync(outputPath)) throw new Error(`Refusing to overwrite existing output: ${outputPath}`);
const outputPersistenceStartedAt = performance.now();
writeFileSync(outputPath, Buffer.from(imageBase64, "base64"));
const outputPersistedAt = performance.now();

const timingMs = {
  inputPreparation: Math.round(inputPreparedAt - inputPreparationStartedAt),
  upload:
    fetchStartedAt !== null && requestBodySentAt !== null
      ? Math.round(requestBodySentAt - fetchStartedAt)
      : null,
  submitToGenerationStart:
    requestBodySentAt !== null ? Math.round(requestBodySentAt - submittedAt) : null,
  openAIGeneration:
    requestBodySentAt !== null
      ? Math.round(responseReceivedAt - requestBodySentAt)
      : Math.round(responseReceivedAt - submittedAt),
  openAIRoundTrip: Math.round(responseReceivedAt - submittedAt),
  outputPersistence: Math.round(outputPersistedAt - outputPersistenceStartedAt),
  totalUserVisible: Math.round(outputPersistedAt - totalStartedAt),
};

const reviewPath = `${outputPath}.review.json`;
writeFileSync(
  reviewPath,
  `${JSON.stringify(
    {
      fixtureId: fixture.id,
      variant,
      inputPath,
      outputPath,
      request: {
        model: config.model,
        quality: config.quality,
        size: config.size,
        n: 1,
        inputFidelity: inputFidelity ?? "omitted",
        imageInvocations: outboundOpenAIRequests,
        sdkMaxRetries: 0,
        fallbackCalls: 0,
        textModelCalls: 0,
      },
      expectedInventory: fixture.expectedInventory,
      preservedInventory: [],
      inventedMajorObjects: 0,
      architectureChanges: 0,
      timingMs,
      responseMetadata,
      reviewerNotes: "Fill preservedInventory after side-by-side visual review, then run --score.",
    },
    null,
    2
  )}\n`
);

console.log(
  JSON.stringify(
    {
      ...audit,
      dryRun: false,
      imageInvocationsMade: outboundOpenAIRequests,
      blockedAdditionalRequests,
      sdkMaxRetries: 0,
      timingMs,
      responseMetadata,
      timingNote:
        "submitToGenerationStart is measured to request-body completion; openAIGeneration is the remaining API time after upload.",
      outputPath,
      reviewPath,
    },
    null,
    2
  )
);
