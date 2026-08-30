import {
  ROOM_LABELS,
  ROOM_TYPES,
} from "@/lib/cozylogic/constants";

type RoomType = (typeof ROOM_TYPES)[number];

const ROOM_ACTIONS: Record<RoomType, string[]> = {
  living_room: [
    "Reset the main walking path before moving the sofa, chairs, or TV zone.",
    "Group the items already on the coffee table or console instead of adding organizers.",
    "Straighten the rug, pillows, and throws you already own, then compare the spacing again.",
  ],
  bedroom: [
    "Make the bed and straighten the existing bedding before judging the furniture layout.",
    "Clear and regroup the items already on the nightstands and dresser without hiding major pieces.",
    "Check the walking path around the bed, then make only small moves with existing movable items.",
  ],
  dining_room: [
    "Reset the chairs evenly around the existing table and keep the main walkway clear.",
    "Group what is already on the table or sideboard into a calmer arrangement.",
    "Straighten the existing rug and textiles before deciding whether anything needs to move.",
  ],
  office: [
    "Tidy the visible desk surface while keeping the desk, chair, lamps, storage, and equipment present.",
    "Group existing cables and small items without inventing new storage or removing equipment.",
    "Test small chair or movable-object adjustments that improve the work path.",
  ],
  small_space: [
    "Open the clearest walking path by repositioning only the movable items already in the room.",
    "Group loose belongings with storage that is already visible; do not add or hide major objects.",
    "Straighten existing textiles and compare the room again in even natural light.",
  ],
  other: [
    "Start with the main walking path and move only objects that are already present and movable.",
    "Group existing small belongings more neatly without erasing storage, equipment, or furniture.",
    "Straighten existing textiles and use a brighter exposure to evaluate the new spacing.",
  ],
};

export default function UseWhatYouHave({ roomType }: { roomType: string }) {
  const safeRoom = ROOM_TYPES.includes(roomType as RoomType)
    ? (roomType as RoomType)
    : "other";

  return (
    <section className="relative mt-8 rounded-lg border border-[#D8C7AE] bg-[#FFF8EA] p-4 shadow-[0_18px_45px_rgba(68,52,37,0.10)] sm:p-5">
      <span
        aria-hidden="true"
        className="absolute -top-3 left-10 h-7 w-28 rotate-[3deg] bg-[#E8D8BC]/90 shadow-sm"
      />
      <div className="inline-flex rounded-lg border border-[#DFC588] bg-[#F7E3A6] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5F4A2E]">
        Free Fix
      </div>
      <h2 className="mt-2 text-2xl font-semibold leading-tight text-[#1F1F1F]">
        Use what you have
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6A5A49]">
        No shopping list for this preview. Try these no-cost moves in your {ROOM_LABELS[safeRoom].toLowerCase()} first.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
        {ROOM_ACTIONS[safeRoom].map((action, index) => (
          <article
            key={action}
            className="relative min-h-[132px] rounded-lg border border-[#D8C7AE] bg-[#FFFDF7] p-4 shadow-sm"
          >
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7C6247]">
              Try {index + 1}
            </div>
            <p className="mt-3 text-sm leading-6 text-[#6A5A49]">{action}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
