// lib/cozylogic/plan.ts
import { getSupabaseServerClient } from "@/lib/supabase/server";

function startOfNextMonthUTC(d = new Date()) {
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  return new Date(Date.UTC(year, month + 1, 1, 0, 0, 0));
}

export type PlanState = {
  plan: "free" | "pro";
  used: number;
  limit: number | null; // null = unlimited
  usage_reset_at: string;
};

/**
 * Loads plan state and resets monthly usage if reset date passed.
 * Returns fresh state after any reset.
 */
export async function getPlanStateAndResetIfNeeded(userId: string): Promise<PlanState> {
    const supabase = await getSupabaseServerClient();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("plan,monthly_generations_used,monthly_generation_limit,usage_reset_at")
    .eq("id", userId)
    .single();

  if (error || !profile) {
    throw new Error("profile_not_found");
  }

  const now = new Date();
  const resetAt = new Date(profile.usage_reset_at);

  if (now >= resetAt) {
    const nextReset = startOfNextMonthUTC(now);

    const { error: resetErr } = await supabase
      .from("profiles")
      .update({
        monthly_generations_used: 0,
        usage_reset_at: nextReset.toISOString(),
      })
      .eq("id", userId);

    if (resetErr) throw new Error("usage_reset_failed");

    return {
      plan: (profile.plan ?? "free") as "free" | "pro",
      used: 0,
      limit: profile.monthly_generation_limit ?? 1,
      usage_reset_at: nextReset.toISOString(),
    };
  }

  return {
    plan: (profile.plan ?? "free") as "free" | "pro",
    used: profile.monthly_generations_used ?? 0,
    limit: profile.monthly_generation_limit ?? 1,
    usage_reset_at: profile.usage_reset_at,
  };
}

/**
 * Best-effort usage increment. Returns previous used and next used.
 */
export async function incrementUsage(userId: string, nextUsed: number) {
    const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({ monthly_generations_used: nextUsed })
    .eq("id", userId);

  if (error) throw new Error("usage_increment_failed");
}