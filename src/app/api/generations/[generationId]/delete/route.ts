import { NextRequest, NextResponse } from "next/server";
import { getSupabaseRouteClient } from "@/lib/supabase/route";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { STORAGE_BUCKET_OUTPUTS } from "@/lib/cozylogic/constants";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ generationId: string }> }
) {
  const { generationId } = await ctx.params;

  if (!generationId || generationId === "undefined") {
    return NextResponse.json({ error: "missing_generationId" }, { status: 400 });
  }

  const res = NextResponse.next();
  const supabase = getSupabaseRouteClient(req, res);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: gen, error: genErr } = await supabase
    .from("generations")
    .select("id,user_id,output_image_path,deleted_at")
    .eq("id", generationId)
    .single();

  if (genErr || !gen) return NextResponse.json({ error: "generation_not_found" }, { status: 404 });
  if (gen.user_id !== user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  if (gen.deleted_at) {
    return NextResponse.json({ ok: true, alreadyDeleted: true }, { status: 200 });
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("generations")
    .update({ deleted_at: now })
    .eq("id", generationId)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (gen.output_image_path) {
    try {
      const admin = getSupabaseAdminClient();
      const del = await admin.storage.from(STORAGE_BUCKET_OUTPUTS).remove([gen.output_image_path]);
      if (!del.error) {
        await supabase
          .from("generations")
          .update({ output_deleted_at: now })
          .eq("id", generationId)
          .eq("user_id", user.id);
      }
    } catch {}
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
