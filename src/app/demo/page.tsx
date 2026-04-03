"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  GOALS,
  ROOM_TYPES,
  STYLES,
  BUDGET_TIERS,
} from "@/lib/cozylogic/constants";

type ModeKey = "reality_lock" | "precision" | "creative";

const MODE_OPTIONS: { key: ModeKey; title: string; body: string }[] = [
  {
    key: "reality_lock",
    title: "Reality Lock™",
    body: "Keeps the room closest to the original structure and perspective.",
  },
  {
    key: "precision",
    title: "Precision",
    body: "Balanced redesigns with realistic, controlled visual change.",
  },
  {
    key: "creative",
    title: "Creative",
    body: "Allows a stronger transformation for bolder inspiration.",
  },
];

function getStrengthLabel(strength: number) {
  if (strength <= 25) return "Very subtle";
  if (strength <= 45) return "Subtle";
  if (strength <= 65) return "Balanced";
  if (strength <= 85) return "Bold";
  return "Very bold";
}

export default function DemoPage() {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [roomType, setRoomType] = useState<(typeof ROOM_TYPES)[number]>("living_room");
  const [goal, setGoal] = useState<(typeof GOALS)[number]>("modern");
  const [styleKey, setStyleKey] = useState<(typeof STYLES)[number]>("cozy_neutral");
  const [budgetTier, setBudgetTier] = useState<(typeof BUDGET_TIERS)[number]>("under_500");
  const [mode, setMode] = useState<ModeKey>("precision");
  const [strength, setStrength] = useState(60);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);

    if (!file) {
      setError("Please upload a photo first.");
      return;
    }

    setBusy(true);

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("roomType", roomType);
      form.append("goal", goal);
      form.append("styleKey", styleKey);
      form.append("budgetTier", budgetTier);
      form.append("mode", mode);
      form.append("strength", String(strength));

      const res = await fetch("/api/demo/generate", {
        method: "POST",
        body: form,
      });

      const json = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        throw new Error(json?.error || "Failed to generate.");
      }

      const token = json.token;

      if (!token) {
        throw new Error("Missing demo token.");
      }

      router.push(`/demo/result/${token}`);
    } catch (e: any) {
      setError(e?.message ?? "Failed to generate.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FAF9F7] text-[#1F1F1F]">
      <div className="mx-auto max-w-[920px] px-6 py-12">
        <div>
          <div className="text-sm tracking-wide text-[#6A6A6A]">CozyLogic Demo</div>
          <h1 className="mt-2 text-3xl font-semibold">Try your first redesign free</h1>
          <p className="mt-2 text-sm text-[#6A6A6A]">
            Upload a photo, choose a direction, and generate one free redesign with no signup required.
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-[#EAEAEA] bg-white p-6 shadow-sm">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="text-sm text-[#6A6A6A]">Room type</label>
              <select
                value={roomType}
                onChange={(e) => setRoomType(e.target.value as (typeof ROOM_TYPES)[number])}
                className="mt-1 w-full rounded-xl border border-[#EAEAEA] bg-white px-4 py-3 text-[15px] outline-none focus:border-[#6F8373]"
              >
                {ROOM_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {item.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-[#6A6A6A]">Goal</label>
              <select
                value={goal}
                onChange={(e) => setGoal(e.target.value as (typeof GOALS)[number])}
                className="mt-1 w-full rounded-xl border border-[#EAEAEA] bg-white px-4 py-3 text-[15px] outline-none focus:border-[#6F8373]"
              >
                {GOALS.map((item) => (
                  <option key={item} value={item}>
                    {item.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-[#6A6A6A]">Style</label>
              <select
                value={styleKey}
                onChange={(e) => setStyleKey(e.target.value as (typeof STYLES)[number])}
                className="mt-1 w-full rounded-xl border border-[#EAEAEA] bg-white px-4 py-3 text-[15px] outline-none focus:border-[#6F8373]"
              >
                {STYLES.map((item) => (
                  <option key={item} value={item}>
                    {item.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-[#6A6A6A]">Budget</label>
              <select
                value={budgetTier}
                onChange={(e) => setBudgetTier(e.target.value as (typeof BUDGET_TIERS)[number])}
                className="mt-1 w-full rounded-xl border border-[#EAEAEA] bg-white px-4 py-3 text-[15px] outline-none focus:border-[#6F8373]"
              >
                {BUDGET_TIERS.map((item) => (
                  <option key={item} value={item}>
                    {item.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6">
            <div className="text-sm font-medium">Mode</div>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
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
                      selected ? "border-[#6F8373] ring-1 ring-[#6F8373]/20" : "border-[#EAEAEA]",
                    ].join(" ")}
                  >
                    <div className="text-sm font-semibold">{item.title}</div>
                    <div className="mt-2 text-sm leading-6 text-[#6A6A6A]">{item.body}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-[#EAEAEA] bg-[#FAF9F7] p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium">Strength dial</div>
                <div className="mt-1 text-xs text-[#6A6A6A]">
                  {getStrengthLabel(strength)}
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

          <div className="mt-6">
            <label className="text-sm text-[#6A6A6A]">Room photo</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-2 block w-full rounded-xl border border-[#EAEAEA] bg-white px-4 py-3 text-sm"
            />
          </div>

          <button
            type="button"
            onClick={onSubmit}
            disabled={busy}
            className="mt-6 w-full rounded-xl bg-[#6F8373] px-4 py-3 text-white disabled:opacity-60"
          >
            {busy ? "Starting your redesign…" : "Generate free redesign"}
          </button>

          {error && <div className="mt-4 text-sm text-red-600">{error}</div>}
        </div>
      </div>
    </main>
  );
}