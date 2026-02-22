// hooks/useRoomStatusPoll.ts
"use client";

import { useEffect, useRef, useState } from "react";

type RoomStatusPayload = {
  id: string;
  status: string | null;
  generation_status: string | null;
  generation_error: string | null;
  updated_at?: string | null;
};

export function useRoomStatusPoll(roomId: string, enabled: boolean, intervalMs = 1200) {
  const [data, setData] = useState<RoomStatusPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || !roomId) return;

    let cancelled = false;

    async function tick() {
      try {
        setError(null);

        const res = await fetch(`/api/rooms/${roomId}/status`, {
          method: "GET",
          cache: "no-store", // ✅ critical: don’t cache status
          headers: { "Content-Type": "application/json" },
        });

        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(json?.error ?? `status_failed_${res.status}`);
        }

        if (!cancelled) setData(json);

        // Stop polling when done/error
        const s = String(json?.status ?? "");
        const step = String(json?.generation_status ?? "");
        const done =
          s === "generated" ||
          s === "error" ||
          step === "done" ||
          step === "generated" ||
          step === "error";

        if (done && timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "status_failed");
      }
    }

    // fire immediately
    void tick();

    timerRef.current = window.setInterval(() => {
      void tick();
    }, intervalMs);

    return () => {
      cancelled = true;
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [roomId, enabled, intervalMs]);

  return { data, error };
}