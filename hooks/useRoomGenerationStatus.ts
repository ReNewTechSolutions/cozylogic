// 4) ✅ Polling hook
// File: hooks/useRoomGenerationStatus.ts

"use client";

import { useEffect, useRef, useState } from "react";
import { mapGenStatusToUI, type RoomGenStatus } from "@/lib/cozylogic/status";

type StatusResponse = {
  ok: boolean;
  status: string | null;
  generation_status: RoomGenStatus;
  generation_error: string | null;
};

export function useRoomGenerationStatus(roomId: string | null, enabled: boolean) {
  const [genStatus, setGenStatus] = useState<RoomGenStatus>(null);
  const [roomStatus, setRoomStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ui, setUI] = useState(() => mapGenStatusToUI(null));

  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!roomId || !enabled) return;

    let cancelled = false;

    const tick = async () => {
      try {
        const res = await fetch(`/api/rooms/${roomId}/status`, { cache: "no-store" });
        const data = (await res.json()) as StatusResponse;

        if (!res.ok) throw new Error((data as any)?.error ?? "status_failed");

        if (cancelled) return;

        setRoomStatus(data.status ?? null);
        setGenStatus(data.generation_status ?? null);
        setError(data.generation_error ?? null);
        setUI(mapGenStatusToUI(data.generation_status ?? null));

        const done =
          data.generation_status === "done" ||
          data.status === "generated" ||
          data.generation_status === "error" ||
          data.status === "error";

        if (!done) {
          timer.current = window.setTimeout(tick, 1200);
        }
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message ?? "status_failed");
        // keep polling lightly
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