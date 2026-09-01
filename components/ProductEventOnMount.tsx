"use client";

import { useEffect, useRef } from "react";
import {
  trackProductEvent,
  type ProductEventName,
  type ProductEventProperties,
} from "@/lib/cozylogic/productEvents";

export default function ProductEventOnMount({
  name,
  properties = {},
}: {
  name: ProductEventName;
  properties?: ProductEventProperties;
}) {
  const trackedRef = useRef(false);
  const propertiesRef = useRef(properties);

  useEffect(() => {
    if (trackedRef.current) return;
    trackedRef.current = true;
    trackProductEvent(name, propertiesRef.current);
  }, [name]);

  return null;
}
