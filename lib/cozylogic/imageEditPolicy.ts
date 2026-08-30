export type ImageEditInputFidelity = "high" | "low";

export function getImageEditInputFidelity(
  model: string,
  budgetTier: string
): ImageEditInputFidelity | undefined {
  const normalized = model.trim().toLowerCase();

  // GPT Image 2 processes image inputs at high fidelity automatically. The
  // documented request shape is to omit input_fidelity for that model.
  if (normalized === "gpt-image-2" || normalized.startsWith("gpt-image-2-")) {
    return undefined;
  }

  // The mini model does not support input_fidelity.
  if (normalized === "gpt-image-1-mini") return undefined;

  if (normalized === "gpt-image-1" || normalized.startsWith("gpt-image-1.5")) {
    return budgetTier === "rearrange_only" ? "high" : "low";
  }

  return undefined;
}
