// components/BeforeAfterSlider.tsx
"use client";

import { useMemo, useRef, useState } from "react";

export default function BeforeAfterSlider({
  beforeUrl,
  afterUrl,
  labelBefore = "Before",
  labelAfter = "After",
}: {
  beforeUrl: string;
  afterUrl: string;
  labelBefore?: string;
  labelAfter?: string;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [pct, setPct] = useState(50);

  const clipStyle = useMemo(
    () => ({
      clipPath: `inset(0 ${100 - pct}% 0 0)`,
    }),
    [pct]
  );

  const onMove = (clientX: number) => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
    const next = Math.round((x / rect.width) * 100);
    setPct(next);
  };

  return (
    <div className="rounded-2xl border border-[#EAEAEA] bg-white p-4 shadow-sm">
      <div
        ref={wrapRef}
        className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-[#EAEAEA] bg-[#FAF9F7]"
        onMouseMove={(e) => {
          if (e.buttons === 1) onMove(e.clientX);
        }}
        onTouchMove={(e) => onMove(e.touches[0].clientX)}
      >
        {/* After */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={afterUrl}
          alt={labelAfter}
          className="absolute inset-0 h-full w-full object-cover"
        />

        {/* Before (clipped) */}
        <div className="absolute inset-0" style={clipStyle}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={beforeUrl}
            alt={labelBefore}
            className="h-full w-full object-cover"
          />
        </div>

        {/* Divider */}
        <div
          className="absolute top-0 h-full w-[2px] bg-white shadow"
          style={{ left: `${pct}%` }}
        />

        {/* Handle */}
        <div
          className="absolute top-1/2 -translate-y-1/2 rounded-full border border-[#EAEAEA] bg-white px-3 py-2 text-xs font-medium shadow-sm"
          style={{ left: `calc(${pct}% - 22px)` }}
        >
          ⇆
        </div>

        {/* Labels */}
        <div className="absolute left-3 top-3 rounded-full border border-[#EAEAEA] bg-white/90 px-2 py-1 text-[11px]">
          {labelBefore}
        </div>
        <div className="absolute right-3 top-3 rounded-full border border-[#EAEAEA] bg-white/90 px-2 py-1 text-[11px]">
          {labelAfter}
        </div>

        {/* Range input for accessibility */}
        <input
          aria-label="Before and after slider"
          type="range"
          min={0}
          max={100}
          value={pct}
          onChange={(e) => setPct(parseInt(e.target.value, 10))}
          className="absolute bottom-3 left-1/2 w-[80%] -translate-x-1/2"
        />
      </div>
    </div>
  );
}