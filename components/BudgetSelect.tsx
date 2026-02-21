// components/BudgetSelect.tsx
"use client";

import { BUDGET_LABELS, BUDGET_TIERS } from "@/lib/cozylogic/constants";

type BudgetTier = (typeof BUDGET_TIERS)[number];

export default function BudgetSelect({
  value,
  onChange,
}: {
  value: BudgetTier | null;
  onChange: (v: BudgetTier) => void;
}) {
  const options: { key: BudgetTier; helper: string }[] = [
    {
      key: "rearrange_only",
      helper: "No spending — focus on layout and what you already own.",
    },
    {
      key: "under_500",
      helper: "High-impact swaps (rug, pillows, lighting, decor).",
    },
    {
      key: "500_1500",
      helper: "A few key upgrades (accent chair, rug, storage, lighting).",
    },
    {
      key: "1500_3000",
      helper: "Bigger refresh (sofa/bed upgrades + supporting pieces).",
    },
    {
      key: "3000_plus",
      helper: "Full refresh with premium options and flexibility.",
    },
  ];

  return (
    <div className="space-y-3">
      {options.map((opt) => {
        const selected = value === opt.key;

        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            className={[
              "w-full rounded-2xl border bg-white p-4 text-left shadow-sm transition-transform",
              "hover:-translate-y-[1px]",
              selected ? "border-[#6F8373]" : "border-[#EAEAEA]",
            ].join(" ")}
          >
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">{BUDGET_LABELS[opt.key]}</div>
              {selected ? (
                <div className="rounded-full border border-[#6F8373] bg-[#FAF9F7] px-2 py-0.5 text-[11px] font-medium">
                  Selected
                </div>
              ) : (
                <div className="text-[11px] text-[#6A6A6A]">Select</div>
              )}
            </div>
            <div className="mt-1 text-xs text-[#6A6A6A]">{opt.helper}</div>
          </button>
        );
      })}
    </div>
  );
}