// components/StyleTile.tsx
"use client";

import { STYLE_HELPERS, STYLE_LABELS, STYLE_SWATCHES, STYLES } from "@/lib/cozylogic/constants";

type StyleKey = (typeof STYLES)[number];

export default function StyleTile({
  styleKey,
  selected,
  onSelect,
}: {
  styleKey: StyleKey;
  selected: boolean;
  onSelect: () => void;
}) {
  const swatches = STYLE_SWATCHES[styleKey];

  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "group relative min-h-[218px] w-full rounded-lg border p-4 text-left shadow-sm transition-transform",
        "hover:-translate-y-[1px]",
        selected
          ? "border-[#6F8373] bg-[#FFF8EA] ring-2 ring-[#6F8373]/20"
          : "border-[#D8C7AE] bg-[#FFFDF7]",
      ].join(" ")}
    >
      <span
        aria-hidden="true"
        className="absolute -top-2 left-7 h-5 w-20 rotate-[-3deg] bg-[#E8D8BC]/80 shadow-sm"
      />
      <div className="rounded-lg border border-[#D8C7AE] bg-[#F7EFE3] p-3">
        <div className="flex h-20 items-end gap-2">
          {swatches.map((color, index) => (
            <div
              key={color}
              className="flex-1 rounded-lg border border-white/70 shadow-sm"
              style={{
                backgroundColor: color,
                height: `${index === 1 ? 100 : index === 2 ? 76 : 88}%`,
              }}
            />
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="text-base font-semibold text-[#1F1F1F]">{STYLE_LABELS[styleKey]}</div>
        {selected ? (
          <div className="rounded-lg border border-[#6F8373] bg-white px-2 py-0.5 text-[11px] font-semibold text-[#1F1F1F]">
            Picked
          </div>
        ) : (
          <div className="rounded-lg border border-[#D8C7AE] bg-[#F7EFE3] px-2 py-0.5 text-[11px] text-[#6A5A49] group-hover:text-[#1F1F1F]">
            Tap
          </div>
        )}
      </div>

      <div className="mt-2 text-sm leading-6 text-[#6A5A49]">{STYLE_HELPERS[styleKey]}</div>
    </button>
  );
}
