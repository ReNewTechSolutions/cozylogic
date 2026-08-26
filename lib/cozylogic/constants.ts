// lib/cozylogic/constants.ts
// Keep these aligned with the Supabase CHECK constraints.

export const ROOM_TYPES = [
  "living_room",
  "bedroom",
  "dining_room",
  "office",
  "small_space",
  "other",
] as const;

export const GOALS = ["cozier", "brighter", "modern", "bigger", "refresh_budget"] as const;
export type GoalKey = (typeof GOALS)[number];
export type RoomType = (typeof ROOM_TYPES)[number];

export const STYLES = [
  "modern_minimal",
  "cozy_neutral",
  "scandinavian",
  "japandi",
  "soft_boho",
  "clean_traditional",
] as const;
export type StyleKey = (typeof STYLES)[number];

export const STYLE_CHOICES = [
  "cozy_neutral",
  "modern_minimal",
  "soft_boho",
  "clean_traditional",
  "scandinavian",
] as const satisfies readonly StyleKey[];

export const BUDGET_TIERS = [
  "rearrange_only",
  "under_500",
  "500_1500",
  "1500_3000",
  "3000_plus",
] as const;
export type BudgetTier = (typeof BUDGET_TIERS)[number];

export const BUDGET_CHOICES = [
  "rearrange_only",
  "under_500",
  "500_1500",
  "3000_plus",
] as const satisfies readonly BudgetTier[];

export const DEFAULT_BUDGET_TIER = "rearrange_only" satisfies BudgetTier;

// Human-friendly labels
export const ROOM_LABELS: Record<(typeof ROOM_TYPES)[number], string> = {
  living_room: "Living room",
  bedroom: "Bedroom",
  dining_room: "Dining room",
  office: "Office",
  small_space: "Small space",
  other: "Other",
};

export const ROOM_HELPERS: Record<(typeof ROOM_TYPES)[number], string> = {
  living_room: "Sofa zones, TV walls, coffee tables, and the place everyone gathers.",
  bedroom: "Bedding, nightstands, cozy corners, and calmer wind-down energy.",
  dining_room: "Tables, lighting, storage, and a setup that makes meals feel special.",
  office: "Desks, shelves, lighting, and a work zone that still feels like home.",
  small_space: "Apartments, nooks, studios, and rooms that need clever breathing room.",
  other: "Entry, playroom, guest room, or any spot that needs a fresh little spark.",
};

export const GOAL_LABELS: Record<(typeof GOALS)[number], string> = {
  cozier: "Cozy Nest",
  brighter: "Brighten It Up",
  modern: "Modern Refresh",
  bigger: "Make It Feel Bigger",
  refresh_budget: "Budget Magic",
};

export const GOAL_HELPERS: Record<(typeof GOALS)[number], string> = {
  cozier: "Softer textures, warmer layers, and a room that says stay awhile.",
  brighter: "Airier colors, clearer surfaces, and a little more sunshine energy.",
  modern: "Cleaner lines, calmer styling, and less visual noise.",
  bigger: "Better flow, lighter choices, and smart tricks to open things up.",
  refresh_budget: "High-impact changes that work hard without asking for much.",
};

export const STYLE_METADATA: Record<
  StyleKey,
  {
    enumValue: StyleKey;
    displayLabel: string;
    shortDescription: string;
    promptMeaning: string;
    swatches: string[];
    active: boolean;
  }
> = {
  cozy_neutral: {
    enumValue: "cozy_neutral",
    displayLabel: "Cozy Neutral",
    shortDescription: "Soft, warm, and easy to live with.",
    promptMeaning: "Use warm neutrals, layered textiles, soft lighting, and comfortable everyday styling.",
    swatches: ["#F6EFE4", "#C9AA83", "#6F8373"],
    active: true,
  },
  modern_minimal: {
    enumValue: "modern_minimal",
    displayLabel: "Warm Modern",
    shortDescription: "Clean lines without the cold showroom feeling.",
    promptMeaning: "Use simple silhouettes, warm woods, calm contrast, and low-clutter practical styling.",
    swatches: ["#F7F3EC", "#D8D1C7", "#1F1F1F"],
    active: true,
  },
  soft_boho: {
    enumValue: "soft_boho",
    displayLabel: "Soft Boho",
    shortDescription: "Relaxed layers, gentle texture, and earthy warmth.",
    promptMeaning: "Use relaxed textiles, woven texture, earthy color, soft curves, and approachable boho details.",
    swatches: ["#F5E8DA", "#C8845F", "#7C8A65"],
    active: true,
  },
  clean_traditional: {
    enumValue: "clean_traditional",
    displayLabel: "Clean Traditional",
    shortDescription: "Classic comfort with a lighter, tidier edit.",
    promptMeaning: "Use timeless shapes, balanced styling, soft classic finishes, and uncluttered traditional warmth.",
    swatches: ["#F8F4EC", "#B8A58E", "#566B7D"],
    active: true,
  },
  scandinavian: {
    enumValue: "scandinavian",
    displayLabel: "Small Space Smart",
    shortDescription: "Airy, clever, and practical for tight rooms.",
    promptMeaning: "Use light colors, flexible storage, slimmer furniture, clear walkways, and compact-room tricks.",
    swatches: ["#FBF7EF", "#D9CDB8", "#8DA5A2"],
    active: true,
  },
  japandi: {
    enumValue: "japandi",
    displayLabel: "Warm Modern",
    shortDescription: "Legacy saved style mapped into the simplified MVP labels.",
    promptMeaning: "Use warm minimal choices, natural materials, quiet negative space, and grounded practical styling.",
    swatches: ["#EFE7DC", "#B7A48B", "#2F3430"],
    active: false,
  },
};

export const STYLE_LABELS: Record<StyleKey, string> = {
  modern_minimal: STYLE_METADATA.modern_minimal.displayLabel,
  cozy_neutral: STYLE_METADATA.cozy_neutral.displayLabel,
  scandinavian: STYLE_METADATA.scandinavian.displayLabel,
  japandi: STYLE_METADATA.japandi.displayLabel,
  soft_boho: STYLE_METADATA.soft_boho.displayLabel,
  clean_traditional: STYLE_METADATA.clean_traditional.displayLabel,
};

export const STYLE_HELPERS: Record<StyleKey, string> = {
  modern_minimal: STYLE_METADATA.modern_minimal.shortDescription,
  cozy_neutral: STYLE_METADATA.cozy_neutral.shortDescription,
  scandinavian: STYLE_METADATA.scandinavian.shortDescription,
  japandi: STYLE_METADATA.japandi.shortDescription,
  soft_boho: STYLE_METADATA.soft_boho.shortDescription,
  clean_traditional: STYLE_METADATA.clean_traditional.shortDescription,
};

export const STYLE_PROMPT_MEANINGS: Record<StyleKey, string> = {
  modern_minimal: STYLE_METADATA.modern_minimal.promptMeaning,
  cozy_neutral: STYLE_METADATA.cozy_neutral.promptMeaning,
  scandinavian: STYLE_METADATA.scandinavian.promptMeaning,
  japandi: STYLE_METADATA.japandi.promptMeaning,
  soft_boho: STYLE_METADATA.soft_boho.promptMeaning,
  clean_traditional: STYLE_METADATA.clean_traditional.promptMeaning,
};

export const STYLE_SWATCHES: Record<StyleKey, string[]> = {
  modern_minimal: STYLE_METADATA.modern_minimal.swatches,
  cozy_neutral: STYLE_METADATA.cozy_neutral.swatches,
  scandinavian: STYLE_METADATA.scandinavian.swatches,
  japandi: STYLE_METADATA.japandi.swatches,
  soft_boho: STYLE_METADATA.soft_boho.swatches,
  clean_traditional: STYLE_METADATA.clean_traditional.swatches,
};

export const BUDGET_METADATA: Record<
  BudgetTier,
  {
    enumValue: BudgetTier;
    displayLabel: string;
    shortDescription: string;
    promptMeaning: string;
    cap: number | null;
    active: boolean;
  }
> = {
  rearrange_only: {
    enumValue: "rearrange_only",
    displayLabel: "Free Fix — Use what I already own",
    shortDescription: "Start here: preserve every major object and only rearrange or tidy what is already visible.",
    promptMeaning:
      "Strict inventory preservation. Add nothing, replace nothing, and keep every major visible object—including unusual functional items—visible in the after image.",
    cap: 0,
    active: true,
  },
  under_500: {
    enumValue: "under_500",
    displayLabel: "Under $100 — Small cozy refresh",
    shortDescription: "Tiny buys only if they help: lighting, pillows, bins, art, or a throw.",
    promptMeaning: "Keep spend under $100 with small optional decor and organization upgrades.",
    cap: 100,
    active: true,
  },
  "500_1500": {
    enumValue: "500_1500",
    displayLabel: "Under $500 — Real room glow-up",
    shortDescription: "A few practical anchor pieces like a rug, lamp, shelves, or storage.",
    promptMeaning: "Keep spend under $500 with practical high-impact pieces while preserving most existing furniture.",
    cap: 500,
    active: true,
  },
  "1500_3000": {
    enumValue: "1500_3000",
    displayLabel: "Dream Mode — Show me the upgraded version",
    shortDescription: "Legacy saved budget mapped into the simplified Dream Mode label.",
    promptMeaning: "Show a more upgraded version, but keep the room believable and avoid luxury-only assumptions.",
    cap: null,
    active: false,
  },
  "3000_plus": {
    enumValue: "3000_plus",
    displayLabel: "Dream Mode — Show me the upgraded version",
    shortDescription: "A bigger test for inspiration before committing to any major changes.",
    promptMeaning: "Show a more upgraded version, but keep the room believable and useful as inspiration.",
    cap: null,
    active: true,
  },
};

// Human-friendly labels
export const BUDGET_LABELS: Record<BudgetTier, string> = {
  rearrange_only: BUDGET_METADATA.rearrange_only.displayLabel,
  under_500: BUDGET_METADATA.under_500.displayLabel,
  "500_1500": BUDGET_METADATA["500_1500"].displayLabel,
  "1500_3000": BUDGET_METADATA["1500_3000"].displayLabel,
  "3000_plus": BUDGET_METADATA["3000_plus"].displayLabel,
};

export const BUDGET_HELPERS: Record<BudgetTier, string> = {
  rearrange_only: BUDGET_METADATA.rearrange_only.shortDescription,
  under_500: BUDGET_METADATA.under_500.shortDescription,
  "500_1500": BUDGET_METADATA["500_1500"].shortDescription,
  "1500_3000": BUDGET_METADATA["1500_3000"].shortDescription,
  "3000_plus": BUDGET_METADATA["3000_plus"].shortDescription,
};

export const BUDGET_PROMPT_MEANINGS: Record<BudgetTier, string> = {
  rearrange_only: BUDGET_METADATA.rearrange_only.promptMeaning,
  under_500: BUDGET_METADATA.under_500.promptMeaning,
  "500_1500": BUDGET_METADATA["500_1500"].promptMeaning,
  "1500_3000": BUDGET_METADATA["1500_3000"].promptMeaning,
  "3000_plus": BUDGET_METADATA["3000_plus"].promptMeaning,
};

export const BUDGET_PREVIEW_SETTINGS: Record<
  BudgetTier,
  {
    mode: "reality_lock" | "precision" | "creative";
    strength: number;
    planLabel: string;
    planDescription: string;
  }
> = {
  rearrange_only: {
    mode: "reality_lock",
    strength: 25,
    planLabel: "Free Fix first",
    planDescription: "Keep every major visible object and only rearrange, space, straighten, or tidy what you already own.",
  },
  under_500: {
    mode: "precision",
    strength: 45,
    planLabel: "Tiny buys, big comfort",
    planDescription: "Keep the room realistic and add only a few under-$100 cozy helpers.",
  },
  "500_1500": {
    mode: "precision",
    strength: 60,
    planLabel: "Practical glow-up",
    planDescription: "Try a few stronger updates while keeping the room useful and achievable.",
  },
  "1500_3000": {
    mode: "creative",
    strength: 75,
    planLabel: "Dream Mode",
    planDescription: "Show a more upgraded version while keeping the space believable.",
  },
  "3000_plus": {
    mode: "creative",
    strength: 75,
    planLabel: "Dream Mode",
    planDescription: "Show a more upgraded version while keeping the space believable.",
  },
};

// Optional: useful for recommendation filtering / caps
export const BUDGET_CAPS: Record<BudgetTier, number | null> = {
  rearrange_only: BUDGET_METADATA.rearrange_only.cap,
  under_500: BUDGET_METADATA.under_500.cap,
  "500_1500": BUDGET_METADATA["500_1500"].cap,
  "1500_3000": BUDGET_METADATA["1500_3000"].cap,
  "3000_plus": BUDGET_METADATA["3000_plus"].cap,
};

// Storage bucket names (keep consistent everywhere)
export const STORAGE_BUCKET_INPUTS = "cozylogic-inputs";
export const STORAGE_BUCKET_OUTPUTS = "cozylogic-outputs";
