import {
  BUDGET_LABELS,
  BUDGET_TIERS,
  ROOM_LABELS,
  ROOM_TYPES,
  STYLE_LABELS,
  STYLES,
} from "@/lib/cozylogic/constants";

type RoomType = (typeof ROOM_TYPES)[number];
type StyleKey = (typeof STYLES)[number];
type BudgetTier = (typeof BUDGET_TIERS)[number];

const ROOM_MOVES: Record<RoomType, string> = {
  living_room: "Start with the main walkway, then tidy the coffee table and sofa zone.",
  bedroom: "Make the bed the calm anchor, then clear the nightstands and dresser top.",
  dining_room: "Clear the table surface first, then reset the chairs so the traffic path feels easy.",
  office: "Tame the desk surface and cables first, then reset the lamp and chair zone.",
  small_space: "Open the largest walking path first, then group loose items into one storage zone.",
  other: "Clear the most visible surface first, then reset the pieces that shape the room flow.",
};

const ROOM_KEEPERS: Record<RoomType, string> = {
  living_room: "Keep the TV wall, windows, doors, sofa position, and room shape recognizable.",
  bedroom: "Keep the bed, windows, dresser, closet doors, TV, and major furniture in place.",
  dining_room: "Keep the table placement, windows, doorways, and traffic flow intact.",
  office: "Keep the desk location, windows, doors, and shelving where they already work.",
  small_space: "Keep the structure and major furniture stable so the preview stays practical.",
  other: "Keep the real walls, windows, doors, built-ins, and major furniture placement.",
};

const BUDGET_BUYS: Record<BudgetTier, string> = {
  rearrange_only: "Skip shopping for now. Try rearranging, decluttering, and restyling what you own.",
  under_500: "Keep buys tiny: a lamp, pillow covers, bins, art, or one soft textile.",
  "500_1500": "Consider one anchor upgrade, like a rug, lamp, storage piece, or small chair.",
  "1500_3000": "Use this as inspiration first, then price only the pieces that truly matter.",
  "3000_plus": "Treat Dream Mode as a mood board, not a shopping requirement.",
};

export default function ResultMissionBoard({
  roomType,
  styleKey,
  budgetTier,
}: {
  roomType: string;
  styleKey: string;
  budgetTier: string;
}) {
  const room = ROOM_TYPES.includes(roomType as RoomType) ? (roomType as RoomType) : "other";
  const style = STYLES.includes(styleKey as StyleKey) ? (styleKey as StyleKey) : "cozy_neutral";
  const budget = BUDGET_TIERS.includes(budgetTier as BudgetTier)
    ? (budgetTier as BudgetTier)
    : "rearrange_only";

  const cards = [
    {
      label: "Move this first",
      title: ROOM_LABELS[room],
      body: ROOM_MOVES[room],
    },
    {
      label: "Keep this",
      title: STYLE_LABELS[style],
      body: ROOM_KEEPERS[room],
    },
    {
      label: "Optional buys",
      title: BUDGET_LABELS[budget],
      body: BUDGET_BUYS[budget],
    },
  ];

  return (
    <section className="mt-8 rounded-lg border border-[#D8C7AE] bg-[#FFF8EA] p-4 shadow-[0_18px_45px_rgba(68,52,37,0.10)] sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7C6247]">
            Room mission notes
          </div>
          <h2 className="mt-2 text-2xl font-semibold leading-tight text-[#1F1F1F]">
            Copy-paste this refresh plan
          </h2>
        </div>
        <div className="hidden rotate-[-2deg] rounded-lg border border-[#DFC588] bg-[#F7E3A6] px-3 py-2 text-xs font-semibold text-[#5F4A2E] shadow-sm sm:block">
          start simple
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
        {cards.map((card, index) => (
          <article
            key={card.label}
            className={[
              "relative min-h-[164px] rounded-lg border border-[#D8C7AE] bg-[#FFFDF7] p-4 shadow-sm",
              index === 1 ? "md:translate-y-3" : "",
            ].join(" ")}
          >
            <span
              aria-hidden="true"
              className="absolute -top-2 left-6 h-5 w-20 rotate-[-3deg] bg-[#E8D8BC]/80 shadow-sm"
            />
            <div className="inline-flex rounded-lg border border-[#DFC588] bg-[#F7E3A6] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5F4A2E]">
              {card.label}
            </div>
            <h3 className="mt-4 text-base font-semibold text-[#1F1F1F]">{card.title}</h3>
            <p className="mt-2 text-sm leading-6 text-[#6A5A49]">{card.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
