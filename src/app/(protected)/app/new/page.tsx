// src/app/(protected)/app/new/page.tsx
"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import Stepper from "@/components/Stepper";
import UploadCard from "@/components/UploadCard";
import StyleTile from "@/components/StyleTile";
import BudgetSelect from "@/components/BudgetSelect";
import GenerationOverlay from "@/components/GenerationOverlay";
import { GOALS, ROOM_TYPES, STYLES, BUDGET_TIERS } from "@/lib/cozylogic/constants";

type StepKey = "upload" | "goal" | "style" | "mode" | "budget" | "review";
type ModeKey = "reality_lock" | "precision" | "creative";
type GenerationJob = {
  id: string;
  statusUrl: string;
  redirectTo: string;
};

const STEPS: { key: StepKey; label: string }[] = [
  { key: "upload", label: "Upload" },
  { key: "goal", label: "Goal" },
  { key: "style", label: "Style" },
  { key: "mode", label: "Mode" },
  { key: "budget", label: "Budget" },
  { key: "review", label: "Review" },
];

const DEFAULT_GOAL = "modern" as (typeof GOALS)[number];
const DEFAULT_STYLE = "cozy_neutral" as (typeof STYLES)[number];
const DEFAULT_BUDGET = "under_500" as (typeof BUDGET_TIERS)[number];
const DEFAULT_MODE: ModeKey = "precision";
const DEFAULT_STRENGTH = 60;

const PHOTO_TIPS = [
  "Bright, clear photo (daylight if possible).",
  "Whole room from one corner, camera level.",
  "Avoid filters + motion blur.",
];

const MODE_OPTIONS: {
  key: ModeKey;
  title: string;
  body: string;
}[] = [
  {
    key: "reality_lock",
    title: "Reality Lock™",
    body: "Keeps the room closest to the original structure, layout, and perspective.",
  },
  {
    key: "precision",
    title: "Precision",
    body: "Balanced redesigns that feel realistic while still giving the room a stronger upgrade.",
  },
  {
    key: "creative",
    title: "Creative",
    body: "Pushes the transformation further for bolder visual changes and more dramatic inspiration.",
  },
];

function getStrengthLabel(strength: number) {
  if (strength <= 25) return "Very subtle";
  if (strength <= 45) return "Subtle";
  if (strength <= 65) return "Balanced";
  if (strength <= 85) return "Bold";
  return "Very bold";
}

function getModeHelper(mode: ModeKey, strength: number) {
  const label = getStrengthLabel(strength);

  if (mode === "reality_lock") {
    return `${label} preservation — prioritize the existing room and keep changes tightly controlled.`;
  }

  if (mode === "creative") {
    return `${label} transformation — allow stronger visual redesign while still respecting the room photo.`;
  }

  return `${label} redesign — realistic changes with a controlled, polished upgrade.`;
}

export default function NewRedesignPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const draftRoomPromiseRef = useRef<Promise<string | null> | null>(null);
  const generateSubmitRef = useRef(false);

  const [step, setStep] = useState<StepKey>("upload");
  const stepIndex = STEPS.findIndex((s) => s.key === step);

  const [roomType, setRoomType] = useState<(typeof ROOM_TYPES)[number]>("living_room");
  const [goal, setGoal] = useState<(typeof GOALS)[number] | null>(null);
  const [styleKey, setStyleKey] = useState<(typeof STYLES)[number] | null>(null);
  const [budgetTier, setBudgetTier] = useState<(typeof BUDGET_TIERS)[number] | null>(null);
  const [mode, setMode] = useState<ModeKey>(DEFAULT_MODE);
  const [strength, setStrength] = useState<number>(DEFAULT_STRENGTH);

  const [inputImagePath, setInputImagePath] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generationJob, setGenerationJob] = useState<GenerationJob | null>(null);

  const canContinue =
    (step === "upload" && !!inputImagePath) ||
    (step === "goal" && !!goal) ||
    (step === "style" && !!styleKey) ||
    step === "mode" ||
    (step === "budget" && !!budgetTier) ||
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
      throw error;
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
          mode: DEFAULT_MODE,
          strength: DEFAULT_STRENGTH,
          generation_status: null,
          generation_error: null,
        };

        const { data, error: insertErr } = await supabase
          .from("rooms")
          .insert(payload)
          .select("id")
          .single();

        if (insertErr) throw insertErr;
        if (!data?.id) throw new Error("room_insert_missing_id");

        setRoomId(data.id);
        return data.id as string;
      } catch (e: any) {
        setError(e?.message ?? "Could not start redesign.");
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

    if (!goal || !styleKey || !budgetTier) {
      generateSubmitRef.current = false;
      setError("Please complete all steps before generating.");
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
        setError("Failed to create room. Please try again.");
        return;
      }

      setGenerationJob({
        id,
        statusUrl: `/api/generate/status?id=${encodeURIComponent(id)}`,
        redirectTo: `/app/result/${id}`,
      });

      await patchRoom(
        id,
        {
          room_type: roomType,
          goal,
          style_key: styleKey,
          budget_tier: budgetTier,
          mode,
          strength,
        },
        { silent: false }
      );

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: id }),
      });

      const json = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        setGenerationJob(null);
        setError((json as any)?.error ?? "Generation failed.");
        return;
      }

      const jobId = (json as any)?.generationId ?? id;
      const roomResultId = (json as any)?.roomId ?? id;
      setGenerationJob({
        id: jobId,
        statusUrl:
          (json as any)?.statusUrl ?? `/api/generate/status?id=${encodeURIComponent(jobId)}`,
        redirectTo: (json as any)?.resultUrl ?? `/app/result/${roomResultId}`,
      });
      shouldKeepWaiting = true;
    } catch (e: any) {
      setGenerationJob(null);
      setError(e?.message ?? "Generation failed.");
    } finally {
      if (!shouldKeepWaiting) {
        generateSubmitRef.current = false;
        setBusy(false);
      }
    }
  };

  return (
    <main className="min-h-screen bg-[#FAF9F7] text-[#1F1F1F]">
      {generationJob ? (
        <GenerationOverlay statusUrl={generationJob.statusUrl} redirectTo={generationJob.redirectTo} />
      ) : null}

      <div className="mx-auto w-full max-w-[900px] px-6 py-10">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="text-sm tracking-wide text-[#6A6A6A]">CozyLogic</div>
            <h1 className="mt-2 text-3xl font-semibold leading-tight">New redesign</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-[#6A6A6A]">
              Upload a photo, choose a style, dial the transformation, and generate.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/app")}
            className="rounded-xl border border-[#EAEAEA] bg-white px-4 py-2 text-sm font-medium shadow-sm"
          >
            Back to Dashboard
          </button>
        </div>

        <div className="mt-8 rounded-2xl border border-[#EAEAEA] bg-white p-6 shadow-sm">
          <Stepper steps={STEPS.map((s) => s.label)} activeIndex={stepIndex} />

          <div className="mt-6">
            {step === "upload" && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm text-[#6A6A6A]">Room type</label>
                    <select
                      className="mt-1 w-full rounded-xl border border-[#EAEAEA] bg-white px-4 py-3 text-[15px] outline-none focus:border-[#6F8373]"
                      value={roomType}
                      onChange={(e) => setRoomType(e.target.value as any)}
                    >
                      {ROOM_TYPES.map((rt) => (
                        <option key={rt} value={rt}>
                          {rt.replaceAll("_", " ")}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#EAEAEA] bg-[#FAF9F7] p-4">
                  <div className="text-sm font-medium">Photo tips</div>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#6A6A6A]">
                    {PHOTO_TIPS.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </div>

                <UploadCard value={inputImagePath} onChange={setInputImagePath} />
              </div>
            )}

            {step === "goal" && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {GOALS.map((g) => {
                  const selected = goal === g;
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGoal(g)}
                      className={[
                        "rounded-2xl border bg-white p-4 text-left shadow-sm transition-transform",
                        "hover:-translate-y-[1px]",
                        selected ? "border-[#6F8373]" : "border-[#EAEAEA]",
                      ].join(" ")}
                    >
                      <div className="text-sm font-medium">{g.replaceAll("_", " ")}</div>
                      <div className="mt-1 text-xs text-[#6A6A6A]">
                        {g === "cozier" && "Warmer, softer, more inviting."}
                        {g === "brighter" && "Lift the room with light tones and clarity."}
                        {g === "modern" && "Cleaner lines, simplified visual noise."}
                        {g === "bigger" && "Open up flow and reduce crowding."}
                        {g === "refresh_budget" && "Highest-impact refresh on a budget."}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {step === "style" && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {STYLES.map((s) => (
                  <StyleTile
                    key={s}
                    styleKey={s}
                    selected={styleKey === s}
                    onSelect={() => setStyleKey(s)}
                  />
                ))}
              </div>
            )}

            {step === "mode" && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {MODE_OPTIONS.map((item) => {
                    const selected = mode === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setMode(item.key)}
                        className={[
                          "rounded-2xl border bg-white p-4 text-left shadow-sm transition-transform",
                          "hover:-translate-y-[1px]",
                          selected
                            ? "border-[#6F8373] ring-1 ring-[#6F8373]/20"
                            : "border-[#EAEAEA]",
                        ].join(" ")}
                      >
                        <div className="text-sm font-semibold">{item.title}</div>
                        <div className="mt-2 text-sm leading-6 text-[#6A6A6A]">{item.body}</div>
                      </button>
                    );
                  })}
                </div>

                <div className="rounded-2xl border border-[#EAEAEA] bg-[#FAF9F7] p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium">Strength dial</div>
                      <div className="mt-1 text-xs text-[#6A6A6A]">
                        {getModeHelper(mode, strength)}
                      </div>
                    </div>
                    <div className="rounded-full border border-[#EAEAEA] bg-white px-3 py-1 text-sm font-medium">
                      {strength}
                    </div>
                  </div>

                  <div className="mt-5">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={strength}
                      onChange={(e) => setStrength(Number(e.target.value))}
                      className="w-full accent-[#6F8373]"
                    />
                    <div className="mt-2 flex items-center justify-between text-[11px] text-[#6A6A6A]">
                      <span>Subtle</span>
                      <span>Balanced</span>
                      <span>Bold</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === "budget" && <BudgetSelect value={budgetTier} onChange={setBudgetTier} />}

            {step === "review" && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-[#EAEAEA] bg-[#FAF9F7] p-5">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <div className="text-xs text-[#6A6A6A]">Room</div>
                      <div className="text-sm font-medium">{roomType.replaceAll("_", " ")}</div>
                    </div>
                    <div>
                      <div className="text-xs text-[#6A6A6A]">Goal</div>
                      <div className="text-sm font-medium">{goal?.replaceAll("_", " ")}</div>
                    </div>
                    <div>
                      <div className="text-xs text-[#6A6A6A]">Style</div>
                      <div className="text-sm font-medium">{styleKey?.replaceAll("_", " ")}</div>
                    </div>
                    <div>
                      <div className="text-xs text-[#6A6A6A]">Budget</div>
                      <div className="text-sm font-medium">{budgetTier?.replaceAll("_", " ")}</div>
                    </div>
                    <div>
                      <div className="text-xs text-[#6A6A6A]">Mode</div>
                      <div className="text-sm font-medium">
                        {MODE_OPTIONS.find((item) => item.key === mode)?.title}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-[#6A6A6A]">Strength</div>
                      <div className="text-sm font-medium">
                        {strength} • {getStrengthLabel(strength)}
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={busy || !!generationJob}
                  onClick={onGenerate}
                  className="w-full rounded-xl bg-[#6F8373] px-4 py-3 text-sm font-medium text-white shadow-sm disabled:opacity-60"
                >
                  {busy ? "Generating…" : "Generate redesign"}
                </button>
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
              disabled={busy || !!generationJob || stepIndex === 0}
              className="rounded-xl border border-[#EAEAEA] bg-white px-4 py-2 text-sm font-medium shadow-sm disabled:opacity-50"
            >
              Back
            </button>

            <button
              type="button"
              onClick={step === "review" ? onGenerate : goNext}
              disabled={busy || !!generationJob || !canContinue}
              className="rounded-xl bg-[#1F1F1F] px-4 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-50"
            >
              {step === "review" ? (busy ? "Generating…" : "Generate") : "Continue"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
