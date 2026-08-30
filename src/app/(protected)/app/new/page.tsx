// src/app/(protected)/app/new/page.tsx
"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import Stepper from "@/components/Stepper";
import UploadCard from "@/components/UploadCard";
import StyleTile from "@/components/StyleTile";
import BudgetSelect from "@/components/BudgetSelect";
import { readFriendlyApiError } from "@/lib/cozylogic/flowErrors";
import {
  BUDGET_LABELS,
  BUDGET_PREVIEW_SETTINGS,
  BUDGET_TIERS,
  DEFAULT_BUDGET_TIER,
  GOALS,
  ROOM_HELPERS,
  ROOM_LABELS,
  ROOM_TYPES,
  STYLE_CHOICES,
  STYLES,
  STYLE_LABELS,
} from "@/lib/cozylogic/constants";

type StepKey = "upload" | "style" | "budget" | "review";

const STEPS: { key: StepKey; label: string }[] = [
  { key: "upload", label: "Room" },
  { key: "style", label: "Vibe" },
  { key: "budget", label: "Budget" },
  { key: "review", label: "Preview" },
];

const DEFAULT_GOAL = "refresh_budget" as (typeof GOALS)[number];
const DEFAULT_STYLE = "cozy_neutral" as (typeof STYLES)[number];
const DEFAULT_BUDGET = DEFAULT_BUDGET_TIER;
const DEFAULT_PREVIEW_PLAN = BUDGET_PREVIEW_SETTINGS[DEFAULT_BUDGET];

const PHOTO_TIPS = [
  "Use a bright photo if you can.",
  "Stand back enough to show the whole room.",
  "Skip filters so the preview has a clean starting point.",
];

const STEP_COPY: Record<StepKey, { title: string; body: string }> = {
  upload: {
    title: "Pick your room",
    body: "Choose the room type, upload one clear photo, and we will read the space from there.",
  },
  style: {
    title: "Choose your vibe",
    body: "Tap the look you want to test. CozyLogic keeps the room practical either way.",
  },
  budget: {
    title: "Choose your budget",
    body: "Start with what you own, then add small upgrades only if they fit.",
  },
  review: {
    title: "Preview the refresh",
    body: "Give everything one last peek, then we will test the room refresh and send you to the result.",
  },
};

export default function NewRedesignPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const draftRoomPromiseRef = useRef<Promise<string | null> | null>(null);
  const generateSubmitRef = useRef(false);

  const [step, setStep] = useState<StepKey>("upload");
  const stepIndex = STEPS.findIndex((s) => s.key === step);

  const [roomType, setRoomType] = useState<(typeof ROOM_TYPES)[number]>("living_room");
  const [styleKey, setStyleKey] = useState<(typeof STYLES)[number] | null>(DEFAULT_STYLE);
  const [budgetTier, setBudgetTier] = useState<(typeof BUDGET_TIERS)[number]>(DEFAULT_BUDGET);

  const [inputImagePath, setInputImagePath] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeStepCopy = STEP_COPY[step];
  const previewPlan = BUDGET_PREVIEW_SETTINGS[budgetTier];

  const canContinue =
    (step === "upload" && !!inputImagePath) ||
    (step === "style" && !!styleKey) ||
    step === "budget" ||
    step === "review";

  async function requireUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!data.user) {
      router.replace("/login?next=/app/new");
      return null;
    }
    return data.user;
  }

  async function patchRoom(
    id: string,
    patch: Record<string, any>,
    opts?: { silent?: boolean }
  ) {
    const { error } = await supabase.from("rooms").update(patch).eq("id", id);

    if (error && !opts?.silent) {
      throw new Error("We could not save your room choices. Please try again.");
    }
  }

  async function ensureDraftRoom() {
    if (!inputImagePath) return null;
    if (roomId) return roomId;

    if (draftRoomPromiseRef.current) {
      return draftRoomPromiseRef.current;
    }

    const promise = (async () => {
      setBusy(true);
      setError(null);

      try {
        const user = await requireUser();
        if (!user) return null;

        const payload = {
          user_id: user.id,
          room_type: roomType,
          input_image_path: inputImagePath,
          status: "draft",
          goal: DEFAULT_GOAL,
          style_key: DEFAULT_STYLE,
          budget_tier: DEFAULT_BUDGET,
          mode: DEFAULT_PREVIEW_PLAN.mode,
          strength: DEFAULT_PREVIEW_PLAN.strength,
          generation_status: null,
          generation_error: null,
        };

        const { data, error: insertErr } = await supabase
          .from("rooms")
          .insert(payload)
          .select("id")
          .single();

        if (insertErr || !data?.id) throw new Error("room_create_failed");

        setRoomId(data.id);
        return data.id as string;
      } catch (e: any) {
        setError(
          e?.message === "room_create_failed"
            ? "Your photo uploaded, but we could not create the room preview. Please try again."
            : "We could not verify your sign-in or create the room preview. Please try again."
        );
        return null;
      } finally {
        draftRoomPromiseRef.current = null;
        setBusy(false);
      }
    })();

    draftRoomPromiseRef.current = promise;
    return promise;
  }

  const goNext = async () => {
    setError(null);

    if (step === "upload") {
      const id = await ensureDraftRoom();
      if (!id) {
        setError((prev) => prev ?? "Please upload a room photo to continue.");
        return;
      }
    }

    const next = STEPS[Math.min(stepIndex + 1, STEPS.length - 1)].key;
    setStep(next);
  };

  const goBack = () => {
    setError(null);
    const prev = STEPS[Math.max(stepIndex - 1, 0)].key;
    setStep(prev);
  };

  const onGenerate = async () => {
    if (generateSubmitRef.current) return;

    generateSubmitRef.current = true;
    setError(null);

    if (!inputImagePath) {
      generateSubmitRef.current = false;
      setError("Please upload a photo first.");
      return;
    }

    if (!styleKey) {
      generateSubmitRef.current = false;
      setError("Please complete all steps before previewing.");
      return;
    }

    setBusy(true);
    let shouldKeepWaiting = false;

    try {
      let id = roomId;

      if (!id) {
        id = await ensureDraftRoom();
      }

      if (!id) {
        generateSubmitRef.current = false;
        setError("Could not set up this room preview. Please try again.");
        return;
      }

      await patchRoom(
        id,
        {
          room_type: roomType,
          goal: DEFAULT_GOAL,
          style_key: styleKey,
          budget_tier: budgetTier,
          mode: previewPlan.mode,
          strength: previewPlan.strength,
        },
        { silent: false }
      );

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: id, requestId: crypto.randomUUID() }),
      });

      const json = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        draftRoomPromiseRef.current = null;
        const retryableWithExistingDraft = [
          "auth",
          "request_validation",
          "room_lookup",
          "authorization",
          "generation_job_creation",
          "generation_request",
        ].includes(String((json as any)?.stage ?? ""));
        if (!retryableWithExistingDraft) setRoomId(null);
        setError(
          readFriendlyApiError(
            json,
            "Your photo uploaded, but we could not start the generation job. Please try again."
          )
        );
        return;
      }

      const roomResultId = (json as any)?.roomId ?? id;
      const resultUrl = (json as any)?.resultUrl ?? `/app/result/${roomResultId}`;
      shouldKeepWaiting = true;
      router.replace(resultUrl);
    } catch (e: any) {
      draftRoomPromiseRef.current = null;
      setError(e?.message ?? "We could not start the room preview. Please try again.");
    } finally {
      if (!shouldKeepWaiting) {
        generateSubmitRef.current = false;
        setBusy(false);
      }
    }
  };

  return (
    <main className="min-h-screen bg-[#F7EFE3] text-[#1F1F1F]">
      <div className="mx-auto w-full max-w-[900px] px-6 py-10">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="inline-flex rotate-[-1deg] rounded-lg border border-[#DFC588] bg-[#F7E3A6] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5F4A2E] shadow-sm">
              CozyLogic room mission
            </div>
            <h1 className="mt-2 text-3xl font-semibold leading-tight">Preview your room refresh</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-[#6A5A49]">
              Before you move all your furniture around, try the idea in CozyLogic first.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/app")}
            className="rounded-lg border border-[#D8C7AE] bg-[#FFFDF7] px-4 py-2 text-sm font-medium shadow-sm"
          >
            Back to Dashboard
          </button>
        </div>

        <div className="relative mt-8 rounded-lg border border-[#D8C7AE] bg-[#FFF8EA] p-5 shadow-[0_22px_60px_rgba(68,52,37,0.12)] sm:p-6">
          <span aria-hidden="true" className="absolute -top-3 left-8 h-7 w-28 rotate-[-4deg] bg-[#E8D8BC]/90 shadow-sm" />
          <Stepper steps={STEPS.map((s) => s.label)} activeIndex={stepIndex} />

          <div className="mt-6 rounded-lg border border-[#D8C7AE] bg-[#FFFDF7] p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7C6247]">
              Step {stepIndex + 1} of {STEPS.length}
            </div>
            <h2 className="mt-2 text-2xl font-semibold leading-tight text-[#1F1F1F]">
              {activeStepCopy.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#6A5A49]">{activeStepCopy.body}</p>
          </div>

          <div className="mt-6">
            {step === "upload" && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {ROOM_TYPES.map((rt) => {
                    const selected = roomType === rt;
                    return (
                      <button
                        key={rt}
                        type="button"
                        onClick={() => setRoomType(rt)}
                        className={[
                          "relative min-h-[128px] rounded-lg border p-4 text-left shadow-sm transition-transform",
                          "hover:-translate-y-[1px]",
                          selected
                            ? "border-[#6F8373] bg-[#FFF8EA] ring-2 ring-[#6F8373]/20"
                            : "border-[#D8C7AE] bg-[#FFFDF7]",
                        ].join(" ")}
                      >
                        <span aria-hidden="true" className="absolute -top-2 left-7 h-5 w-20 rotate-[-3deg] bg-[#E8D8BC]/80 shadow-sm" />
                        <div className="flex items-start justify-between gap-3">
                          <div className="text-base font-semibold">{ROOM_LABELS[rt]}</div>
                          <div className="rounded-lg border border-[#D8C7AE] bg-[#F7EFE3] px-2 py-0.5 text-[11px] text-[#6A5A49]">
                            {selected ? "Picked" : "Tap"}
                          </div>
                        </div>
                        <div className="mt-3 text-sm leading-6 text-[#6A5A49]">
                          {ROOM_HELPERS[rt]}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="rounded-lg border border-[#D8C7AE] bg-[#FFFDF7] p-4">
                  <div className="text-sm font-medium">Tiny photo checklist</div>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#6A5A49]">
                    {PHOTO_TIPS.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </div>

                <UploadCard value={inputImagePath} onChange={setInputImagePath} />
              </div>
            )}

            {step === "style" && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {STYLE_CHOICES.map((s) => (
                  <StyleTile
                    key={s}
                    styleKey={s}
                    selected={styleKey === s}
                    onSelect={() => setStyleKey(s)}
                  />
                ))}
              </div>
            )}

            {step === "budget" && <BudgetSelect value={budgetTier} onChange={setBudgetTier} />}

            {step === "review" && (
              <div className="space-y-5">
                <div className="relative rounded-lg border border-[#D8C7AE] bg-[#FFFDF7] p-5">
                  <span aria-hidden="true" className="absolute -top-2 left-7 h-5 w-20 rotate-[3deg] bg-[#E8D8BC]/80 shadow-sm" />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <div className="text-xs uppercase tracking-[0.16em] text-[#7C6247]">Room</div>
                      <div className="text-sm font-medium">{ROOM_LABELS[roomType]}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-[0.16em] text-[#7C6247]">Vibe</div>
                      <div className="text-sm font-medium">
                        {styleKey ? STYLE_LABELS[styleKey] : ""}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-[0.16em] text-[#7C6247]">Budget</div>
                      <div className="text-sm font-medium">
                        {budgetTier ? BUDGET_LABELS[budgetTier] : ""}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-[0.16em] text-[#7C6247]">Refresh plan</div>
                      <div className="text-sm font-medium">{previewPlan.planLabel}</div>
                      <div className="mt-1 text-xs leading-5 text-[#6A5A49]">
                        {previewPlan.planDescription}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              onClick={goBack}
              disabled={busy || stepIndex === 0}
              className="min-h-[48px] rounded-lg border border-[#D8C7AE] bg-[#FFFDF7] px-5 py-3 text-sm font-medium shadow-sm disabled:opacity-50"
            >
              Back
            </button>

            <button
              type="button"
              onClick={step === "review" ? onGenerate : goNext}
              disabled={busy || !canContinue}
              className="min-h-[48px] rounded-lg bg-[#1F1F1F] px-5 py-3 text-sm font-medium text-white shadow-sm disabled:opacity-50"
            >
              {step === "review" ? (busy ? "Starting preview…" : "Preview the refresh") : "Next step"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
