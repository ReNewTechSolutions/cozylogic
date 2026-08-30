import {
  BUDGET_LABELS,
  BUDGET_TIERS,
  GOAL_LABELS,
  GOALS,
  ROOM_LABELS,
  ROOM_TYPES,
  STYLE_LABELS,
  STYLES,
} from "@/lib/cozylogic/constants";

type RoomType = (typeof ROOM_TYPES)[number];
type GoalKey = (typeof GOALS)[number];
type StyleKey = (typeof STYLES)[number];
type BudgetTier = (typeof BUDGET_TIERS)[number];

type Suggestion = {
  title: string;
  reason: string;
  query: string;
};

const ROOM_SUGGESTIONS: Record<RoomType, Suggestion[]> = {
  living_room: [
    {
      title: "Soft area rug",
      reason: "Grounds the seating area and adds instant warmth.",
      query: "living room cozy area rug",
    },
    {
      title: "Throw pillow covers",
      reason: "A fast way to shift color and texture without replacing furniture.",
      query: "cozy decorative throw pillow covers",
    },
    {
      title: "Warm floor lamp",
      reason: "Creates a softer evening glow around the main seating zone.",
      query: "warm living room floor lamp",
    },
  ],
  bedroom: [
    {
      title: "Layered bedding",
      reason: "Makes the room feel finished, calm, and more hotel-cozy.",
      query: "cozy layered bedding set",
    },
    {
      title: "Bedside lamp",
      reason: "Adds soft light where the room needs it most.",
      query: "warm bedside table lamp",
    },
    {
      title: "Throw blanket",
      reason: "Adds texture and a pulled-together final layer.",
      query: "soft cozy throw blanket",
    },
  ],
  dining_room: [
    {
      title: "Table runner",
      reason: "Adds a styled focal point without crowding the table.",
      query: "dining table runner neutral",
    },
    {
      title: "Statement centerpiece",
      reason: "Gives the table a simple, polished anchor.",
      query: "dining table centerpiece bowl",
    },
    {
      title: "Dining rug",
      reason: "Softens the room and helps define the dining zone.",
      query: "dining room area rug",
    },
  ],
  office: [
    {
      title: "Desk lamp",
      reason: "Warms up task lighting and makes the workspace feel intentional.",
      query: "warm desk lamp home office",
    },
    {
      title: "Wall shelves",
      reason: "Adds vertical storage without eating up floor space.",
      query: "home office wall shelves",
    },
    {
      title: "Cable organizers",
      reason: "A tiny fix that makes a desk feel calmer fast.",
      query: "desk cable management organizer",
    },
  ],
  small_space: [
    {
      title: "Slim storage",
      reason: "Adds function without making the room feel crowded.",
      query: "small space slim storage cabinet",
    },
    {
      title: "Wall mirror",
      reason: "Bounces light and helps compact rooms feel more open.",
      query: "wall mirror small space decor",
    },
    {
      title: "Nesting tables",
      reason: "Flexible surfaces that can tuck away when you need room.",
      query: "nesting tables small space",
    },
  ],
  other: [
    {
      title: "Storage baskets",
      reason: "Makes loose items look styled instead of scattered.",
      query: "decorative storage baskets",
    },
    {
      title: "Wall art",
      reason: "Adds personality and a simple visual focal point.",
      query: "cozy neutral wall art",
    },
    {
      title: "Accent lighting",
      reason: "A small light source can change the whole mood.",
      query: "warm accent lamp decor",
    },
  ],
};

const STYLE_QUERIES: Record<StyleKey, string> = {
  modern_minimal: "warm modern",
  cozy_neutral: "cozy neutral",
  scandinavian: "small space smart",
  japandi: "warm modern",
  soft_boho: "soft boho",
  clean_traditional: "clean traditional",
};

const GOAL_SUGGESTIONS: Record<GoalKey, Suggestion> = {
  cozier: {
    title: "Texture layer",
    reason: "Adds softness and makes the room feel more inviting.",
    query: "cozy textured home decor",
  },
  brighter: {
    title: "Light-boosting mirror",
    reason: "Reflects light and helps the space feel fresher.",
    query: "decorative wall mirror brighten room",
  },
  modern: {
    title: "Clean-lined decor",
    reason: "Helps simplify surfaces without making the room feel bare.",
    query: "modern minimalist home decor",
  },
  bigger: {
    title: "Space-saving storage",
    reason: "Clears visual clutter and opens up the room.",
    query: "space saving home storage",
  },
  refresh_budget: {
    title: "Budget-friendly refresh",
    reason: "Small swaps that can make the room feel newly styled.",
    query: "affordable home decor refresh",
  },
};

const BUDGET_SUGGESTIONS: Record<BudgetTier, Suggestion> = {
  rearrange_only: {
    title: "Optional tidy helper",
    reason: "Only if you want a small assist while mostly using what you own.",
    query: "affordable home organization baskets",
  },
  under_500: {
    title: "Small refresh find",
    reason: "A low-lift piece can make the room feel updated fast.",
    query: "home decor under 100",
  },
  "500_1500": {
    title: "Hero decor piece",
    reason: "One stronger anchor can pull the whole look together.",
    query: "home decor under 500 accent rug lamp storage",
  },
  "1500_3000": {
    title: "Bigger upgrade idea",
    reason: "Good for furniture or lighting swaps with more impact.",
    query: "home furniture upgrade",
  },
  "3000_plus": {
    title: "Dream Mode idea",
    reason: "Useful inspiration if you want to imagine the upgraded version.",
    query: "warm home furniture decor upgrade",
  },
};

function uniqueSuggestions(items: Suggestion[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildSuggestions({
  roomType,
  goal,
  styleKey,
  budgetTier,
}: {
  roomType: string;
  goal: string;
  styleKey: string;
  budgetTier: string;
}) {
  const safeRoom = ROOM_TYPES.includes(roomType as RoomType)
    ? (roomType as RoomType)
    : "other";
  const safeGoal = GOALS.includes(goal as GoalKey) ? (goal as GoalKey) : "cozier";
  const safeStyle = STYLES.includes(styleKey as StyleKey)
    ? (styleKey as StyleKey)
    : "cozy_neutral";
  const safeBudget = BUDGET_TIERS.includes(budgetTier as BudgetTier)
    ? (budgetTier as BudgetTier)
    : "under_500";

  const styleTerm = STYLE_QUERIES[safeStyle];
  return uniqueSuggestions([
    ...ROOM_SUGGESTIONS[safeRoom],
    GOAL_SUGGESTIONS[safeGoal],
    BUDGET_SUGGESTIONS[safeBudget],
  ])
    .slice(0, 6)
    .map((item) => ({
      ...item,
      query: `${styleTerm} ${item.query}`,
    }));
}

function buildAmazonSearchUrl(query: string) {
  const params = new URLSearchParams({ k: query });
  const associateTag = process.env.AMAZON_ASSOCIATE_TAG?.trim();

  if (associateTag) {
    params.set("tag", associateTag);
  }

  return `https://www.amazon.com/s?${params.toString()}`;
}

export default function ShopThisLook({
  roomType,
  goal,
  styleKey,
  budgetTier,
}: {
  roomType: string;
  goal: string;
  styleKey: string;
  budgetTier: string;
}) {
  if (budgetTier === "rearrange_only") return null;

  const suggestions = buildSuggestions({
    roomType,
    goal,
    styleKey,
    budgetTier,
  });
  const roomLabel = ROOM_LABELS[roomType as RoomType] ?? "your room";
  const styleLabel = STYLE_LABELS[styleKey as StyleKey] ?? "cozy";
  const budgetLabel = BUDGET_LABELS[budgetTier as BudgetTier] ?? "your budget";

  return (
    <section className="relative mt-8 rounded-lg border border-[#D8C7AE] bg-[#FFF8EA] p-4 shadow-[0_18px_45px_rgba(68,52,37,0.10)] sm:p-5">
      <span
        aria-hidden="true"
        className="absolute -top-3 left-10 h-7 w-28 rotate-[3deg] bg-[#E8D8BC]/90 shadow-sm"
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex rounded-lg border border-[#DFC588] bg-[#F7E3A6] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5F4A2E]">
            Optional buys
          </div>
          <h2 className="mt-2 text-2xl font-semibold leading-tight text-[#1F1F1F]">
            Shop this cozy look
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6A5A49]">
            A first-pass list for a {styleLabel} {roomLabel.toLowerCase()} using the{" "}
            {budgetLabel} direction. These links are optional inspiration, not required.
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {suggestions.map((item) => (
          <a
            key={`${item.title}-${item.query}`}
            href={buildAmazonSearchUrl(item.query)}
            target="_blank"
            rel="nofollow sponsored noopener noreferrer"
            className="relative min-h-[150px] rounded-lg border border-[#D8C7AE] bg-[#FFFDF7] p-4 text-left shadow-sm transition-transform hover:-translate-y-[1px]"
          >
            <span
              aria-hidden="true"
              className="absolute -top-2 left-7 h-5 w-20 rotate-[-3deg] bg-[#E8D8BC]/80 shadow-sm"
            />
            <div className="flex items-start justify-between gap-3">
              <div className="text-base font-semibold text-[#1F1F1F]">{item.title}</div>
              <div className="rounded-lg border border-[#D8C7AE] bg-[#F7EFE3] px-2 py-0.5 text-[11px] text-[#6A5A49]">
                Search
              </div>
            </div>
            <div className="mt-3 text-sm leading-6 text-[#6A5A49]">{item.reason}</div>
          </a>
        ))}
      </div>

      <p className="mt-4 rounded-lg border border-[#D8C7AE] bg-[#FFFDF7] px-4 py-3 text-xs leading-5 text-[#6A5A49]">
        As an Amazon Associate, CozyLogic may earn from qualifying purchases.
      </p>
    </section>
  );
}
