// components/GenerationOverlay.tsx
"use client";

import { generationStepLabel } from "@/lib/cozylogic/statusText";
import { useRoomStatusPoll } from "@/hooks/useRoomStatusPoll";

const DEBUG = process.env.NEXT_PUBLIC_DEBUG_STATUS === "1";

export default function GenerationOverlay({ roomId }: { roomId: string }) {
  const { data, error } = useRoomStatusPoll(roomId, true);

  const status = data?.status ?? "";
  const step = data?.generation_status ?? "";
  const err = data?.generation_error ?? "";
  const pollErr = error ?? "";

  const isWorking =
    status === "queued" ||
    status === "generating" ||
    (step && step !== "done" && step !== "generated" && step !== "error");

  // show overlay if working OR if server returned an error string (generation_error) OR polling failed
  if (!isWorking && !err && !pollErr) return null;

  if (DEBUG) {
    // eslint-disable-next-line no-console
    console.log("[Overlay]", { roomId, status, step, err, pollErr });
  }

  const label = generationStepLabel(err ? "error" : step);

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

        {(err || pollErr) ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err || pollErr}
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