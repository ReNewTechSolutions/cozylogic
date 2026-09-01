export type ImageTokenUsage = {
  inputTokens: number;
  inputImageTokens: number;
  inputTextTokens: number;
  outputTokens: number;
  totalTokens: number;
};

type ImageTokenRates = {
  textInput: number;
  imageInput: number;
  imageOutput: number;
};

const PER_MILLION_TOKEN_RATES: Record<string, ImageTokenRates> = {
  "gpt-image-2": { textInput: 5, imageInput: 8, imageOutput: 30 },
  "gpt-image-1.5": { textInput: 5, imageInput: 8, imageOutput: 32 },
  "chatgpt-image-latest": { textInput: 5, imageInput: 8, imageOutput: 32 },
  "gpt-image-1-mini": { textInput: 2, imageInput: 2.5, imageOutput: 8 },
  "gpt-image-1": { textInput: 5, imageInput: 10, imageOutput: 40 },
};

function safeTokenCount(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.round(value)
    : 0;
}

export function normalizeImageTokenUsage(value: unknown): ImageTokenUsage | null {
  if (!value || typeof value !== "object") return null;

  const usage = value as {
    input_tokens?: unknown;
    output_tokens?: unknown;
    total_tokens?: unknown;
    input_tokens_details?: {
      image_tokens?: unknown;
      text_tokens?: unknown;
    };
  };
  const inputTokens = safeTokenCount(usage.input_tokens);
  const inputImageTokens = safeTokenCount(usage.input_tokens_details?.image_tokens);
  const explicitTextTokens = safeTokenCount(usage.input_tokens_details?.text_tokens);
  const inputTextTokens = explicitTextTokens || Math.max(0, inputTokens - inputImageTokens);
  const outputTokens = safeTokenCount(usage.output_tokens);
  const totalTokens = safeTokenCount(usage.total_tokens) || inputTokens + outputTokens;

  if (inputTokens === 0 && outputTokens === 0 && totalTokens === 0) return null;

  return {
    inputTokens,
    inputImageTokens,
    inputTextTokens,
    outputTokens,
    totalTokens,
  };
}

function getRates(model: string) {
  if (model.startsWith("gpt-image-2")) return PER_MILLION_TOKEN_RATES["gpt-image-2"];
  return PER_MILLION_TOKEN_RATES[model] ?? null;
}

export function estimateImageCostUsd(model: string, usage: ImageTokenUsage | null) {
  const rates = getRates(model);
  if (!rates || !usage) return null;

  const cost =
    (usage.inputTextTokens * rates.textInput +
      usage.inputImageTokens * rates.imageInput +
      usage.outputTokens * rates.imageOutput) /
    1_000_000;

  return Number(cost.toFixed(6));
}
