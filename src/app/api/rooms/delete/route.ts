// src/app/api/rooms/delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseRouteClient } from "@/lib/supabase/route";

export async function POST(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = getSupabaseRouteClient(req, res);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const roomId = body?.roomId as string | undefined;

  if (!roomId) return NextResponse.json({ error: "missing_roomId" }, { status: 400 });

  // Verify ownership
  const { data: room } = await supabase.from("rooms").select("id,user_id").eq("id", roomId).maybeSingle();

  if (!room) return NextResponse.json({ error: "room_not_found" }, { status: 404 });
  if (room.user_id !== user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { error } = await supabase.from("rooms").delete().eq("id", roomId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true }, { status: 200 });
}