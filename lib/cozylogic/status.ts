// 3) ✅ Step mapping helper (tidy → Pass 1 of 2, etc.)
// File: lib/cozylogic/status.ts

export type RoomGenStatus =
  | "queued"
  | "tidy"
  | "redesign"
  | "uploading"
  | "done"
  | "error"
  | null;

export function mapGenStatusToUI(s: RoomGenStatus) {
  switch (s) {
    case "queued":
      return { step: "Starting…", substep: "Preparing your request" };
    case "tidy":
      return { step: "Pass 1 of 2", substep: "Tidying + organizing (same room, same angle)" };
    case "redesign":
      return { step: "Pass 2 of 2", substep: "Reimagining your space with your chosen style" };
    case "uploading":
      return { step: "Finishing…", substep: "Saving your results" };
    case "done":
      return { step: "Done", substep: "Redirecting…" };
    case "error":
      return { step: "Something went wrong", substep: "Please try again" };
    default:
      return { step: "Generating…", substep: "Working on your redesign" };
  }
}