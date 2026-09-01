import { track } from "@vercel/analytics";
import {
  PRODUCT_EVENTS,
  getBudgetSelectionEvent,
  type ProductEventName,
  type ProductEventProperties,
} from "@/lib/cozylogic/productEventNames";

export { PRODUCT_EVENTS, getBudgetSelectionEvent };
export type { ProductEventName, ProductEventProperties };

export function trackProductEvent(
  name: ProductEventName,
  properties: ProductEventProperties = {}
) {
  try {
    track(name, properties);
  } catch {
    // Product analytics must never interrupt the room flow.
  }
}
