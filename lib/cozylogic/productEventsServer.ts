import { track } from "@vercel/analytics/server";
import {
  PRODUCT_EVENTS,
  type ProductEventName,
  type ProductEventProperties,
} from "@/lib/cozylogic/productEventNames";
import { logServerEvent } from "@/lib/cozylogic/serverLog";

export { PRODUCT_EVENTS };

export async function trackServerProductEvent(
  name: ProductEventName,
  properties: ProductEventProperties = {}
) {
  logServerEvent("product", "product_event", { name, ...properties });

  try {
    await track(name, properties);
  } catch {
    logServerEvent("product", "analytics_delivery_failed", { name });
  }
}
