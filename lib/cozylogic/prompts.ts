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
  
  export type PromptInputs = {
    roomType: RoomType;
    goal: GoalKey;
    styleKey: StyleKey;
    budgetTier: BudgetTier;
  };
  
  export function buildDesignPrompt(inputs: PromptInputs) {
    const room = ROOM_LABELS[inputs.roomType];
    const goal = GOAL_LABELS[inputs.goal];
    const style = STYLE_LABELS[inputs.styleKey];
    const budget = BUDGET_LABELS[inputs.budgetTier];
  
    const rearrangeOnly = inputs.budgetTier === "rearrange_only";
  
    return [
      "You are an expert interior designer specializing in practical, budget-aware redesigns for real homes.",
      "",
      `Room: ${room}`,
      `Goal: ${goal}`,
      `Style: ${style}`,
      `Budget: ${budget}`,
      "",
      "Output requirements:",
      "- Provide a layout plan in plain language (walking path, furniture placement, spacing).",
      "- Provide a color/material direction (paint/wood/metal/textiles) aligned to the style.",
      "- Provide a short shopping list (5–10 items) ONLY within the user's budget tier.",
      "- If budget is 'Rearrange only', provide NO shopping list and focus purely on repositioning and decluttering.",
      "- Keep the recommendations modern, clean, and realistic for DIY decorators.",
      "- Avoid brand names unless explicitly asked; focus on item types and dimensions.",
      "",
      rearrangeOnly
        ? "Important: The user has zero budget. Do not recommend purchases."
        : "Important: Respect the budget tier. Avoid recommendations that break the tier.",
      "",
      "Return format:",
      "1) Layout plan (bullets)",
      "2) Style direction (bullets)",
      rearrangeOnly ? "3) Finishing touches (bullets)" : "3) Shopping list (bullets)",
      "4) 3 quick wins (bullets)",
    ].join("\n");
  }