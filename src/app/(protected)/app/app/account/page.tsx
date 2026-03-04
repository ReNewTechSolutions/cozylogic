// app/(protected)/app/account/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";

export default async function AccountPage() {
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("email,plan,monthly_generations_used,monthly_generation_limit,usage_reset_at")
    .eq("id", user.id)
    .single();

  const plan = profile?.plan ?? "free";
  const used = profile?.monthly_generations_used ?? 0;
  const limit = profile?.monthly_generation_limit ?? null;
  const resetAt = profile?.usage_reset_at ? new Date(profile.usage_reset_at) : null;

  return (
    <main className="min-h-screen bg-[#FAF9F7] text-[#1F1F1F]">
      <div className="mx-auto w-full max-w-[900px] px-6 py-10">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="text-sm tracking-wide text-[#6A6A6A]">CozyLogic</div>
            <h1 className="mt-2 text-3xl font-semibold leading-tight">Account</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-[#6A6A6A]">
              Manage your plan and usage.
            </p>
          </div>

          <Link
            href="/app"
            className="rounded-xl border border-[#EAEAEA] bg-white px-4 py-2 text-sm font-medium shadow-sm"
          >
            Dashboard
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-[#EAEAEA] bg-white p-6 shadow-sm">
            <div className="text-xs text-[#6A6A6A]">Signed in as</div>
            <div className="mt-1 text-sm font-medium">{profile?.email ?? user.email}</div>

            <div className="mt-6 text-xs text-[#6A6A6A]">Plan</div>
            <div className="mt-1 text-lg font-semibold">{plan === "pro" ? "Pro" : "Free"}</div>

            <div className="mt-6 text-xs text-[#6A6A6A]">Usage</div>
            <div className="mt-1 text-sm font-medium">
              {limit === null ? `${used} used` : `${used} / ${limit}`}
            </div>

            {resetAt && (
              <div className="mt-2 text-xs text-[#6A6A6A]">
                Usage resets: {resetAt.toLocaleDateString()}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-[#EAEAEA] bg-white p-6 shadow-sm">
            <div className="text-sm font-semibold">Upgrade</div>
            <p className="mt-2 text-[15px] leading-relaxed text-[#6A6A6A]">
              Pro unlocks unlimited redesigns, no watermark, and saved history. Payments are
              being finalized.
            </p>

            <button
              type="button"
              disabled
              className="mt-5 w-full rounded-xl bg-[#1F1F1F] px-4 py-3 text-sm font-medium text-white opacity-50 shadow-sm"
              title="Stripe coming soon"
            >
              Upgrade to Pro (coming soon)
            </button>

            <div className="mt-6 border-t border-[#EAEAEA] pt-5">
              <SignOutButton />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}