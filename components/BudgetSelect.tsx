// components/BudgetSelect.tsx
"use client";

import {
  BUDGET_CHOICES,
  BUDGET_HELPERS,
  BUDGET_LABELS,
  BUDGET_TIERS,
} from "@/lib/cozylogic/constants";

type BudgetTier = (typeof BUDGET_TIERS)[number];

export default function BudgetSelect({
  value,
  onChange,
}: {
  value: BudgetTier | null;
  onChange: (v: BudgetTier) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {BUDGET_CHOICES.map((key) => {
        const selected = value === key;
        const [title, detail] = BUDGET_LABELS[key].split(" — ");
        const isFreeFix = key === "rearrange_only";

        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={[
              "relative min-h-[132px] w-full rounded-lg border p-4 text-left shadow-sm transition-transform",
              "hover:-translate-y-[1px]",
              selected
                ? "border-[#6F8373] bg-[#FFF8EA] ring-2 ring-[#6F8373]/20"
                : "border-[#D8C7AE] bg-[#FFFDF7]",
            ].join(" ")}
          >
            <span
              aria-hidden="true"
              className="absolute -top-2 left-7 h-5 w-20 rotate-[-2deg] bg-[#E8D8BC]/80 shadow-sm"
            />
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-semibold text-[#1F1F1F]">{title}</div>
                {detail ? <div className="mt-1 text-sm text-[#6A5A49]">{detail}</div> : null}
              </div>
              {selected ? (
                <div className="rounded-lg border border-[#6F8373] bg-white px-2 py-0.5 text-[11px] font-semibold">
                  Picked
                </div>
              ) : (
                <div className="rounded-lg border border-[#D8C7AE] bg-[#F7EFE3] px-2 py-0.5 text-[11px] text-[#6A5A49]">
                  {isFreeFix ? "Start here" : "Tap"}
                </div>
              )}
            </div>
            <div className="mt-3 text-sm leading-6 text-[#6A5A49]">{BUDGET_HELPERS[key]}</div>
          </button>
        );
      })}
    </div>
  );
}
