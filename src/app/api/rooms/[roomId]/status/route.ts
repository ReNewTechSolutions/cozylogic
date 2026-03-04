import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await ctx.params;

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: room, error } = await supabase
    .from("rooms")
    .select("id,user_id,status,generation_status,gen_error,updated_at")
    .eq("id", roomId)
    .single();

  if (error || !room) {
    return NextResponse.json({ error: "room_not_found" }, { status: 404 });
  }
  if (room.user_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // NOTE: your DB column is gen_error (not generation_error)
  return NextResponse.json({
    id: room.id,
    status: room.status,
    generation_status: room.generation_status,
    generation_error: room.gen_error ?? null,
    updated_at: room.updated_at,
  });
}