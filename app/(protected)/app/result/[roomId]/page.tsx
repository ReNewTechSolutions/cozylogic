// app/(protected)/app/result/[roomId]/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import ResultImages from "@/components/ResultImages";
import RecommendationList, { type RecommendationItem } from "@/components/RecommendationList";
import {
  BUDGET_LABELS,
  GOAL_LABELS,
  ROOM_LABELS,
  STYLE_LABELS,
  STYLES,
  GOALS,
  ROOM_TYPES,
  BUDGET_TIERS,
} from "@/lib/cozylogic/constants";

type StyleKey = (typeof STYLES)[number];
type GoalKey = (typeof GOALS)[number];
type RoomType = (typeof ROOM_TYPES)[number];
type BudgetTier = (typeof BUDGET_TIERS)[number];

function getPlaceholderRecs(budget: BudgetTier): RecommendationItem[] {
  if (budget === "rearrange_only") {
    return [
      {
        title: "Declutter zones",
        subtitle: "Remove 10–20% of visible items",
        whyItWorks: "Visual space instantly makes the room feel calmer and larger.",
      },
      {
        title: "Anchor the layout",
        subtitle: "Center seating around a focal point",
        whyItWorks: "A clear focal point improves flow and makes the room feel intentional.",
      },
      {
        title: "Lighting layers",
        subtitle: "Use what you have: lamp + overhead + window",
        whyItWorks: "Layered light creates cozy depth without buying anything.",
      },
    ];
  }

  if (budget === "under_500") {
    return [
      { title: "Textured rug", subtitle: "Neutral, low pile", priceHint: "Under $200", whyItWorks: "Defines the space and softens the room instantly." },
      { title: "Warm table lamp", subtitle: "2700K bulb", priceHint: "Under $60", whyItWorks: "Adds a cozy glow that makes everything feel more premium." },
      { title: "Pillow + throw set", subtitle: "2–4 pillows, one throw", priceHint: "Under $80", whyItWorks: "Quickest way to shift the mood toward cozy/clean." },
    ];
  }

  if (budget === "500_1500") {
    return [
      { title: "Statement accent chair", subtitle: "Wood + fabric", priceHint: "$250–$450", whyItWorks: "Creates a ‘designed’ moment without a full furniture swap." },
      { title: "Larger rug upgrade", subtitle: "Size up 1 step", priceHint: "$200–$450", whyItWorks: "Correct scale makes the room look immediately more expensive." },
      { title: "Closed storage", subtitle: "Low cabinet or bins", priceHint: "$120–$300", whyItWorks: "Hides clutter and keeps the clean-minimal vibe." },
    ];
  }

  if (budget === "1500_3000") {
    return [
      { title: "Main piece upgrade", subtitle: "Sofa or bed frame", priceHint: "$900–$1,800", whyItWorks: "One anchor upgrade changes the entire room’s feel." },
      { title: "Lighting feature", subtitle: "Floor lamp or pendant", priceHint: "$180–$450", whyItWorks: "Creates a focal point and adds designer polish." },
      { title: "Art set", subtitle: "2–3 coordinated prints", priceHint: "$120–$300", whyItWorks: "Adds structure and personality without clutter." },
    ];
  }

  // 3000_plus
  return [
    { title: "Anchor piece (premium)", subtitle: "Sofa / sectional / bed", priceHint: "$1,500–$3,500", whyItWorks: "Upgrades comfort + silhouette: the whole room levels up." },
    { title: "Layered window treatment", subtitle: "Sheer + blackout", priceHint: "$200–$600", whyItWorks: "Adds softness and height—very ‘finished’ look." },
    { title: "Statement rug + coffee table", subtitle: "Correct scale", priceHint: "$700–$1,500", whyItWorks: "Scale and texture is what makes spaces look high-end." },
  ];
}

export default async function ResultPage({
  params,
}: {
  params: { roomId: string };
}) {
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const roomId = params.roomId;

  const { data: room, error: roomErr } = await supabase
    .from("rooms")
    .select("id,user_id,room_type,goal,style_key,budget_tier,input_image_path,status,created_at")
    .eq("id", roomId)
    .single();

  if (roomErr || !room) redirect("/app");
  if (room.user_id !== user.id) redirect("/app");

  const { data: gen } = await supabase
    .from("generations")
    .select("id,created_at,output_image_path,watermarked,explanation")
    .eq("room_id", room.id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const roomType = room.room_type as RoomType;
  const goal = room.goal as GoalKey;
  const styleKey = room.style_key as StyleKey;
  const budgetTier = room.budget_tier as BudgetTier;

  const explanationLines =
    gen?.explanation?.split("\n").map((s) => s.trim()).filter(Boolean) ?? [];

  const recs = getPlaceholderRecs(budgetTier);

  return (
    <main className="min-h-screen bg-[#FAF9F7] text-[#1F1F1F]">
      <div className="mx-auto w-full max-w-[1100px] px-6 py-10">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="text-sm tracking-wide text-[#6A6A6A]">CozyLogic</div>
            <h1 className="mt-2 text-3xl font-semibold leading-tight">
              Your redesigned space
            </h1>
            <p className="mt-2 text-[15px] leading-relaxed text-[#6A6A6A]">
              A calm concept built around your goal, style, and budget.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/app"
              className="rounded-xl border border-[#EAEAEA] bg-white px-4 py-2 text-sm font-medium shadow-sm"
            >
              Dashboard
            </Link>
            <Link
              href="/app/new"
              className="rounded-xl bg-[#6F8373] px-4 py-2 text-sm font-medium text-white shadow-sm"
            >
              New redesign
            </Link>
          </div>
        </div>

        {/* Summary strip */}
        <div className="mt-8 rounded-2xl border border-[#EAEAEA] bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div>
              <div className="text-xs text-[#6A6A6A]">Room</div>
              <div className="text-sm font-medium">{ROOM_LABELS[roomType]}</div>
            </div>
            <div>
              <div className="text-xs text-[#6A6A6A]">Goal</div>
              <div className="text-sm font-medium">{GOAL_LABELS[goal]}</div>
            </div>
            <div>
              <div className="text-xs text-[#6A6A6A]">Style</div>
              <div className="text-sm font-medium">{STYLE_LABELS[styleKey]}</div>
            </div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs text-[#6A6A6A]">Budget</div>
                <div className="text-sm font-medium">{BUDGET_LABELS[budgetTier]}</div>
              </div>
              {gen?.watermarked ? (
                <div
                  className="mt-1 rounded-full border border-[#EAEAEA] bg-[#FAF9F7] px-2 py-0.5 text-[11px] text-[#6A6A6A]"
                  title="Free plan preview"
                >
                  Watermarked (free)
                </div>
              ) : gen ? (
                <div className="mt-1 rounded-full border border-[#6F8373] bg-[#FAF9F7] px-2 py-0.5 text-[11px] font-medium">
                  Pro
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Before/After */}
        <div className="mt-10">
          <ResultImages
            inputPath={room.input_image_path}
            outputPath={gen?.output_image_path ?? null}
          />
        </div>

        {/* What we refined */}
        <div className="mt-10 rounded-2xl border border-[#EAEAEA] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">What we refined</h2>
          {explanationLines.length ? (
            <ul className="mt-4 space-y-2 text-[15px] leading-relaxed">
              {explanationLines.map((line, idx) => (
                <li key={idx} className="text-[#1F1F1F]">
                  {line.startsWith("•") ? line : `• ${line}`}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[15px] leading-relaxed text-[#6A6A6A]">
              Your design notes will appear here after generation.
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/app/new"
              className="rounded-xl bg-[#6F8373] px-4 py-2 text-sm font-medium text-white shadow-sm"
            >
              Generate another look
            </Link>
            <button
              type="button"
              disabled
              className="rounded-xl border border-[#EAEAEA] bg-white px-4 py-2 text-sm font-medium opacity-50 shadow-sm"
              title="Stripe coming soon"
            >
              Upgrade for unlimited (coming soon)
            </button>
          </div>
        </div>

        {/* Recommendations */}
        <div className="mt-10 rounded-2xl border border-[#EAEAEA] bg-white p-6 shadow-sm">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Recommended pieces</h2>
              <p className="mt-1 text-sm text-[#6A6A6A]">
                Suggestions tuned to your budget tier. (Affiliate links later.)
              </p>
            </div>
            <div className="text-xs text-[#6A6A6A]">
              {budgetTier === "rearrange_only" ? "No-spend mode" : "Budget-aware"}
            </div>
          </div>

          <RecommendationList items={recs} />
        </div>
      </div>
    </main>
  );
}