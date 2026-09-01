export const PRODUCT_EVENTS = {
  homepageViewed: "homepage_viewed",
  demoStarted: "demo_started",
  uploadStarted: "upload_started",
  uploadSucceeded: "upload_succeeded",
  uploadFailed: "upload_failed",
  generationSubmitted: "generation_submitted",
  generationAccepted: "generation_accepted",
  generationCompleted: "generation_completed",
  generationFailed: "generation_failed",
  resultViewed: "result_viewed",
  resultReopened: "result_reopened",
  freeFixSelected: "free_fix_selected",
  under100Selected: "under_100_selected",
  under500Selected: "under_500_selected",
  dreamModeSelected: "dream_mode_selected",
  amazonAffiliateClicked: "amazon_affiliate_link_clicked",
  accountCreationStarted: "account_creation_started",
  accountCreated: "account_created",
} as const;

export type ProductEventName = (typeof PRODUCT_EVENTS)[keyof typeof PRODUCT_EVENTS];
export type ProductEventProperties = Record<string, string | boolean | null>;

export function getBudgetSelectionEvent(budgetTier: string): ProductEventName {
  if (budgetTier === "rearrange_only") return PRODUCT_EVENTS.freeFixSelected;
  if (budgetTier === "under_500") return PRODUCT_EVENTS.under100Selected;
  if (budgetTier === "500_1500") return PRODUCT_EVENTS.under500Selected;
  return PRODUCT_EVENTS.dreamModeSelected;
}
