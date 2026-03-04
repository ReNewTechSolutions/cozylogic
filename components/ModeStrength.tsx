"use client";

type Mode = "precision" | "creative";

function strengthLabel(strength: number) {
  if (strength <= 30) return "Rearrange only";
  if (strength <= 70) return "Balanced redesign";
  return "Dramatic redesign";
}

export default function ModeStrength({
  mode,
  strength,
  onChange,
}: {
  mode: Mode;
  strength: number;
  onChange: (next: { mode: Mode; strength: number }) => void;
}) {
  return (
    <div className="rounded-2xl border border-[#EAEAEA] bg-[#FAF9F7] p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-medium">Mode</div>
          <div className="mt-1 text-xs text-[#6A6A6A]">
            Precision preserves architecture + camera angle. Creative allows more variation.
          </div>
        </div>
        <div className="flex rounded-xl border border-[#EAEAEA] bg-white p-1">
          <button
            type="button"
            onClick={() => onChange({ mode: "precision", strength })}
            className={[
              "rounded-lg px-3 py-1.5 text-sm",
              mode === "precision" ? "bg-[#1F1F1F] text-white" : "text-[#1F1F1F]",
            ].join(" ")}
          >
            Precision
          </button>
          <button
            type="button"
            onClick={() => onChange({ mode: "creative", strength })}
            className={[
              "rounded-lg px-3 py-1.5 text-sm",
              mode === "creative" ? "bg-[#1F1F1F] text-white" : "text-[#1F1F1F]",
            ].join(" ")}
          >
            Creative
          </button>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">Strength</div>
          <div className="text-xs text-[#6A6A6A]">{strengthLabel(strength)}</div>
        </div>

        <input
          type="range"
          min={0}
          max={100}
          value={strength}
          onChange={(e) => onChange({ mode, strength: Number(e.target.value) })}
          className="mt-2 w-full"
        />

        <div className="mt-1 flex justify-between text-[11px] text-[#6A6A6A]">
          <span>Subtle</span>
          <span>Balanced</span>
          <span>Bold</span>
        </div>
      </div>

      <div className="mt-3 text-xs text-[#6A6A6A]">
        Tip: For strict “same room, just improved,” keep Strength ≤ 30.
      </div>
    </div>
  );
}