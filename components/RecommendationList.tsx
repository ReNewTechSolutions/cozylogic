// components/RecommendationList.tsx
"use client";

export type RecommendationItem = {
  title: string;
  subtitle?: string;
  priceHint?: string; // e.g. "$120–$180" or "Under $50"
  whyItWorks?: string;
};

export default function RecommendationList({
  items,
}: {
  items: RecommendationItem[];
}) {
  if (!items.length) return null;

  return (
    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((r, idx) => (
        <div
          key={idx}
          className="rounded-2xl border border-[#EAEAEA] bg-[#FAF9F7] p-4"
        >
          <div className="text-sm font-semibold">{r.title}</div>
          {r.subtitle ? (
            <div className="mt-1 text-xs text-[#6A6A6A]">{r.subtitle}</div>
          ) : null}

          {r.priceHint ? (
            <div className="mt-3 inline-flex rounded-full border border-[#EAEAEA] bg-white px-2 py-1 text-[11px] text-[#6A6A6A]">
              {r.priceHint}
            </div>
          ) : null}

          {r.whyItWorks ? (
            <div className="mt-3 text-xs leading-relaxed text-[#6A6A6A]">
              {r.whyItWorks}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}