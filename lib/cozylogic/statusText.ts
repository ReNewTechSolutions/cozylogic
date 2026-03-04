// lib/cozylogic/statusText.ts
export type GenerationStepLabel = { title: string; sub: string };

export function generationStepLabel(stepRaw: string | null | undefined): GenerationStepLabel {
  const step = String(stepRaw ?? "").trim().toLowerCase();

  if (!step) return { title: "Working…", sub: "This can take a minute." };

  switch (step) {
    case "queued":
      return { title: "Starting…", sub: "Getting everything ready." };

    case "tidy":
    case "tidying":
      return { title: "Pass 1 of 2", sub: "Tidying and organizing the room." };

    case "rearrange":
    case "rearranging":
      return { title: "Pass 2 of 2", sub: "Rearranging your existing furniture." };

    case "redesign":
    case "redesigning":
      return { title: "Pass 2 of 2", sub: "Redesigning with your chosen style." };

    case "uploading":
      return { title: "Finishing…", sub: "Saving your new design." };

    case "done":
    case "generated":
      return { title: "Done", sub: "Your design is ready." };

    case "error":
      return { title: "Something went wrong", sub: "Please try again." };

    default:
      return { title: "Working…", sub: "This can take a minute." };
  }
}