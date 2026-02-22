// app/api/rooms/delete/route.ts
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { STORAGE_BUCKET_OUTPUTS } from "@/lib/cozylogic/constants";

export async function POST(req: Request) {
  const supabase = await getSupabaseServerClient();
  const admin = getSupabaseAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const roomId = body?.roomId as string | undefined;
  if (!roomId) return NextResponse.json({ error: "missing_roomId" }, { status: 400 });

  // Confirm ownership
  const { data: room, error: roomErr } = await supabase
    .from("rooms")
    .select("id,user_id,deleted_at")
    .eq("id", roomId)
    .single();

  if (roomErr || !room) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (room.user_id !== user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  // Pull generations to remove storage outputs
  const { data: gens, error: gensErr } = await supabase
    .from("generations")
    .select("id,output_image_path,deleted_at")
    .eq("room_id", roomId)
    .eq("user_id", user.id);

  if (gensErr) return NextResponse.json({ error: "load_failed" }, { status: 500 });

  const now = new Date().toISOString();

  // 1) Soft delete room
  const { error: roomDelErr } = await supabase
    .from("rooms")
    .update({ deleted_at: now })
    .eq("id", roomId)
    .eq("user_id", user.id);

  if (roomDelErr) return NextResponse.json({ error: "room_delete_failed" }, { status: 500 });

  // 2) Soft delete generations
  const genIds = (gens ?? []).map((g: any) => g.id);
  if (genIds.length) {
    const { error: genDelErr } = await supabase
      .from("generations")
      .update({ deleted_at: now })
      .in("id", genIds)
      .eq("user_id", user.id);

    if (genDelErr) return NextResponse.json({ error: "generation_delete_failed" }, { status: 500 });
  }

  // 3) Delete outputs from storage (best effort)
  const paths = (gens ?? [])
    .map((g: any) => g.output_image_path)
    .filter(Boolean) as string[];

  if (paths.length) {
    const del = await admin.storage.from(STORAGE_BUCKET_OUTPUTS).remove(paths);
    if (!del.error && genIds.length) {
      await supabase
        .from("generations")
        .update({ output_deleted_at: now })
        .in("id", genIds)
        .eq("user_id", user.id);
    }
  }

  return NextResponse.json({ ok: true });
}