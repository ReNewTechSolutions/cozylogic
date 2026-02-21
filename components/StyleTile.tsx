// components/StyleTile.tsx
"use client";

import { STYLE_LABELS, STYLES } from "@/lib/cozylogic/constants";

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
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "group w-full rounded-2xl border bg-white p-4 text-left shadow-sm transition-transform",
        "hover:-translate-y-[1px]",
        selected ? "border-[#6F8373]" : "border-[#EAEAEA]",
      ].join(" ")}
    >
      <div className="aspect-[4/3] w-full rounded-xl border border-[#EAEAEA] bg-[#FAF9F7]">
        {/* Optional: later, replace this with a real thumbnail image */}
        <div className="flex h-full items-center justify-center text-xs text-[#6A6A6A]">
          {STYLE_LABELS[styleKey]}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="text-sm font-medium">{STYLE_LABELS[styleKey]}</div>
        {selected ? (
          <div className="rounded-full border border-[#6F8373] bg-[#FAF9F7] px-2 py-0.5 text-[11px] font-medium text-[#1F1F1F]">
            Selected
          </div>
        ) : (
          <div className="text-[11px] text-[#6A6A6A] group-hover:text-[#1F1F1F]">
            Select
          </div>
        )}
      </div>

      <div className="mt-1 text-xs text-[#6A6A6A]">
        {styleKey === "modern_minimal" && "Clean lines, fewer objects, calm space."}
        {styleKey === "cozy_neutral" && "Warm neutrals, soft textures, inviting feel."}
        {styleKey === "scandinavian" && "Light woods, airy balance, practical comfort."}
        {styleKey === "japandi" && "Minimal warmth with natural simplicity."}
        {styleKey === "soft_boho" && "Relaxed layers, organic accents, gentle color."}
        {styleKey === "clean_traditional" && "Classic comfort with a modern refresh."}
      </div>
    </button>
  );
}