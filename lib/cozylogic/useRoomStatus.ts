"use client";

import { useEffect, useMemo, useState } from "react";

type RoomStatus = {
  id: string;
  status: string | null;
  gen_step: string | null;
  gen_error: string | null;
};

const STEP_LABEL: Record<string, string> = {
  queued: "Starting…",
  tidying: "Pass 1 of 2 — Tidying",
  rearranging: "Pass 2 of 2 — Rearranging",
  redesigning: "Pass 2 of 2 — Redesigning",
  uploading: "Finishing…",
  generated: "Done",
  failed: "Failed",
};

export function useRoomStatus(roomId: string | null) {
  const [room, setRoom] = useState<RoomStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const label = useMemo(() => {
    const step = room?.gen_step ?? room?.status ?? "queued";
    return STEP_LABEL[step] ?? "Working…";
  }, [room?.gen_step, room?.status]);

  useEffect(() => {
    if (!roomId) return;
    let alive = true;
    let t: any;

    const tick = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/rooms/${roomId}/status`, { method: "GET" });
        const json = await res.json();
        if (!alive) return;
        if (res.ok) setRoom(json.room);
      } finally {
        if (alive) setLoading(false);
      }

      const done = room?.status === "generated" || room?.status === "failed";
      if (!done) t = setTimeout(tick, 1200);
    };

    tick();
    return () => {
      alive = false;
      if (t) clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const isWorking =
    room?.status === "queued" ||
    room?.status === "generating" ||
    (room?.status !== "generated" && room?.status !== "failed" && !!room?.gen_step && room.gen_step !== "generated");

  return { room, label, isWorking, loading };
}