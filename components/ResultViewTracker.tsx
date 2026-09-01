"use client";

import ProductEventOnMount from "@/components/ProductEventOnMount";
import { PRODUCT_EVENTS } from "@/lib/cozylogic/productEvents";

export default function ResultViewTracker({
  audience,
  budgetTier,
  reopened,
}: {
  audience: "guest" | "authenticated";
  budgetTier: string;
  reopened: boolean;
}) {
  return (
    <ProductEventOnMount
      name={reopened ? PRODUCT_EVENTS.resultReopened : PRODUCT_EVENTS.resultViewed}
      properties={{ audience, budget_tier: budgetTier }}
    />
  );
}
