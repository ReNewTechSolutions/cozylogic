import { STRICT_INVENTORY_PRESERVATION_RULES } from "./inventoryPrompt.ts";

export type FreeFixPromptInputs = {
  roomTypeLabel: string;
  styleLabel: string;
};

export function buildFreeFixImagePrompt({
  roomTypeLabel,
  styleLabel,
}: FreeFixPromptInputs) {
  return `
TASK: Create an object-preserving rearrangement preview, not a redesign.

INPUT CONTEXT:
- Room type: ${roomTypeLabel}
- Requested vibe: ${styleLabel}
- Use the vibe only to guide spacing, neat presentation, and apparent lighting. Do not use it to replace, recolor, reupholster, or restyle objects.

OUTPUT CONTRACT:
- Return exactly ONE realistic photorealistic AFTER image of this same room and nothing else.
- Do not return a collage, split screen, before/after composite, multiple views, text, labels, logos, or watermarks.

${STRICT_INVENTORY_PRESERVATION_RULES}

ARCHITECTURE AND VIEW LOCK:
- Keep the SAME room, architecture, camera angle, viewpoint, framing, crop, lens perspective, and field of view.
- Do not add, remove, move, resize, cover, or reinterpret walls, windows, doors, doorways, openings, flooring, built-ins, trim, or ceiling height.
- If curtains or blinds exist, preserve the exact same ones, coverage, and open/closed state. If none exist, do not add them.
- Preserve the visible outdoor view and window placement.
- If a TV is present, preserve the same TV, wall, location, orientation, and scale.

ONLY ALLOWED CHANGES:
- Reposition existing movable objects to improve spacing, flow, or walking paths.
- Straighten existing rugs, pillows, throws, bedding, curtains, and other textiles without changing their identity or style.
- Tidy and organize visible belongings using only storage, baskets, bins, furniture, and surfaces already visible in the photo; do not delete belongings or hide major objects.
- Improve apparent lighting or exposure without adding, removing, replacing, or moving fixed fixtures.

FINAL CHECK BEFORE OUTPUT:
- Every major visible object from the input is still present and recognizable.
- Zero invented major objects, zero visually similar substitutions, and zero architecture changes.
- The result is one believable photo of the same real room after a careful no-cost rearrangement.
`.trim();
}
