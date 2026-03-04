// src/app/api/rooms/[roomId]/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseRouteClient } from "@/lib/supabase/route";

export async function GET(req: NextRequest, ctx: { params: { roomId: string } }) {
  const roomId = ctx.params.roomId;

  // must pass a response so Supabase can set refreshed cookies if needed
  const res = NextResponse.next();
  const supabase = getSupabaseRouteClient(req, res);

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr) {
    return NextResponse.json({ error: authErr.message }, { status: 401 });
  }
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: room, error } = await supabase
    .from("rooms")
    .select("id,user_id,status,generation_status,generation_error,updated_at")
    .eq("id", roomId)
    .single();

  if (error || !room) {
    return NextResponse.json({ error: "room_not_found" }, { status: 404 });
  }

  if (room.user_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  return NextResponse.json(
    {
      id: room.id,
      status: room.status,
      generation_status: room.generation_status,
      generation_error: room.generation_error,
      updated_at: room.updated_at,
    },
    { status: 200 }
  );
}