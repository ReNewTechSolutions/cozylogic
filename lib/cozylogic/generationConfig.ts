export function getConfiguredImageModel() {
  const model =
    process.env.COZYLOGIC_IMAGE_MODEL ||
    process.env.COZYLOGIC_IMAGE_MODEL_FALLBACK ||
    process.env.OPENAI_IMAGE_MODEL;

  if (!model) {
    throw new Error("missing_image_model");
  }

  return model;
}

export function getConfiguredTextModel() {
  return process.env.COZYLOGIC_TEXT_MODEL || "gpt-4.1-mini";
}
