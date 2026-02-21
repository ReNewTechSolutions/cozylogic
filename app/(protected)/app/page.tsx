// app/(protected)/app/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import RecentDesignGrid, { type RecentCard } from "@/components/RecentDesignGrid";

export default async function AppDashboardPage() {
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,email,plan,monthly_generations_used,monthly_generation_limit,usage_reset_at")
    .eq("id", user.id)
    .single();

  const { data: recentRaw } = await supabase
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
    .order("created_at", { ascending: false })
    .limit(8);

  const recent: RecentCard[] =
    (recentRaw ?? [])
      .filter((g: any) => !!g.room)
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
      })) ?? [];

  const plan = profile?.plan ?? "free";
  const used = profile?.monthly_generations_used ?? 0;
  const limit = profile?.monthly_generation_limit ?? null;

  return (
    <main className="min-h-screen bg-[#FAF9F7] text-[#1F1F1F]">
      <div className="mx-auto w-full max-w-[1100px] px-6 py-10">
        {/* Top Bar */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm tracking-wide text-[#6A6A6A]">CozyLogic</div>
            <h1 className="mt-2 text-3xl font-semibold leading-tight">
              Ready to refresh your space?
            </h1>
            <p className="mt-2 text-[15px] leading-relaxed text-[#6A6A6A]">
              Generate calm, budget-aware redesigns that fit your budget.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/app/history"
              className="rounded-xl border border-[#EAEAEA] bg-white px-4 py-2 text-sm font-medium shadow-sm"
            >
              History
            </Link>
            <Link
              href="/app/account"
              className="rounded-xl border border-[#EAEAEA] bg-white px-4 py-2 text-sm font-medium shadow-sm"
            >
              Account
            </Link>
            <Link
              href="/app/new"
              className="rounded-xl bg-[#6F8373] px-4 py-2 text-sm font-medium text-white shadow-sm"
            >
              Start New Redesign
            </Link>
          </div>
        </div>

        {/* Plan strip */}
        <div className="mt-8 rounded-2xl border border-[#EAEAEA] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm text-[#6A6A6A]">Plan</div>
              <div className="mt-1 text-lg font-semibold">
                {plan === "pro" ? "Pro" : "Free"}
              </div>
            </div>

            <div className="text-sm text-[#6A6A6A]">
              Usage:{" "}
              <span className="font-medium text-[#1F1F1F]">
                {limit === null ? `${used} used` : `${used} / ${limit}`}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/app/account"
                className="rounded-xl border border-[#EAEAEA] bg-white px-4 py-2 text-sm font-medium shadow-sm"
              >
                Manage
              </Link>
              <button
                type="button"
                disabled
                className="rounded-xl bg-[#1F1F1F] px-4 py-2 text-sm font-medium text-white opacity-50 shadow-sm"
                title="Stripe coming soon"
              >
                Upgrade (coming soon)
              </button>
            </div>
          </div>
        </div>

        {/* Recent Designs */}
        <div className="mt-10">
          <div className="flex items-end justify-between">
            <h2 className="text-xl font-semibold">Recent designs</h2>
            <div className="flex items-center gap-4">
              <Link
                href="/app/history"
                className="text-sm font-medium text-[#1F1F1F] underline underline-offset-4"
              >
                View all
              </Link>
              <Link
                href="/app/new"
                className="text-sm font-medium text-[#1F1F1F] underline underline-offset-4"
              >
                New redesign
              </Link>
            </div>
          </div>

          {recent.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-[#EAEAEA] bg-white p-8 text-center shadow-sm">
              <div className="mx-auto max-w-[520px]">
                <div className="text-lg font-semibold">No designs yet</div>
                <p className="mt-2 text-[15px] leading-relaxed text-[#6A6A6A]">
                  Start with a photo of your room. CozyLogic will generate a calm,
                  budget-aware transformation you can build on.
                </p>
                <div className="mt-6">
                  <Link
                    href="/app/new"
                    className="inline-flex rounded-xl bg-[#6F8373] px-4 py-2 text-sm font-medium text-white shadow-sm"
                  >
                    Start New Redesign
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <RecentDesignGrid items={recent} />
          )}
        </div>
      </div>
    </main>
  );
}