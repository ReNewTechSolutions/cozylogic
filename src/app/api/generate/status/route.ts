import { NextRequest, NextResponse } from "next/server";
import { getSupabaseRouteClient } from "@/lib/supabase/route";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");

  if (!id || id === "undefined") {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

  const res = NextResponse.next();
  const supabase = getSupabaseRouteClient(req, res);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: room, error } = await supabase
    .from("rooms")
    .select("id,user_id,status,generation_status,generation_error,updated_at")
    .eq("id", id)
    .single();

  if (error || !room) {
    return NextResponse.json({ error: "generation_not_found" }, { status: 404 });
  }

  if (room.user_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data: generation } = await supabase
    .from("generations")
    .select("id,output_image_path,created_at")
    .eq("room_id", room.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    id: room.id,
    generationId: room.id,
    roomId: room.id,
    status: room.status,
    generation_status: room.generation_status,
    generation_error: room.generation_error,
    resultUrl: `/app/result/${room.id}`,
    completedGenerationId: generation?.id ?? null,
    output_image_path: generation?.output_image_path ?? null,
    updated_at: room.updated_at,
  });
}
