// app/api/generations/[generationId]/delete/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { STORAGE_BUCKET_OUTPUTS } from "@/lib/cozylogic/constants";

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ generationId: string }> }
) {
  const { generationId } = await ctx.params;

  const supabase = await getSupabaseServerClient();
  const admin = getSupabaseAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Load generation (must belong to user)
  const { data: gen, error: genErr } = await supabase
    .from("generations")
    .select("id,user_id,output_image_path,deleted_at,hard_deleted_at")
    .eq("id", generationId)
    .single();

  if (genErr || !gen) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (gen.user_id !== user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  // Soft delete (idempotent)
  const { error: softErr } = await supabase
    .from("generations")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", generationId);

  if (softErr) return NextResponse.json({ error: "soft_delete_failed" }, { status: 500 });

  // Optional: hard-delete storage object immediately for free tier, etc.
  // If you only want pruning to hard-delete later, remove this block.
  if (gen.output_image_path) {
    try {
      await admin.storage.from(STORAGE_BUCKET_OUTPUTS).remove([gen.output_image_path]);
      await supabase
        .from("generations")
        .update({ hard_deleted_at: new Date().toISOString() })
        .eq("id", generationId);
    } catch {
      // non-fatal (still soft deleted)
    }
  }

  return NextResponse.json({ ok: true });
}