import { NextRequest, NextResponse } from "next/server";
import { getSupabaseRouteClient } from "@/lib/supabase/route";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await ctx.params;

  const res = NextResponse.next();
  const supabase = getSupabaseRouteClient(req, res);

  const {
    data: { user },
    
  } = await supabase.auth.getUser();

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

  return NextResponse.json({
    id: room.id,
    status: room.status,
    generation_status: room.generation_status,
    generation_error: room.generation_error,
    updated_at: room.updated_at,
  });
}