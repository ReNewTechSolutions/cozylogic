// components/GenerationOverlay.tsx
"use client";

import { useRoomStatusPoll } from "@/hooks/useRoomStatusPoll";

function generationStepLabel(stepRaw: string | null | undefined) {
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

export default function GenerationOverlay({ roomId }: { roomId: string }) {
  const { data } = useRoomStatusPoll(roomId, true);

  const status = data?.status ?? "";
  const step = data?.generation_status ?? "";
  const err = data?.generation_error ?? "";

  const isWorking =
    status === "queued" ||
    status === "generating" ||
    (step && step !== "done" && step !== "generated" && step !== "error");

  if (!isWorking && !err) return null;

  const label = generationStepLabel(step);

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/50 backdrop-blur-sm">
      <div className="w-[min(520px,92vw)] rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#EAEAEA] border-t-[#1F1F1F]" />
          <div>
            <div className="text-base font-semibold">{label.title}</div>
            <div className="text-sm text-[#6A6A6A]">{label.sub}</div>
          </div>
        </div>

        {err ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        ) : (
          <div className="mt-4 text-xs text-[#6A6A6A]">
            This can take a minute. Please don’t refresh or click generate again.
          </div>
        )}
      </div>
    </div>
  );
}