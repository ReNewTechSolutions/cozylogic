const IMAGE_QUALITIES = new Set(["low", "medium", "high", "auto"]);
const IMAGE_SIZES = new Set(["1024x1024", "1536x1024", "1024x1536", "auto"]);

export type ImageQuality = "low" | "medium" | "high" | "auto";
export type ImageSize = "1024x1024" | "1536x1024" | "1024x1536" | "auto";

function cleanEnv(value: string | undefined) {
  return value?.trim() || "";
}

export function getConfiguredImageModel() {
  const model =
    cleanEnv(process.env.COZYLOGIC_IMAGE_MODEL) ||
    cleanEnv(process.env.OPENAI_IMAGE_MODEL) ||
    cleanEnv(process.env.COZYLOGIC_IMAGE_MODEL_FALLBACK);

  if (!model) {
    throw new Error("missing_image_model");
  }

  return model;
}

export function getConfiguredImageModelFallback(primaryModel = getConfiguredImageModel()) {
  const fallback = cleanEnv(process.env.COZYLOGIC_IMAGE_MODEL_FALLBACK);
  return fallback && fallback !== primaryModel ? fallback : null;
}

export function getConfiguredImageQuality(defaultQuality: ImageQuality = "low"): ImageQuality {
  const quality = cleanEnv(process.env.COZYLOGIC_IMAGE_QUALITY);
  if (!quality) return defaultQuality;
  if (IMAGE_QUALITIES.has(quality)) return quality as ImageQuality;

  console.warn("Invalid COZYLOGIC_IMAGE_QUALITY; using default.", {
    configured: quality,
    defaultQuality,
  });
  return defaultQuality;
}

export function getConfiguredImageSize(defaultSize: ImageSize = "1024x1024"): ImageSize {
  const size = cleanEnv(process.env.COZYLOGIC_IMAGE_SIZE);
  if (!size) return defaultSize;
  if (IMAGE_SIZES.has(size)) return size as ImageSize;

  console.warn("Invalid COZYLOGIC_IMAGE_SIZE; using default.", {
    configured: size,
    defaultSize,
  });
  return defaultSize;
}

export function getConfiguredTextModel() {
  return process.env.COZYLOGIC_TEXT_MODEL || "gpt-4.1-mini";
}
