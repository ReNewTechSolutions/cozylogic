// components/RecentDesignGrid.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { formatUtcDate } from "@/lib/cozylogic/dateFormat";
import { getSignedUrls } from "@/lib/cozylogic/images";
import {
  STORAGE_BUCKET_INPUTS,
  STORAGE_BUCKET_OUTPUTS,
  STYLE_LABELS,
  ROOM_LABELS,
  BUDGET_LABELS,
  STYLES,
  ROOM_TYPES,
  BUDGET_TIERS,
  GOALS,
} from "@/lib/cozylogic/constants";

type StyleKey = (typeof STYLES)[number];
type RoomType = (typeof ROOM_TYPES)[number];
type BudgetTier = (typeof BUDGET_TIERS)[number];
type GoalKey = (typeof GOALS)[number];

export type RecentCard = {
  generation_id: string;
  created_at: string;
  output_image_path: string;
  watermarked: boolean;
  room: {
    id: string;
    room_type: RoomType;
    goal: GoalKey;
    style_key: StyleKey;
    budget_tier: BudgetTier;
    input_image_path: string;
  };
};

export default function RecentDesignGrid({ items }: { items: RecentCard[] }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [beforeMap, setBeforeMap] = useState<Record<string, string>>({});
  const [afterMap, setAfterMap] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const nextBefore: Record<string, string> = {};
      const nextAfter: Record<string, string> = {};

      const [beforeByPath, afterByPath] = await Promise.all([
        getSignedUrls(
          supabase,
          STORAGE_BUCKET_INPUTS,
          items.map((item) => item.room.input_image_path)
        ).catch((error) => {
          console.error("RECENT before signed URLs failed", error);
          return {};
        }),
        getSignedUrls(
          supabase,
          STORAGE_BUCKET_OUTPUTS,
          items.map((item) => item.output_image_path)
        ).catch((error) => {
          console.error("RECENT after signed URLs failed", error);
          return {};
        }),
      ]);

      for (const item of items) {
        const before = beforeByPath[item.room.input_image_path];
        const after = afterByPath[item.output_image_path];
        if (before) nextBefore[item.generation_id] = before;
        if (after) nextAfter[item.generation_id] = after;
      }

      if (!cancelled) {
        setBeforeMap(nextBefore);
        setAfterMap(nextAfter);
      }
    }

    if (items.length) {
      void run();
    } else {
      setBeforeMap({});
      setAfterMap({});
    }

    return () => {
      cancelled = true;
    };
  }, [items, supabase]);

  return (
    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => {
        const before = beforeMap[item.generation_id];
        const after = afterMap[item.generation_id];

        return (
          <Link
            key={item.generation_id}
            href={`/app/result/${item.room.id}?source=saved`}
            className="group rounded-2xl border border-[#EAEAEA] bg-white p-4 shadow-sm transition-transform hover:-translate-y-[1px]"
          >
            <div className="grid grid-cols-2 gap-2">
              <div className="aspect-[4/3] overflow-hidden rounded-xl border border-[#EAEAEA] bg-[#FAF9F7]">
                {before ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={before}
                    alt="Before"
                    width={400}
                    height={300}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[11px] text-[#6A6A6A]">
                    Before
                  </div>
                )}
              </div>
              <div className="aspect-[4/3] overflow-hidden rounded-xl border border-[#EAEAEA] bg-[#FAF9F7]">
                {after ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={after}
                    alt="After"
                    width={400}
                    height={300}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[11px] text-[#6A6A6A]">
                    After
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <div className="text-sm font-medium">{ROOM_LABELS[item.room.room_type]}</div>
              <div className="text-[11px] text-[#6A6A6A]">
                {STYLE_LABELS[item.room.style_key]}
              </div>
            </div>

            <div className="mt-1 text-xs text-[#6A6A6A]">
              {BUDGET_LABELS[item.room.budget_tier]}
            </div>

            <div className="mt-2 flex items-center justify-between text-xs text-[#6A6A6A]">
              <time dateTime={item.created_at}>{formatUtcDate(item.created_at)}</time>
              {item.watermarked ? (
                <span className="rounded-full border border-[#EAEAEA] bg-[#FAF9F7] px-2 py-0.5 text-[11px]">
                  Free
                </span>
              ) : (
                <span className="rounded-full border border-[#6F8373] bg-[#FAF9F7] px-2 py-0.5 text-[11px] font-medium">
                  Pro
                </span>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
