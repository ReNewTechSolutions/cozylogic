"use client";

import type { ReactNode } from "react";
import { PRODUCT_EVENTS, trackProductEvent } from "@/lib/cozylogic/productEvents";

export default function TrackedAffiliateLink({
  href,
  budgetTier,
  roomType,
  className,
  children,
}: {
  href: string;
  budgetTier: string;
  roomType: string;
  className: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="nofollow sponsored noopener noreferrer"
      className={className}
      onClick={() =>
        trackProductEvent(PRODUCT_EVENTS.amazonAffiliateClicked, {
          budget_tier: budgetTier,
          room_type: roomType,
        })
      }
    >
      {children}
    </a>
  );
}
