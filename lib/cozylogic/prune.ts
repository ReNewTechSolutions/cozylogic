// lib/cozylogic/prune.ts
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { STORAGE_BUCKET_OUTPUTS } from "@/lib/cozylogic/constants";

/**
 * Soft-delete any generations beyond the user's saved_generation_limit.
 * Optionally hard-delete storage objects if PRUNE_HARD_DELETE=1.
 */
export async function pruneUserGenerations(userId: string) {
  const admin = getSupabaseAdminClient();

  // 1) Read saved_generation_limit
  const { data: profile, error: pErr } = await admin
    .from("profiles")
    .select("saved_generation_limit")
    .eq("id", userId)
    .single();

  if (pErr) throw pErr;

  const limit = Math.max(0, profile?.saved_generation_limit ?? 5);

  // 2) Get all non-deleted generations newest -> oldest
  const { data: gens, error: gErr } = await admin
    .from("generations")
    .select("id, output_image_path, created_at")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (gErr) throw gErr;
  if (!gens?.length) return;

  // Keep newest `limit`, prune the rest
  const toPrune = gens.slice(limit);
  if (toPrune.length === 0) return;

  const ids = toPrune.map((g) => g.id);
  const paths = toPrune.map((g) => g.output_image_path).filter(Boolean);

  // 3) Soft delete rows
  const { error: sErr } = await admin
    .from("generations")
    .update({ deleted_at: new Date().toISOString() })
    .in("id", ids);

  if (sErr) throw sErr;

  // 4) Optional hard delete storage objects
  if (process.env.PRUNE_HARD_DELETE === "1" && paths.length) {
    const rm = await admin.storage.from(STORAGE_BUCKET_OUTPUTS).remove(paths);
    // If removal fails, we still keep soft-delete, but you might log rm.error
    if (!rm.error) {
      await admin
        .from("generations")
        .update({ hard_deleted_at: new Date().toISOString() })
        .in("id", ids);
    }
  }
}