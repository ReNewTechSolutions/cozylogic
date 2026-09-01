import Link from "next/link";
import { redirect } from "next/navigation";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import RecentDesignGrid, { type RecentCard } from "@/components/RecentDesignGrid";
import { formatUtcDate } from "@/lib/cozylogic/dateFormat";

export default async function DashboardPage() {
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/app");

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan,monthly_generations_used,monthly_generation_limit,usage_reset_at")
    .eq("id", user.id)
    .maybeSingle();

  const { data: rows } = await supabase
    .from("generations")
    .select(
      `
      id,
      created_at,
      output_image_path,
      watermarked,
      room:rooms (
        id,
        room_type,
        goal,
        style_key,
        budget_tier,
        input_image_path
      )
    `
    )
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(8);

  const items: RecentCard[] = (rows ?? [])
    .filter((g: any) => !!g.room && !!g.output_image_path)
    .map((g: any) => ({
      generation_id: g.id,
      created_at: g.created_at,
      output_image_path: g.output_image_path,
      watermarked: !!g.watermarked,
      room: {
        id: g.room.id,
        room_type: g.room.room_type,
        goal: g.room.goal,
        style_key: g.room.style_key,
        budget_tier: g.room.budget_tier,
        input_image_path: g.room.input_image_path,
      },
    }));

  const plan = profile?.plan ?? "free";
  const used = profile?.monthly_generations_used ?? 0;
  const limit = profile?.monthly_generation_limit ?? (plan === "pro" ? null : 1);
  const resetAt = formatUtcDate(profile?.usage_reset_at);

  return (
    <main className="min-h-screen bg-[#FAF9F7] text-[#1F1F1F]">
      <div className="mx-auto w-full max-w-[1100px] px-6 py-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-sm tracking-wide text-[#6A6A6A]">CozyLogic</div>
            <h1 className="mt-2 text-3xl font-semibold leading-tight">Dashboard</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-[#6A6A6A]">
              Start a new redesign, review recent results, and manage your account.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/app/new"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#6F8373] px-4 py-2 text-sm font-medium text-white shadow-sm"
            >
              New redesign
            </Link>
            <Link
              href="/app/history"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#EAEAEA] bg-white px-4 py-2 text-sm font-medium shadow-sm"
            >
              History
            </Link>
            <Link
              href="/app/account"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#EAEAEA] bg-white px-4 py-2 text-sm font-medium shadow-sm"
            >
              Account
            </Link>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#EAEAEA] bg-white p-5 shadow-sm">
            <div className="text-xs text-[#6A6A6A]">Plan</div>
            <div className="mt-1 text-2xl font-semibold">{plan === "pro" ? "Pro" : "Free"}</div>
          </div>

          <div className="rounded-2xl border border-[#EAEAEA] bg-white p-5 shadow-sm">
            <div className="text-xs text-[#6A6A6A]">Monthly usage</div>
            <div className="mt-1 text-2xl font-semibold">
              {limit === null ? `${used} used` : `${used} / ${limit}`}
            </div>
            {resetAt ? (
              <div className="mt-1 text-xs text-[#6A6A6A]">
                Resets <time dateTime={profile?.usage_reset_at}>{resetAt}</time>
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-[#EAEAEA] bg-white p-5 shadow-sm">
            <div className="text-xs text-[#6A6A6A]">Recent redesigns</div>
            <div className="mt-1 text-2xl font-semibold">{items.length}</div>
            <div className="mt-1 text-xs text-[#6A6A6A]">Showing latest saved results</div>
          </div>
        </div>

        <section className="mt-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Recent designs</h2>
              <p className="mt-1 text-sm text-[#6A6A6A]">Pick up where you left off.</p>
            </div>
            <Link
              href="/app/history"
              className="inline-flex min-h-[44px] items-center text-sm font-medium underline"
            >
              View all
            </Link>
          </div>

          {items.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-[#EAEAEA] bg-white p-8 text-center shadow-sm">
              <div className="text-lg font-semibold">No redesigns yet</div>
              <p className="mt-2 text-[15px] leading-relaxed text-[#6A6A6A]">
                Upload your first room photo to create a saved redesign.
              </p>
              <div className="mt-6">
                <Link
                  href="/app/new"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#6F8373] px-4 py-2 text-sm font-medium text-white shadow-sm"
                >
                  Start new redesign
                </Link>
              </div>
            </div>
          ) : (
            <RecentDesignGrid items={items} />
          )}
        </section>
      </div>
    </main>
  );
}
