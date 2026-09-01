const DEFAULT_DAILY_IMAGE_CALL_LIMIT = 25;
const MAX_CONFIGURED_DAILY_LIMIT = 10_000;

const ROOM_COST_STATUSES = ["generating", "generated", "failed"];
const GUEST_COST_STATUSES = ["queued", "generating", "generated", "failed", "error"];

export function getDailyImageCallLimit() {
  const configured = Number(process.env.COZYLOGIC_DAILY_IMAGE_CALL_LIMIT);
  if (!Number.isInteger(configured) || configured <= 0) {
    return DEFAULT_DAILY_IMAGE_CALL_LIMIT;
  }
  return Math.min(configured, MAX_CONFIGURED_DAILY_LIMIT);
}

function startOfUtcDay() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

async function countRows(query: PromiseLike<{ count: number | null; error: unknown }>) {
  const result = await query;
  if (result.error) throw result.error;
  return result.count ?? 0;
}

export async function checkDailyImageBudget(supabaseAdmin: any) {
  const since = startOfUtcDay();
  const [authenticatedJobs, guestJobs] = await Promise.all([
    countRows(
      supabaseAdmin
        .from("rooms")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since)
        .in("status", ROOM_COST_STATUSES)
    ),
    countRows(
      supabaseAdmin
        .from("guest_trials")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since)
        .in("status", GUEST_COST_STATUSES)
    ),
  ]);
  const limit = getDailyImageCallLimit();
  const reservedJobs = authenticatedJobs + guestJobs;

  return {
    allowed: reservedJobs < limit,
    authenticatedJobs,
    guestJobs,
    reservedJobs,
    limit,
  };
}
