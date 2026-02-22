// lib/cozylogic/statusText.ts
export function generationStepLabel(stepRaw: string | null | undefined) {
  const step = String(stepRaw ?? "").toLowerCase();

  switch (step) {
    case "queued":
      return { title: "Starting…", sub: "Preparing your room photo." };
    case "tidy":
      return { title: "Pass 1 of 2", sub: "Tidying and organizing the room." };
    case "rearrange":
      return { title: "Pass 2 of 2", sub: "Rearranging your existing furniture." };
    case "redesign":
      return { title: "Pass 2 of 2", sub: "Designing the new layout and style." };
    case "uploading":
      return { title: "Finalizing…", sub: "Saving your new design." };
    case "done":
    case "generated":
      return { title: "Done", sub: "Your design is ready." };
    case "error":
      return { title: "Something went wrong", sub: "Please try again." };
    default:
      return { title: "Working…", sub: "This can take a minute." };
  }
}