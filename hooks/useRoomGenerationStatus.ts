"use client";

import { useEffect, useRef, useState } from "react";
import { mapGenStatusToUI, type RoomGenStatus } from "@/lib/cozylogic/status";

type StatusResponse = {
  id: string;
  status: string | null;
  generation_status: RoomGenStatus | null;
  generation_error: string | null;
  updated_at?: string | null;
};

export function useRoomGenerationStatus(roomId: string | null, enabled: boolean) {
  const [roomStatus, setRoomStatus] = useState<string | null>(null);
  const [genStatus, setGenStatus] = useState<RoomGenStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ui, setUI] = useState(() => mapGenStatusToUI(null));

  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!roomId || !enabled) return;

    let cancelled = false;

    const tick = async () => {
      try {
        const res = await fetch(`/api/rooms/${roomId}/status`, { cache: "no-store" });
        const data = (await res.json().catch(() => ({}))) as Partial<StatusResponse> & {
          error?: string;
        };

        if (!res.ok) throw new Error(data?.error ?? "status_failed");
        if (cancelled) return;

        setRoomStatus(data.status ?? null);
        setGenStatus((data.generation_status ?? null) as any);
        setError(data.generation_error ?? null);
        setUI(mapGenStatusToUI((data.generation_status ?? null) as any));

        const done =
          data.status === "generated" ||
          data.status === "error" ||
          data.generation_status === "done" ||
          data.generation_status === "error";

        if (!done) timer.current = window.setTimeout(tick, 1200);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message ?? "status_failed");
        timer.current = window.setTimeout(tick, 2000);
      }
    };

    tick();

    return () => {
      cancelled = true;
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [roomId, enabled]);

  return { roomStatus, genStatus, ui, error };
}