// src/app/api/rooms/[roomId]/status/route.ts

import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(
  req: Request,
  { params }: { params: { roomId: string } }
) {
  const roomId = params.roomId;

  if (!roomId || roomId === "undefined") {
    return NextResponse.json({ error: "invalid_room_id" }, { status: 400 });
  }

  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: room, error } = await supabase
    .from("rooms")
    .select("id,status,generation_status,generation_error")
    .eq("id", roomId)
    .eq("user_id", user.id) // 🔐 IMPORTANT
    .single();

  if (error || !room) {
    return NextResponse.json({ error: "room_not_found" }, { status: 404 });
  }

  return NextResponse.json(room);
}