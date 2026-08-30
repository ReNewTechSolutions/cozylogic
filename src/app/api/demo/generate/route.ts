// src/app/api/demo/generate/route.ts
import { createHash, randomUUID } from "crypto";
import { after, NextRequest, NextResponse } from "next/server";
import {
  BUDGET_LABELS,
  BUDGET_PROMPT_MEANINGS,
  STORAGE_BUCKET_INPUTS,
  STORAGE_BUCKET_OUTPUTS,
  BUDGET_TIERS,
  GOAL_LABELS,
  GOALS,
  ROOM_LABELS,
  ROOM_TYPES,
  STYLE_LABELS,
  STYLES,
} from "@/lib/cozylogic/constants";
import { verifyDemoUploadSession } from "@/lib/cozylogic/demoUploadSession";
import { flowErrorBody } from "@/lib/cozylogic/flowErrors";
import {
  getConfiguredImageGeneration,
  type ImageQuality,
  type ImageSize,
} from "@/lib/cozylogic/generationConfig";
import { buildFreeFixImagePrompt } from "@/lib/cozylogic/freeFixPrompt";
import { getImageEditInputFidelity } from "@/lib/cozylogic/imageEditPolicy";
import {
  getRequestId,
  logServerEvent,
  logServerFailure,
  safeErrorDetails,
} from "@/lib/cozylogic/serverLog";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  hasMatchingImageSignature,
  MAX_IMAGE_UPLOAD_BYTES,
  validateImageFileMetadata,
} from "@/lib/cozylogic/uploads";

type RoomType = (typeof ROOM_TYPES)[number];
type GoalKey = (typeof GOALS)[number];
type StyleKey = (typeof STYLES)[number];
type BudgetTier = (typeof BUDGET_TIERS)[number];
type ModeKey = "reality_lock" | "precision" | "creative";
const ACTIVE_OR_COMPLETED_TRIAL_STATUSES = ["queued", "generating", "generated"];

function logDemoGenerationTiming(
  event: string,
  startedAt: number,
  details: Record<string, unknown> = {}
) {
  logServerEvent("demo-generate", event, {
    elapsedMs: Date.now() - startedAt,
    ...details,
  });
}

function safeRoomType(value: string | null): RoomType {
  return ROOM_TYPES.includes(value as RoomType)
    ? (value as RoomType)
    : "living_room";
}

function safeGoal(value: string | null): GoalKey {
  return GOALS.includes(value as GoalKey) ? (value as GoalKey) : "modern";
}

function safeStyle(value: string | null): StyleKey {
  return STYLES.includes(value as StyleKey)
    ? (value as StyleKey)
    : "cozy_neutral";
}

function safeBudget(value: string | null): BudgetTier {
  return BUDGET_TIERS.includes(value as BudgetTier)
    ? (value as BudgetTier)
    : "under_500";
}

function safeMode(value: string | null): ModeKey {
  return value === "reality_lock" || value === "creative" ? value : "precision";
}

function safeStrength(value: string | null) {
  const parsed = Number(value ?? 60);
  if (Number.isNaN(parsed)) return 60;
  return Math.min(100, Math.max(0, Math.round(parsed)));
}

function friendlyLabel(labels: Partial<Record<string, string>>, value: string) {
  return labels[value] ?? value.replaceAll("_", " ");
}

function bufferToBlob(input: Buffer, mime: string, filename: string) {
  const ab = new ArrayBuffer(input.byteLength);
  new Uint8Array(ab).set(input);
  const blob = new Blob([ab], { type: mime }) as any;
  blob.name = filename;
  return blob;
}

function buildDemoIdempotencyKey(args: {
  uploadId: string;
  roomType: RoomType;
  goal: GoalKey;
  styleKey: StyleKey;
  budgetTier: BudgetTier;
  mode: ModeKey;
  strength: number;
}) {
  return createHash("sha256")
    .update(
      [
        "guest",
        args.uploadId,
        args.roomType,
        args.goal,
        args.styleKey,
        args.budgetTier,
        args.mode,
        String(args.strength),
      ].join("|")
    )
    .digest("hex");
}

function getTrialResponse(
  trial: { id: string; trial_token: string },
  reused = false,
  retried = false
) {
  return {
    ok: true,
    token: trial.trial_token,
    trialId: trial.id,
    generationId: trial.id,
    reused,
    retried,
    statusUrl: `/api/demo/${encodeURIComponent(trial.trial_token)}/status`,
    resultUrl: `/demo/result/${trial.trial_token}`,
  };
}

function buildDemoPrompt(args: {
  roomType: RoomType;
  goal: GoalKey;
  styleKey: StyleKey;
  budgetTier: BudgetTier;
  mode: ModeKey;
  strength: number;
}) {
  if (args.budgetTier === "rearrange_only") {
    return buildFreeFixImagePrompt({
      roomTypeLabel: friendlyLabel(ROOM_LABELS, args.roomType),
      styleLabel: friendlyLabel(STYLE_LABELS, args.styleKey),
    });
  }

  const modeInstruction =
    args.mode === "reality_lock"
      ? "Preserve the real room very tightly. Keep walls, windows, doors, flooring, perspective, and camera angle as close to the original as possible."
      : args.mode === "creative"
        ? "Allow visible style changes while preserving the original room structure, fixed elements, and camera angle."
        : "Create a realistic redesign with controlled, believable changes that still clearly matches the original room.";
  return [
    "You are redesigning a real interior photo.",
    `Room type: ${friendlyLabel(ROOM_LABELS, args.roomType)}.`,
    `Goal: ${friendlyLabel(GOAL_LABELS, args.goal)}.`,
    `Style: ${friendlyLabel(STYLE_LABELS, args.styleKey)}.`,
    `Budget: ${friendlyLabel(BUDGET_LABELS, args.budgetTier)}.`,
    `Budget meaning: ${friendlyLabel(BUDGET_PROMPT_MEANINGS, args.budgetTier)}.`,
    `Strength: ${args.strength}/100.`,
    modeInstruction,
    "Return exactly one realistic AFTER image of this same room.",
    "Do not return a collage, split screen, before-and-after composite, multiple views, text, labels, logos, or watermarks.",
    "Keep the image photorealistic.",
    "Preserve the architecture, walls, windows, doors, flooring, built-ins, and room dimensions.",
    "Keep the same camera angle, viewpoint, framing, lens perspective, and crop.",
    "If a TV is present, keep the same TV on the same wall and in the same location, orientation, and scale.",
    "Keep major furniture in place unless a small, realistic adjustment clearly improves function.",
    "Do not force major movement or invent a different room.",
    "Do not turn this into a fantasy render.",
    "Make only practical changes that fit the selected style and budget.",
  ].join(" ");
}

async function requestImageEdit(args: {
  apiKey: string;
  model: string;
  prompt: string;
  inputBytes: Buffer;
  fileType: string;
  fileExt: string;
  quality: ImageQuality;
  size: ImageSize;
  budgetTier: BudgetTier;
}) {
  const formData = new FormData();
  formData.append("model", args.model);
  formData.append("prompt", args.prompt);
  formData.append("size", args.size);
  formData.append("quality", args.quality);
  formData.append("n", "1");
  formData.append("output_format", "png");
  const inputFidelity = getImageEditInputFidelity(args.model, args.budgetTier);
  if (inputFidelity) formData.append("input_fidelity", inputFidelity);
  formData.append(
    "image",
    bufferToBlob(args.inputBytes, args.fileType, `input.${args.fileExt}`),
    `input.${args.fileExt}`
  );

  return fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
    },
    body: formData,
  });
}

async function updateTrial(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  trialId: string,
  patch: Record<string, unknown>
) {
  const { error } = await supabase.from("guest_trials").update(patch).eq("id", trialId);
  if (error) {
    logServerFailure("demo-generate", "trial_status_update", error, { trialId });
  }
}

async function processGuestTrial(args: {
  trialId: string;
  inputImagePath: string;
  inputBytes: Buffer;
  fileType: string;
  fileExt: string;
  roomType: RoomType;
  goal: GoalKey;
  styleKey: StyleKey;
  budgetTier: BudgetTier;
  mode: ModeKey;
  strength: number;
}) {
  const supabase = getSupabaseAdminClient();
  const startedAt = Date.now();

  await updateTrial(supabase, args.trialId, {
    status: "generating",
    generation_status: "preparing",
    generation_error: null,
  });

  const apiKey = process.env.OPENAI_API_KEY ?? "";
  if (!apiKey) {
    await updateTrial(supabase, args.trialId, {
      status: "failed",
      generation_status: "error",
      generation_error: "missing_openai_key",
    });
    logServerFailure("demo-generate", "openai_configuration", new Error("missing_openai_key"), {
      trialId: args.trialId,
      elapsedMs: Date.now() - startedAt,
    });
    return;
  }

  try {
    await updateTrial(supabase, args.trialId, {
      generation_status: "rendering",
    });

    const prompt = buildDemoPrompt({
      roomType: args.roomType,
      goal: args.goal,
      styleKey: args.styleKey,
      budgetTier: args.budgetTier,
      mode: args.mode,
      strength: args.strength,
    });

    const { model, quality, size } = getConfiguredImageGeneration({
      budgetTier: args.budgetTier,
      defaultQuality: "low",
      defaultSize: "auto",
    });

    logDemoGenerationTiming("OpenAI image call started", startedAt, {
      trialId: args.trialId,
      model,
      quality,
      size,
      passCount: 1,
    });

    let openAiRes: Response;
    let payload: any;
    try {
      openAiRes = await requestImageEdit({
        apiKey,
        model,
        prompt,
        inputBytes: args.inputBytes,
        fileType: args.fileType,
        fileExt: args.fileExt,
        quality,
        size,
        budgetTier: args.budgetTier,
      });
      payload = await openAiRes.json().catch(() => ({} as any));
      logDemoGenerationTiming("OpenAI image call finished", startedAt, {
        trialId: args.trialId,
        status: openAiRes.status,
        ok: openAiRes.ok,
      });
    } catch (error: any) {
      logDemoGenerationTiming("OpenAI image call finished", startedAt, {
        trialId: args.trialId,
        ok: false,
        error: safeErrorDetails(error),
      });
      throw error;
    }

    if (!openAiRes.ok) {
      await updateTrial(supabase, args.trialId, {
        status: "failed",
        generation_status: "error",
        generation_error: "openai_image_failed",
      });
      logServerFailure("demo-generate", "openai_call", {
        name: "OpenAIError",
        code: payload?.error?.code,
        status: openAiRes.status,
        type: payload?.error?.type,
      }, {
        trialId: args.trialId,
        elapsedMs: Date.now() - startedAt,
      });
      return;
    }

    const b64 = payload?.data?.[0]?.b64_json as string | undefined;
    if (!b64) {
      await updateTrial(supabase, args.trialId, {
        status: "failed",
        generation_status: "error",
        generation_error: "openai_image_failed",
      });
      logServerFailure("demo-generate", "openai_response", new Error("openai_no_image_returned"), {
        trialId: args.trialId,
        elapsedMs: Date.now() - startedAt,
      });
      return;
    }

    const outputImagePath = `guest/${args.trialId}/${randomUUID()}.png`;
    const outputBytes = Buffer.from(b64, "base64");

    logDemoGenerationTiming("Supabase upload started", startedAt, {
      trialId: args.trialId,
      outputImagePath,
    });
    const { error: outputUploadErr } = await supabase.storage
      .from(STORAGE_BUCKET_OUTPUTS)
      .upload(outputImagePath, outputBytes, {
        contentType: "image/png",
        upsert: false,
      });

    if (outputUploadErr) {
      await updateTrial(supabase, args.trialId, {
        status: "failed",
        generation_status: "error",
        generation_error: "output_upload_failed",
      });
      logServerFailure("demo-generate", "output_storage_upload", outputUploadErr, {
        trialId: args.trialId,
        elapsedMs: Date.now() - startedAt,
      });
      return;
    }
    logDemoGenerationTiming("Supabase upload finished", startedAt, {
      trialId: args.trialId,
      outputImagePath,
    });
    logDemoGenerationTiming("storage status", startedAt, {
      trialId: args.trialId,
      stage: "output_storage_upload",
      status: "succeeded",
    });

    await updateTrial(supabase, args.trialId, {
      output_image_path: outputImagePath,
      status: "generated",
      generation_status: "generated",
      generation_error: null,
    });
    logDemoGenerationTiming("final_success", startedAt, {
      trialId: args.trialId,
      finalStage: "generated",
    });
  } catch (error: any) {
    await updateTrial(supabase, args.trialId, {
      status: "failed",
      generation_status: "error",
      generation_error: "generation_failed",
    });
    logServerFailure("demo-generate", "generation_processing", error, {
      trialId: args.trialId,
      elapsedMs: Date.now() - startedAt,
    });
  }
}

export async function POST(req: NextRequest) {
  const requestStartedAt = Date.now();
  let requestId: string = randomUUID();
  logDemoGenerationTiming("request received", requestStartedAt, { requestId });

  try {
    let body: any;
    try {
      body = await req.json();
    } catch (error) {
      logServerFailure("demo-generate", "request_validation", error, {
        requestId,
        elapsedMs: Date.now() - requestStartedAt,
      });
      return NextResponse.json(flowErrorBody("invalid_json", "request_validation", requestId), {
        status: 400,
      });
    }

    requestId = getRequestId(body?.requestId);
    let uploadSession;
    try {
      uploadSession = verifyDemoUploadSession(body?.sessionToken);
      if (body?.uploadId !== uploadSession.uploadId) throw new Error("guest_session_invalid");
    } catch (error) {
      logServerFailure("demo-generate", "guest_session_validation", error, {
        requestId,
        elapsedMs: Date.now() - requestStartedAt,
      });
      return NextResponse.json(
        flowErrorBody("guest_session_invalid", "guest_session_validation", requestId),
        { status: 400 }
      );
    }

    const validation = validateImageFileMetadata({
      name: uploadSession.path,
      type: uploadSession.fileType,
      size: uploadSession.fileSize,
    });
    if (validation.ok === false) {
      logServerFailure("demo-generate", "file_validation", new Error(validation.code), {
        requestId,
        uploadId: uploadSession.uploadId,
      });
      return NextResponse.json(flowErrorBody(validation.code, "file_validation", requestId), {
        status: 400,
      });
    }

    const roomType = safeRoomType(String(body?.roomType || "living_room"));
    const goal = safeGoal(String(body?.goal || "modern"));
    const styleKey = safeStyle(String(body?.styleKey || "cozy_neutral"));
    const budgetTier = safeBudget(String(body?.budgetTier || "under_500"));
    const mode = safeMode(String(body?.mode || "precision"));
    const strength = safeStrength(String(body?.strength || "60"));

    const supabase = getSupabaseAdminClient();
    logDemoGenerationTiming("storage status", requestStartedAt, {
      requestId,
      uploadId: uploadSession.uploadId,
      stage: "input_download",
      status: "started",
    });
    const download = await supabase.storage
      .from(STORAGE_BUCKET_INPUTS)
      .download(uploadSession.path);
    if (download.error || !download.data) {
      logServerFailure("demo-generate", "input_storage_download", download.error, {
        requestId,
        uploadId: uploadSession.uploadId,
        elapsedMs: Date.now() - requestStartedAt,
      });
      return NextResponse.json(
        flowErrorBody("storage_upload_failed", "input_storage_download", requestId),
        { status: 500 }
      );
    }

    const inputBytes = Buffer.from(await download.data.arrayBuffer());
    if (
      inputBytes.byteLength <= 0 ||
      inputBytes.byteLength > MAX_IMAGE_UPLOAD_BYTES ||
      inputBytes.byteLength !== uploadSession.fileSize ||
      !hasMatchingImageSignature(inputBytes, validation.mimeType)
    ) {
      logServerFailure("demo-generate", "image_content_validation", new Error("invalid_image_content"), {
        requestId,
        uploadId: uploadSession.uploadId,
        inputBytes: inputBytes.byteLength,
      });
      return NextResponse.json(
        flowErrorBody("invalid_image_content", "image_content_validation", requestId),
        { status: 400 }
      );
    }
    logDemoGenerationTiming("storage status", requestStartedAt, {
      requestId,
      uploadId: uploadSession.uploadId,
      stage: "input_download",
      status: "succeeded",
    });
    logDemoGenerationTiming("image input prepared", requestStartedAt, {
      requestId,
      inputBytes: inputBytes.byteLength,
      fileType: validation.mimeType,
    });
    const idempotencyKey = buildDemoIdempotencyKey({
      uploadId: uploadSession.uploadId,
      roomType,
      goal,
      styleKey,
      budgetTier,
      mode,
      strength,
    });

    const { data: existingTrial, error: existingTrialError } = await supabase
      .from("guest_trials")
      .select("id,trial_token,status,generation_status,output_image_path")
      .eq("trial_token", idempotencyKey)
      .maybeSingle();

    if (existingTrialError) {
      logServerFailure("demo-generate", "generation_job_lookup", existingTrialError, {
        requestId,
        uploadId: uploadSession.uploadId,
      });
      return NextResponse.json(
        flowErrorBody("generation_job_creation_failed", "generation_job_lookup", requestId),
        { status: 500 }
      );
    }

    if (existingTrial && ACTIVE_OR_COMPLETED_TRIAL_STATUSES.includes(String(existingTrial.status))) {
      logDemoGenerationTiming("response returned", requestStartedAt, {
        requestId,
        trialId: existingTrial.id,
        status: 200,
        reused: true,
      });
      return NextResponse.json(getTrialResponse(existingTrial, true), { status: 200 });
    }

    const trialId = existingTrial?.id ?? randomUUID();
    const trialToken = existingTrial?.trial_token ?? idempotencyKey;
    const inputImagePath = uploadSession.path;
    logDemoGenerationTiming("generation job creation started", requestStartedAt, {
      requestId,
      trialId,
      retried: Boolean(existingTrial),
    });
    const trialPayload = {
      input_image_path: inputImagePath,
      room_type: roomType,
      goal,
      style_key: styleKey,
      budget_tier: budgetTier,
      mode,
      strength,
      status: "queued",
      generation_status: "queued",
      generation_error: null,
      output_image_path: null,
    };
    const jobWrite = existingTrial
      ? await supabase
          .from("guest_trials")
          .update(trialPayload)
          .eq("id", trialId)
          .in("status", ["draft", "failed", "error"])
          .select("id")
          .maybeSingle()
      : await supabase.from("guest_trials").insert({
          id: trialId,
          trial_token: trialToken,
          ...trialPayload,
        });
    const insertErr = jobWrite.error;

    if (insertErr) {
      const { data: insertedElsewhere } = await supabase
        .from("guest_trials")
        .select("id,trial_token,status,generation_status,output_image_path")
        .eq("trial_token", trialToken)
        .in("status", ACTIVE_OR_COMPLETED_TRIAL_STATUSES)
        .maybeSingle();

      if (insertedElsewhere) {
        logDemoGenerationTiming("response returned", requestStartedAt, {
          requestId,
          trialId: insertedElsewhere.id,
          status: 200,
          reused: true,
        });
        return NextResponse.json(getTrialResponse(insertedElsewhere, true), { status: 200 });
      }

      logServerFailure("demo-generate", "generation_job_creation", insertErr, {
        requestId,
        trialId,
        elapsedMs: Date.now() - requestStartedAt,
      });
      return NextResponse.json(
        flowErrorBody("generation_job_creation_failed", "generation_job_creation", requestId),
        { status: 500 }
      );
    }

    if (existingTrial && !jobWrite.data) {
      const { data: nowActive } = await supabase
        .from("guest_trials")
        .select("id,trial_token,status,generation_status,output_image_path")
        .eq("id", trialId)
        .maybeSingle();
      if (nowActive && ACTIVE_OR_COMPLETED_TRIAL_STATUSES.includes(String(nowActive.status))) {
        return NextResponse.json(getTrialResponse(nowActive, true), { status: 200 });
      }

      logServerFailure(
        "demo-generate",
        "generation_job_creation",
        new Error("generation_job_creation_failed"),
        { requestId, trialId }
      );
      return NextResponse.json(
        flowErrorBody("generation_job_creation_failed", "generation_job_creation", requestId),
        { status: 500 }
      );
    }

    logDemoGenerationTiming("generation job creation finished", requestStartedAt, {
      requestId,
      trialId,
      status: "queued",
      retried: Boolean(existingTrial),
    });

    after(async () => {
      await processGuestTrial({
        trialId,
        inputImagePath,
        inputBytes,
        fileType: validation.mimeType,
        fileExt: validation.extension,
        roomType,
        goal,
        styleKey,
        budgetTier,
        mode,
        strength,
      });
    });

    logDemoGenerationTiming("response returned", requestStartedAt, {
      requestId,
      trialId,
      status: 202,
      reused: false,
    });
    logDemoGenerationTiming("final_success", requestStartedAt, {
      requestId,
      trialId,
      finalStage: "job_queued",
    });
    return NextResponse.json(
      getTrialResponse({ id: trialId, trial_token: trialToken }, false, Boolean(existingTrial)),
      { status: 202 }
    );
  } catch (error) {
    logServerFailure("demo-generate", "generation_request", error, {
      requestId,
      elapsedMs: Date.now() - requestStartedAt,
    });
    return NextResponse.json(
      flowErrorBody("generation_request_failed", "generation_request", requestId),
      { status: 500 }
    );
  }
}
