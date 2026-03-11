// lib/cozylogic/prompts.ts
import {
  BUDGET_LABELS,
  GOAL_LABELS,
  ROOM_LABELS,
  STYLE_LABELS,
  BUDGET_TIERS,
  GOALS,
  ROOM_TYPES,
  STYLES,
} from "@/lib/cozylogic/constants";

type RoomType = (typeof ROOM_TYPES)[number];
type GoalKey = (typeof GOALS)[number];
type StyleKey = (typeof STYLES)[number];
type BudgetTier = (typeof BUDGET_TIERS)[number];
type Mode = "reality_lock" | "precision" | "creative";

export type PromptInputs = {
  roomType: RoomType;
  goal: GoalKey;
  styleKey: StyleKey;
  budgetTier: BudgetTier;
  mode?: Mode;
  strength?: number; // 0-100
};

function clampStrength(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return 60;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function strengthLabel(strength: number) {
  if (strength <= 30) return "Subtle";
  if (strength <= 70) return "Balanced";
  return "Bold";
}

function modeLabel(mode: Mode) {
  switch (mode) {
    case "reality_lock":
      return "Reality Lock™";
    case "creative":
      return "Creative";
    default:
      return "Precision";
  }
}

function getTransformationRules(mode: Mode, strength: number, rearrangeOnly: boolean) {
  if (rearrangeOnly || strength <= 30) {
    return [
      "TRANSFORMATION LEVEL",
      "- Rearrange / stage only.",
      "- Keep the user's existing major furniture whenever possible.",
      "- Focus on layout flow, decluttering, styling, organization, and small finishing touches.",
      "- Do not recommend expensive swaps.",
    ].join("\n");
  }

  if (mode === "reality_lock") {
    return [
      "TRANSFORMATION LEVEL",
      "- Reality Lock™ mode: preserve the real room structure as tightly as possible.",
      "- Keep the space recognizable as the same room.",
      "- Prioritize realistic, achievable upgrades over dramatic reinvention.",
      "- Preserve walls, windows, doors, floor layout, and camera perspective.",
      strength > 70
        ? "- Stronger decor and furniture changes are allowed, but the room must still feel unmistakably like the original space."
        : "- Allow moderate furniture, decor, textile, and lighting upgrades while keeping the room grounded in reality.",
    ].join("\n");
  }

  if (mode === "creative") {
    return [
      "TRANSFORMATION LEVEL",
      "- Creative mode: allow a stronger visual shift while keeping the room believable.",
      "- Bigger furniture, decor, and styling changes are allowed.",
      "- The architecture should still remain intact, but the result can feel more editorial and aspirational.",
      strength > 70
        ? "- Push for a bold, high-impact transformation."
        : "- Keep the transformation expressive but still practical.",
    ].join("\n");
  }

  return [
    "TRANSFORMATION LEVEL",
    "- Precision mode: preserve the original room as closely as possible while improving the design.",
    "- Moderate furniture and decor changes are allowed.",
    "- Prioritize believable layout, style consistency, and realistic upgrades.",
    strength > 70
      ? "- Strong changes are allowed, but the room must remain clearly recognizable."
      : "- Keep the redesign controlled and realistic.",
  ].join("\n");
}

function getStyleDirection(style: string, styleKey: StyleKey) {
  switch (styleKey) {
    case "modern_minimal":
      return [
        `STYLE DIRECTION: ${style}`,
        "- Clean lines, calm palette, reduced clutter",
        "- Fewer but stronger statement pieces",
        "- Soft neutrals, black accents, natural materials",
      ].join("\n");

    case "cozy_neutral":
      return [
        `STYLE DIRECTION: ${style}`,
        "- Warm layered neutrals",
        "- Soft textiles, organic textures, inviting lighting",
        "- Calm, homey, comfortable atmosphere",
      ].join("\n");

    case "scandinavian":
      return [
        `STYLE DIRECTION: ${style}`,
        "- Light woods, airy palette, soft contrast",
        "- Minimal clutter with cozy functional styling",
        "- Clean but lived-in, warm, and bright",
      ].join("\n");

    case "japandi":
      return [
        `STYLE DIRECTION: ${style}`,
        "- Minimal but warm",
        "- Natural woods, muted tones, quiet negative space",
        "- Calm, refined, sculptural simplicity",
      ].join("\n");

    case "soft_boho":
      return [
        `STYLE DIRECTION: ${style}`,
        "- Organic materials, relaxed styling, earthy warmth",
        "- Woven textures, soft curves, layered textiles",
        "- Editorial but approachable",
      ].join("\n");

    case "clean_traditional":
      return [
        `STYLE DIRECTION: ${style}`,
        "- Refined classic lines with a cleaner edit",
        "- Timeless furniture, balanced symmetry, polished details",
        "- Traditional warmth without visual heaviness",
      ].join("\n");

    default:
      return `STYLE DIRECTION: ${style}`;
  }
}

export function buildDesignPrompt(inputs: PromptInputs) {
  const room = ROOM_LABELS[inputs.roomType];
  const goal = GOAL_LABELS[inputs.goal];
  const style = STYLE_LABELS[inputs.styleKey];
  const budget = BUDGET_LABELS[inputs.budgetTier];

  const mode: Mode = inputs.mode ?? "precision";
  const strength = clampStrength(inputs.strength);
  const rearrangeOnly = inputs.budgetTier === "rearrange_only";
  const strengthTier = strengthLabel(strength);

  return [
    "You are an expert interior designer and home staging strategist specializing in realistic AI redesigns for real homes.",
    "",
    "PROJECT SUMMARY",
    `- Room: ${room}`,
    `- Goal: ${goal}`,
    `- Style: ${style}`,
    `- Budget: ${budget}`,
    `- Mode: ${modeLabel(mode)}`,
    `- Strength: ${strength}/100 (${strengthTier})`,
    "",
    "CORE POSITIONING",
    "- This is not a fantasy redesign.",
    "- The result should feel like a believable, practical transformation of the user's actual room.",
    "- Prioritize realism, achievable styling, and a recognizable before/after relationship.",
    "",
    "REALITY LOCK RULES",
    "- Preserve the real room structure whenever possible.",
    "- Do not invent new walls, windows, doors, or impossible architecture.",
    "- Keep furniture scale, walking paths, and placement believable for the room size.",
    "- Avoid surreal styling, luxury-overload, or magazine-only concepts that would feel fake in a normal home.",
    "",
    getTransformationRules(mode, strength, rearrangeOnly),
    "",
    getStyleDirection(style, inputs.styleKey),
    "",
    "GOAL INTERPRETATION",
    `- The room should feel more: ${goal}`,
    "- Translate the goal into concrete design decisions involving layout, light, palette, texture, and furniture emphasis.",
    "",
    "SHOPPING + AFFILIATE READINESS",
    rearrangeOnly
      ? "- Do not recommend purchases. Focus on rearranging, tidying, styling, and organization only."
      : "- Recommend realistic item categories that could later be linked to commerce or affiliate products.",
    rearrangeOnly
      ? "- Organizer suggestions are allowed only if absolutely necessary and should be minimal."
      : "- Prefer item types that are easy to source online (Amazon-friendly categories are fine), but do not mention brand names unless explicitly asked.",
    "- Include size-aware, finish-aware suggestions so recommendations feel easy to shop.",
    "",
    "OUTPUT REQUIREMENTS",
    "- Keep the recommendations modern, clear, practical, and visually strong.",
    "- Avoid vague advice like 'make it nicer' or 'add decor.'",
    "- Use concrete item types, finishes, materials, and placement ideas.",
    "- The tone should feel premium but approachable.",
    "",
    "RETURN FORMAT",
    "1) Reality Lock summary (2-4 bullets)",
    "2) Layout plan (bullets)",
    "3) Style direction (bullets)",
    rearrangeOnly ? "4) Finishing touches (bullets)" : "4) Shopping list / product-ready picks (bullets)",
    "5) 3 quick wins (bullets)",
    "6) Share-worthy one-line reveal caption",
  ].join("\n");
}