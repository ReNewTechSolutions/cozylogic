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

export const STYLES = [
  "modern_minimal",
  "cozy_neutral",
  "scandinavian",
  "japandi",
  "soft_boho",
  "clean_traditional",
] as const;

export const BUDGET_TIERS = [
  "rearrange_only",
  "under_500",
  "500_1500",
  "1500_3000",
  "3000_plus",
] as const;

// Human-friendly labels
export const ROOM_LABELS: Record<(typeof ROOM_TYPES)[number], string> = {
  living_room: "Living room",
  bedroom: "Bedroom",
  dining_room: "Dining room",
  office: "Office",
  small_space: "Small space",
  other: "Other",
};

export const GOAL_LABELS: Record<(typeof GOALS)[number], string> = {
  cozier: "Make it cozier",
  brighter: "Make it brighter",
  modern: "Make it modern",
  bigger: "Make it feel bigger",
  refresh_budget: "Refresh on a budget",
};

export const STYLE_LABELS: Record<(typeof STYLES)[number], string> = {
  modern_minimal: "Modern Minimal",
  cozy_neutral: "Cozy Neutral",
  scandinavian: "Scandinavian",
  japandi: "Japandi",
  soft_boho: "Soft Boho",
  clean_traditional: "Clean Traditional",
};

export const BUDGET_LABELS: Record<(typeof BUDGET_TIERS)[number], string> = {
  rearrange_only: "Rearrange only",
  under_500: "Under $500",
  "500_1500": "$500–$1,500",
  "1500_3000": "$1,500–$3,000",
  "3000_plus": "$3,000+",
};

// Optional: useful for recommendation filtering / caps
export const BUDGET_CAPS: Record<(typeof BUDGET_TIERS)[number], number | null> = {
  rearrange_only: 0,
  under_500: 500,
  "500_1500": 1500,
  "1500_3000": 3000,
  "3000_plus": null, // no cap
};

// Storage bucket names (keep consistent everywhere)
export const STORAGE_BUCKET_INPUTS = "cozylogic-inputs";
export const STORAGE_BUCKET_OUTPUTS = "cozylogic-outputs";