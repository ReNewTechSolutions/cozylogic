// components/GenerationOverlay.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FLOW_ERROR_MESSAGES } from "@/lib/cozylogic/flowErrors";

type Props = {
  roomId?: string;
  statusUrl?: string;
  redirectTo?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  retryHref?: string;
  retryLabel?: string;
};

type StatusResponse = {
  id?: string;
  status?: string | null;
  generation_status?: string | null;
  generation_error?: string | null;
  error?: string;
};

const STAGES = [
  { until: 25, label: "Studying your room", sublabel: "Reading the layout, lighting, and perspective." },
  { until: 50, label: "Keeping your layout realistic", sublabel: "Protecting the room shape and walkways." },
  { until: 75, label: "Testing cozy changes", sublabel: "Trying practical refresh ideas with your choices." },
  { until: 99, label: "Finalizing your preview", sublabel: "Preparing the finished room refresh." },
] as const;

function getStage(progress: number) {
  return STAGES.find((stage) => progress <= stage.until) ?? STAGES[STAGES.length - 1];
}

function friendlyGenerationError(message?: string | null) {
  if (!message) {
    return "We could not finish this preview. Your original photo and choices are safe.";
  }

  const cleaned = message.replaceAll("_", " ");
  if (FLOW_ERROR_MESSAGES[message]) {
    return FLOW_ERROR_MESSAGES[message];
  }
  if (cleaned.toLowerCase().includes("missing openai key")) {
    return "The image service is not configured right now. Please try again later.";
  }

  return "We could not finish this preview. Your original photo and choices are safe.";
}

export default function GenerationOverlay({
  roomId,
  statusUrl,
  redirectTo,
  onRetry,
  onDismiss,
  retryHref,
  retryLabel = "Try again",
}: Props) {
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
    if (!visible || finishedRef.current || error) return;

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
  }, [error, visible]);

  useEffect(() => {
    if (!visible || finishedRef.current || error || !pollUrl) return;

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
          setError(friendlyGenerationError(json?.error ?? "Unable to check generation status."));
          return;
        }

        const nextStatus = json.status ?? "";
        const nextStep = json.generation_status ?? "";
        const nextError = json.generation_error ?? null;

        setServerStatus(nextStatus);
        setServerStep(nextStep);

        if (nextError) {
          setError(friendlyGenerationError(nextError));
          return;
        }

        const isFailed =
          nextStatus === "error" ||
          nextStatus === "failed" ||
          nextStep === "error" ||
          nextStep === "failed";

        if (isFailed) {
          setError(friendlyGenerationError());
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
          setError("We could not reach the preview service. Check your connection and try again.");
        }
      }
    }

    void poll();
    const interval = window.setInterval(poll, 2500);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [error, pollUrl, redirectTo, router, visible]);

  if (!visible) return null;

  const hasError = Boolean(error);

  const handleRetry = () => {
    setVisible(false);
    if (onRetry) {
      onRetry();
    } else if (retryHref) {
      router.push(retryHref);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  const statusLine = error
    ? error
    : isRefreshing
      ? "Your preview is ready. Loading result…"
      : serverStep
        ? `Live status: ${serverStep.replaceAll("_", " ")}`
        : serverStatus
          ? `Live status: ${serverStatus.replaceAll("_", " ")}`
          : "Working on your room preview…";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1F1F1F]/35 px-4 backdrop-blur-sm">
      <div className="relative w-full max-w-[560px] rounded-lg border border-[#D8C7AE] bg-[#FFF8EA] p-5 shadow-2xl sm:p-7">
        <span
          aria-hidden="true"
          className="absolute -top-3 left-10 h-7 w-28 rotate-[-4deg] bg-[#E8D8BC]/90 shadow-sm"
        />
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex rounded-lg border border-[#DFC588] bg-[#F7E3A6] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5F4A2E]">
              room mission in progress
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-[#1F1F1F]">
              {hasError ? "This one got stuck" : isRefreshing ? "Finishing up…" : stage.label}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#6A5A49]">
              {hasError
                ? "No worries. You can try again without refreshing the page."
                : isRefreshing
                  ? "Pulling your final preview onto the page now."
                  : stage.sublabel}
            </p>
          </div>
          <div className="shrink-0 rotate-[2deg] rounded-lg border border-[#D8C7AE] bg-[#FFFDF7] px-3 py-1 text-sm font-medium text-[#1F1F1F]">
            {Math.min(100, Math.round(progress))}%
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-lg bg-[#E9DDCB]">
          <div
            className="h-3 rounded-lg bg-[#6F8373] transition-[width] duration-500 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>

        <div className="relative mt-4 rounded-lg border border-[#D8C7AE] bg-[#FFFDF7] px-4 py-3">
          <span
            aria-hidden="true"
            className="absolute -top-2 right-8 h-5 w-20 rotate-[3deg] bg-[#E8D8BC]/80 shadow-sm"
          />
          <div className="text-xs font-semibold uppercase tracking-wide text-[#7C6247]">
            Status
          </div>
          <div className={`mt-1 text-sm ${error ? "text-red-700" : "text-[#1F1F1F]"}`}>
            {statusLine}
          </div>
        </div>

        {hasError ? (
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            {onRetry || retryHref ? (
              <button
                type="button"
                onClick={handleRetry}
                className="min-h-[44px] rounded-lg bg-[#1F1F1F] px-4 py-2 text-sm font-semibold text-white"
              >
                {retryLabel}
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleDismiss}
              className="min-h-[44px] rounded-lg border border-[#D8C7AE] bg-[#FFFDF7] px-4 py-2 text-sm font-semibold text-[#1F1F1F]"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="mt-4 text-xs leading-5 text-[#6A5A49]">
            Room previews can take a bit. Please do not refresh or click preview again.
          </div>
        )}
      </div>
    </div>
  );
}
