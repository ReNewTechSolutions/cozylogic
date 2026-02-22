// app/(protected)/app/new/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import Stepper from "@/components/Stepper";
import UploadCard from "@/components/UploadCard";
import StyleTile from "@/components/StyleTile";
import BudgetSelect from "@/components/BudgetSelect";
import { GOALS, ROOM_TYPES, STYLES, BUDGET_TIERS } from "@/lib/cozylogic/constants";

type StepKey = "upload" | "goal" | "style" | "budget" | "review";

const STEPS: { key: StepKey; label: string }[] = [
  { key: "upload", label: "Upload" },
  { key: "goal", label: "Goal" },
  { key: "style", label: "Style" },
  { key: "budget", label: "Budget" },
  { key: "review", label: "Review" },
];

// Safe defaults to satisfy NOT NULL constraints at draft creation time
const DEFAULT_GOAL = "modern" as (typeof GOALS)[number];
const DEFAULT_STYLE = "cozy_neutral" as (typeof STYLES)[number];
const DEFAULT_BUDGET = "under_500" as (typeof BUDGET_TIERS)[number];

const PHOTO_TIPS = [
  "Use a clear, well-lit photo (daylight or bright room light). Avoid heavy shadows.",
  "Hold still and keep it sharp (no motion blur). Don’t use video screenshots.",
  "Capture the whole room from one corner/doorway so walls + furniture are visible.",
  "Keep the camera level (straight horizon). Avoid extreme wide-angle/“0.5x” if possible.",
  "Don’t use filters (no heavy HDR/beauty/color grading). Normal photo is best.",
  "Messy is OK—just make sure the clutter is visible (we’ll tidy realistically).",
];

export default function NewRedesignPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  // Steps
  const [step, setStep] = useState<StepKey>("upload");
  const stepIndex = useMemo(() => STEPS.findIndex((s) => s.key === step), [step]);

  // Core selections
  const [roomType, setRoomType] = useState<(typeof ROOM_TYPES)[number]>("living_room");
  const [goal, setGoal] = useState<(typeof GOALS)[number] | null>(null);
  const [styleKey, setStyleKey] = useState<(typeof STYLES)[number] | null>(null);
  const [budgetTier, setBudgetTier] = useState<(typeof BUDGET_TIERS)[number] | null>(null);

  // Upload state
  const [inputImagePath, setInputImagePath] = useState<string | null>(null);

  // DB room row
  const [roomId, setRoomId] = useState<string | null>(null);

  // UX state
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canContinue =
    (step === "upload" && !!inputImagePath) ||
    (step === "goal" && !!goal) ||
    (step === "style" && !!styleKey) ||
    (step === "budget" && !!budgetTier) ||
    step === "review";

  async function requireUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;

    if (!data.user) {
      router.replace("/login");
      return null;
    }

    return data.user;
  }

  const persistRoomPatch = async (patch: Record<string, any>) => {
    if (!roomId) return;
    try {
      await supabase.from("rooms").update(patch).eq("id", roomId);
    } catch {
      // non-fatal
    }
  };

  const ensureDraftRoom = async () => {
    if (!inputImagePath) return null;
    if (roomId) return roomId;

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
        // safe defaults (avoid NOT NULL failures)
        goal: DEFAULT_GOAL,
        style_key: DEFAULT_STYLE,
        budget_tier: DEFAULT_BUDGET,
      };

      const { data, error: insertErr } = await supabase
        .from("rooms")
        .insert(payload)
        .select("id")
        .single();

      if (insertErr) throw insertErr;

      setRoomId(data.id);
      return data.id as string;
    } catch (e: any) {
      setError(e?.message ?? "Could not start redesign.");
      return null;
    } finally {
      setBusy(false);
    }
  };

  // Persist selections as they change (updates only; draft is created when leaving upload)
  useEffect(() => {
    if (!roomId) return;

    const patch: Record<string, any> = { room_type: roomType };
    if (goal) patch.goal = goal;
    if (styleKey) patch.style_key = styleKey;
    if (budgetTier) patch.budget_tier = budgetTier;

    void persistRoomPatch(patch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, roomType, goal, styleKey, budgetTier]);

  const goNext = async () => {
    setError(null);

    if (step === "upload") {
      const id = await ensureDraftRoom();
      if (!id) return;
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
    setError(null);
  
    if (!inputImagePath) {
      setError("Please upload a photo first.");
      return;
    }
    if (!goal || !styleKey || !budgetTier) {
      setError("Please complete all steps before generating.");
      return;
    }
  
    setBusy(true);
    try {
      // ✅ Always ensure we have a room id (covers refresh/state loss)
      let id = roomId;
      if (!id) {
        id = await ensureDraftRoom();
        if (!id) {
          setError("Could not initialize room.");
          return;
        }
      }
  
      // ✅ Save latest selections + mark generating for spam guard + status polling UI
      await supabase.from("rooms").update({
        room_type: roomType,
        goal,
        style_key: styleKey,
        budget_tier: budgetTier,
        status: "generating",
        generation_status: "queued",
        generation_error: null,
      }).eq("id", id);
  
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: id }),
      });
  
      // ✅ spam guard: already generating → go to progress screen
      if (res.status === 409) {
        router.replace(`/app/result/${id}`);
        router.refresh();
        return;
      }
  
      const json = await res.json().catch(() => ({}));
  
      if (!res.ok) {
        setError(json?.error ?? "Generation failed.");
        return;
      }
  
      router.replace(`/app/result/${id}`);
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? "Generation failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FAF9F7] text-[#1F1F1F]">
      <div className="mx-auto w-full max-w-[900px] px-6 py-10">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="text-sm tracking-wide text-[#6A6A6A]">CozyLogic</div>
            <h1 className="mt-2 text-3xl font-semibold leading-tight">New redesign</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-[#6A6A6A]">
              Upload a photo, choose a style and budget, then generate.
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
                  <div className="text-sm font-medium">Photo tips for best results</div>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#6A6A6A]">
                    {PHOTO_TIPS.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                  <div className="mt-2 text-xs text-[#6A6A6A]">
                    Best results come from a bright, sharp, wide view of the room with the camera held level.
                  </div>
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
                  </div>
                </div>

                <button
                  type="button"
                  disabled={busy}
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
              disabled={busy || stepIndex === 0}
              className="rounded-xl border border-[#EAEAEA] bg-white px-4 py-2 text-sm font-medium shadow-sm disabled:opacity-50"
            >
              Back
            </button>

            <button
              type="button"
              onClick={step === "review" ? onGenerate : goNext}
              disabled={busy || !canContinue}
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