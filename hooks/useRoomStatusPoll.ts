// hooks/useRoomStatusPoll.ts
"use client";

import { useEffect, useRef, useState } from "react";

export type RoomStatusPayload = {
  id: string;
  status: string | null;
  generation_status: string | null;
  generation_error: string | null;
  updated_at?: string | null;
};

function isDone(payload: RoomStatusPayload | null) {
  const status = String(payload?.status ?? "");
  const step = String(payload?.generation_status ?? "");
  return (
    status === "generated" ||
    status === "error" ||
    step === "done" ||
    step === "generated" ||
    step === "error"
  );
}

export function useRoomStatusPoll(roomId: string, enabled: boolean, intervalMs = 1200) {
  const [data, setData] = useState<RoomStatusPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || !roomId) return;

    let cancelled = false;

    const tick = async () => {
      try {
        const res = await fetch(`/api/rooms/${roomId}/status`, {
          method: "GET",
          cache: "no-store",
        });

        const json = (await res.json().catch(() => ({}))) as any;

        if (!res.ok) throw new Error(json?.error ?? `status_failed_${res.status}`);

        if (!cancelled) {
          setError(null);
          setData(json as RoomStatusPayload);
        }

        if (isDone(json as RoomStatusPayload) && intervalRef.current) {
          window.clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "status_failed");
      }
    };

    void tick();

    intervalRef.current = window.setInterval(() => {
      void tick();
    }, intervalMs);

    return () => {
      cancelled = true;
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [roomId, enabled, intervalMs]);

  return { data, error };
}