// components/GenerationOverlay.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  roomId?: string;
  statusUrl?: string;
  redirectTo?: string;
};

type StatusResponse = {
  id?: string;
  status?: string | null;
  generation_status?: string | null;
  generation_error?: string | null;
  updated_at?: string | null;
  error?: string;
};

const STAGES = [
  { until: 25, label: "Analyzing your room photo", sublabel: "Reading the layout, lighting, and perspective." },
  { until: 50, label: "Matching your cozy style", sublabel: "Blending your selections into the room." },
  { until: 75, label: "Building your new look", sublabel: "Creating the redesigned image." },
  { until: 99, label: "Finalizing image", sublabel: "Preparing the finished result." },
] as const;

function getStage(progress: number) {
  return STAGES.find((stage) => progress <= stage.until) ?? STAGES[STAGES.length - 1];
}

export default function GenerationOverlay({ roomId, statusUrl, redirectTo }: Props) {
  const router = useRouter();
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(7);
  const [serverStatus, setServerStatus] = useState<string>("queued");
  const [serverStep, setServerStep] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const finishedRef = useRef(false);

  const stage = useMemo(() => getStage(progress), [progress]);
  const pollUrl = statusUrl ?? (roomId ? `/api/rooms/${roomId}/status` : null);

  useEffect(() => {
    if (!visible || finishedRef.current) return;

    const timer = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 96) return current;
        if (current < 20) return current + 3;
        if (current < 45) return current + 2;
        if (current < 75) return current + 1;
        return current + 0.5;
      });
    }, 900);

    return () => window.clearInterval(timer);
  }, [visible]);

  useEffect(() => {
    if (!visible || finishedRef.current || !pollUrl) return;

    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(pollUrl, {
          method: "GET",
          cache: "no-store",
        });

        const json: StatusResponse = await res.json().catch(() => ({}));

        if (cancelled) return;

        if (!res.ok) {
          setError(json?.error ?? "Unable to check generation status.");
          return;
        }

        const nextStatus = json.status ?? "";
        const nextStep = json.generation_status ?? "";
        const nextError = json.generation_error ?? null;

        setServerStatus(nextStatus);
        setServerStep(nextStep);

        if (nextError) {
          setError(nextError);
          return;
        }

        const isDone =
          nextStatus === "generated" ||
          nextStep === "generated" ||
          nextStep === "done";

        if (isDone) {
          finishedRef.current = true;
          setProgress(100);
          setIsRefreshing(true);

          window.setTimeout(() => {
            setVisible(false);
            if (redirectTo) {
              router.replace(redirectTo);
            } else {
              router.refresh();
            }
          }, 700);
        }
      } catch {
        if (!cancelled) {
          setError("Unable to reach the generation service.");
        }
      }
    }

    void poll();
    const interval = window.setInterval(poll, 2500);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [pollUrl, redirectTo, router, visible]);

  if (!visible) return null;

  const statusLine = error
    ? error
    : isRefreshing
      ? "Your redesign is ready. Loading result…"
      : serverStep
        ? `Live status: ${serverStep.replaceAll("_", " ")}`
        : serverStatus
          ? `Live status: ${serverStatus.replaceAll("_", " ")}`
          : "Working on your redesign…";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 px-4 backdrop-blur-sm">
      <div className="w-full max-w-[560px] rounded-[28px] border border-white/20 bg-white p-6 shadow-2xl sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.2em] text-[#6A6A6A]">
              CozyLogic is working
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-[#1F1F1F]">
              {isRefreshing ? "Finishing up…" : stage.label}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#6A6A6A]">
              {isRefreshing ? "Pulling your final redesign onto the page now." : stage.sublabel}
            </p>
          </div>
          <div className="shrink-0 rounded-full border border-[#EAEAEA] bg-[#FAF9F7] px-3 py-1 text-sm font-medium text-[#1F1F1F]">
            {Math.min(100, Math.round(progress))}%
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-full bg-[#ECE9E4]">
          <div
            className="h-3 rounded-full bg-[#6F8373] transition-[width] duration-500 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>

        <div className="mt-4 rounded-2xl border border-[#EAEAEA] bg-[#FAF9F7] px-4 py-3">
          <div className="text-xs font-medium uppercase tracking-wide text-[#6A6A6A]">
            Status
          </div>
          <div className={`mt-1 text-sm ${error ? "text-red-700" : "text-[#1F1F1F]"}`}>
            {statusLine}
          </div>
        </div>

        <div className="mt-4 text-xs leading-5 text-[#6A6A6A]">
          Image generation can take a bit. Please do not refresh or click generate again.
        </div>
      </div>
    </div>
  );
}
