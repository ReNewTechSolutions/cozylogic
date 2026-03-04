// app/api/generations/delete/route.ts
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

  const generationId = body?.generationId as string | undefined;
  if (!generationId) {
    return NextResponse.json({ error: "missing_generationId" }, { status: 400 });
  }

  // Ensure it belongs to the user + get path
  const { data: gen, error: genErr } = await supabase
    .from("generations")
    .select("id,user_id,output_image_path,deleted_at")
    .eq("id", generationId)
    .single();

  if (genErr || !gen) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (gen.user_id !== user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  // Already deleted -> idempotent
  if (gen.deleted_at) return NextResponse.json({ ok: true, alreadyDeleted: true });

  // 1) Soft delete the DB row
  const now = new Date().toISOString();
  const { error: softErr } = await supabase
    .from("generations")
    .update({ deleted_at: now })
    .eq("id", generationId)
    .eq("user_id", user.id);

  if (softErr) return NextResponse.json({ error: "delete_failed" }, { status: 500 });

  // 2) Delete output from private bucket (best effort)
  const outputPath = gen.output_image_path as string | null;
  if (outputPath) {
    const del = await admin.storage.from(STORAGE_BUCKET_OUTPUTS).remove([outputPath]);
    if (!del.error) {
      await supabase
        .from("generations")
        .update({ output_deleted_at: now })
        .eq("id", generationId)
        .eq("user_id", user.id);
    }
  }

  return NextResponse.json({ ok: true });
}