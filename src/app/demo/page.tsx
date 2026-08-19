"use client";

import { useRef, useState } from "react";
import {
  BUDGET_PREVIEW_SETTINGS,
  BUDGET_TIERS,
  DEFAULT_BUDGET_TIER,
  GOALS,
  ROOM_LABELS,
  ROOM_TYPES,
  STYLE_CHOICES,
  STYLES,
} from "@/lib/cozylogic/constants";
import BudgetSelect from "@/components/BudgetSelect";
import GenerationOverlay from "@/components/GenerationOverlay";
import StyleTile from "@/components/StyleTile";

type DemoGenerationJob = {
  statusUrl?: string;
  redirectTo?: string;
};

const DEFAULT_GOAL = "refresh_budget" as (typeof GOALS)[number];

export default function DemoPage() {
  const submitRef = useRef(false);

  const [file, setFile] = useState<File | null>(null);
  const [roomType, setRoomType] = useState<(typeof ROOM_TYPES)[number]>("living_room");
  const [styleKey, setStyleKey] = useState<(typeof STYLES)[number]>("cozy_neutral");
  const [budgetTier, setBudgetTier] = useState<(typeof BUDGET_TIERS)[number]>(DEFAULT_BUDGET_TIER);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generationJob, setGenerationJob] = useState<DemoGenerationJob | null>(null);
  const previewPlan = BUDGET_PREVIEW_SETTINGS[budgetTier];

  const resetFailedGeneration = () => {
    submitRef.current = false;
    setGenerationJob(null);
    setBusy(false);
    setError("That free preview did not finish. You can try again or tweak one choice.");
  };

  const onSubmit = async () => {
    if (submitRef.current) return;

    submitRef.current = true;
    setError(null);

    if (!file) {
      submitRef.current = false;
      setError("Please upload a photo first.");
      return;
    }

    setBusy(true);
    setGenerationJob({});
    let shouldKeepWaiting = false;

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("roomType", roomType);
      form.append("goal", DEFAULT_GOAL);
      form.append("styleKey", styleKey);
      form.append("budgetTier", budgetTier);
      form.append("mode", previewPlan.mode);
      form.append("strength", String(previewPlan.strength));

      const res = await fetch("/api/demo/generate", {
        method: "POST",
        body: form,
      });

      const json = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        throw new Error(json?.error || "Failed to start preview.");
      }

      const token = json.token;

      if (!token) {
        throw new Error("Missing demo token.");
      }

      setGenerationJob({
        statusUrl: json.statusUrl ?? `/api/demo/${encodeURIComponent(token)}/status`,
        redirectTo: json.resultUrl ?? `/demo/result/${token}`,
      });
      shouldKeepWaiting = true;
    } catch (e: any) {
      setGenerationJob(null);
      setError(e?.message ?? "Failed to start preview.");
    } finally {
      if (!shouldKeepWaiting) {
        submitRef.current = false;
        setBusy(false);
      }
    }
  };

  return (
    <main className="min-h-screen bg-[#F7EFE3] text-[#1F1F1F]">
      {generationJob ? (
        <GenerationOverlay
          statusUrl={generationJob.statusUrl}
          redirectTo={generationJob.redirectTo}
          onRetry={resetFailedGeneration}
          onDismiss={resetFailedGeneration}
          retryLabel="Try free preview again"
        />
      ) : null}

      <div className="mx-auto max-w-[980px] px-5 py-8 sm:px-6 sm:py-12">
        <div>
          <div className="inline-flex rotate-[-1deg] rounded-lg border border-[#DFC588] bg-[#F7E3A6] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5F4A2E] shadow-sm">
            CozyLogic room mission
          </div>
          <h1 className="mt-2 text-3xl font-semibold leading-tight">Try a free room preview</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6A5A49]">
            Pick your room, choose your vibe and budget, then preview the refresh before moving a thing.
          </p>
        </div>

        <div className="relative mt-8 rounded-lg border border-[#D8C7AE] bg-[#FFF8EA] p-5 shadow-[0_22px_60px_rgba(68,52,37,0.12)] sm:p-6">
          <span aria-hidden="true" className="absolute -top-3 left-8 h-7 w-28 rotate-[-4deg] bg-[#E8D8BC]/90 shadow-sm" />
          <div className="space-y-5 rounded-lg border border-[#D8C7AE] bg-[#FFFDF7] p-4">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-[#6A6A6A]">
              1. Pick your room
            </div>
            <label className="relative mt-3 block rounded-lg border border-dashed border-[#C9B696] bg-[#F7EFE3] p-5">
              <span aria-hidden="true" className="absolute -top-2 left-7 h-5 w-20 rotate-[3deg] bg-[#E8D8BC]/80 shadow-sm" />
              <span className="text-base font-semibold text-[#1F1F1F]">Drop in the room you want to test</span>
              <span className="mt-1 block text-sm leading-6 text-[#6A5A49]">
                One clear JPG, PNG, or WebP is perfect. A full-room photo works best.
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="mt-4 block w-full rounded-lg border border-[#D8C7AE] bg-[#FFFDF7] px-4 py-3 text-sm"
              />
            </label>

            <div className="mt-3 flex flex-wrap gap-2">
              {ROOM_TYPES.map((item) => {
                const selected = roomType === item;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setRoomType(item)}
                    className={[
                      "min-h-[48px] rounded-lg border px-4 py-2 text-sm font-medium shadow-sm",
                      selected
                        ? "border-[#6F8373] bg-[#FFF8EA] text-[#1F1F1F] ring-2 ring-[#6F8373]/15"
                        : "border-[#D8C7AE] bg-[#FFFDF7] text-[#6A5A49]",
                    ].join(" ")}
                  >
                    {ROOM_LABELS[item]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-7">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-[#6A6A6A]">
              2. Choose your vibe
            </div>
            <p className="mt-2 text-sm leading-6 text-[#6A5A49]">
              Pick the look you want to test. CozyLogic keeps the room practical either way.
            </p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {STYLE_CHOICES.map((item) => (
                <StyleTile
                  key={item}
                  styleKey={item}
                  selected={styleKey === item}
                  onSelect={() => setStyleKey(item)}
                />
              ))}
            </div>
          </div>

          <div className="mt-7">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-[#6A6A6A]">
              3. Choose your budget
            </div>
            <p className="mt-2 text-sm leading-6 text-[#6A5A49]">
              Free Fix is the best first stop. Add small upgrades only if you want them.
            </p>
            <div className="mt-3">
              <BudgetSelect value={budgetTier} onChange={setBudgetTier} />
            </div>
          </div>

          <div className="mt-7">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-[#6A6A6A]">
              4. Preview the refresh
            </div>
            <div className="relative mt-3 rounded-lg border border-[#D8C7AE] bg-[#FFFDF7] p-4 shadow-sm">
              <span aria-hidden="true" className="absolute -top-2 left-7 h-5 w-20 rotate-[-3deg] bg-[#E8D8BC]/80 shadow-sm" />
              <div className="text-base font-semibold text-[#1F1F1F]">{previewPlan.planLabel}</div>
              <div className="mt-2 text-sm leading-6 text-[#6A5A49]">
                {previewPlan.planDescription}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onSubmit}
            disabled={busy || !!generationJob}
            className="mt-7 min-h-[52px] w-full rounded-lg bg-[#6F8373] px-4 py-3 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
          >
            {busy ? "Starting your preview…" : "Preview my free room refresh"}
          </button>

          {error && <div className="mt-4 text-sm text-red-600">{error}</div>}
        </div>
      </div>
    </main>
  );
}
