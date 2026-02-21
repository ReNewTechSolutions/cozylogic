// app/(public)/page.tsx
import Link from "next/link";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const primaryHref = user ? "/app/new" : "/login";

  return (
    <main className="min-h-screen bg-[#FAF9F7] text-[#1F1F1F]">
      <div className="mx-auto w-full max-w-[1100px] px-6 py-10">
        {/* Nav */}
        <div className="flex items-center justify-between">
          <div className="text-sm tracking-wide text-[#6A6A6A]">CozyLogic</div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-xl border border-[#EAEAEA] bg-white px-4 py-2 text-sm font-medium shadow-sm"
            >
              {user ? "Switch account" : "Login"}
            </Link>
            <Link
              href={primaryHref}
              className="rounded-xl bg-[#6F8373] px-4 py-2 text-sm font-medium text-white shadow-sm"
            >
              Get started
            </Link>
          </div>
        </div>

        {/* Hero */}
        <div className="mt-16 grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
              Redesign your space — beautifully and intelligently.
            </h1>
            <p className="mt-4 max-w-[560px] text-[16px] leading-relaxed text-[#6A6A6A]">
              Upload a photo of your room and get a calm, budget-aware redesign concept:
              layout guidance, style direction, and practical next steps.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href={primaryHref}
                className="rounded-xl bg-[#6F8373] px-5 py-3 text-sm font-medium text-white shadow-sm"
              >
                Start a redesign
              </Link>
              <Link
                href={user ? "/app" : "/login"}
                className="rounded-xl border border-[#EAEAEA] bg-white px-5 py-3 text-sm font-medium shadow-sm"
              >
                {user ? "Go to dashboard" : "Sign in"}
              </Link>
            </div>

            <div className="mt-6 text-xs text-[#6A6A6A]">
              Free includes 1 redesign/month. Pro unlocks unlimited designs (coming soon).
            </div>
          </div>

          {/* Visual placeholder */}
          <div className="rounded-3xl border border-[#EAEAEA] bg-white p-6 shadow-sm">
            <div className="text-sm font-medium">Before / After preview</div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="aspect-[4/3] rounded-2xl border border-[#EAEAEA] bg-[#FAF9F7]" />
              <div className="aspect-[4/3] rounded-2xl border border-[#EAEAEA] bg-[#FAF9F7]" />
            </div>
            <div className="mt-4 text-xs text-[#6A6A6A]">
              Minimal, modern results — tuned to your budget and your style.
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="mt-16 rounded-3xl border border-[#EAEAEA] bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold">How it works</h2>
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#EAEAEA] bg-[#FAF9F7] p-5">
              <div className="text-sm font-semibold">1) Upload</div>
              <p className="mt-2 text-sm text-[#6A6A6A]">
                Add a photo of your room with natural light.
              </p>
            </div>
            <div className="rounded-2xl border border-[#EAEAEA] bg-[#FAF9F7] p-5">
              <div className="text-sm font-semibold">2) Choose</div>
              <p className="mt-2 text-sm text-[#6A6A6A]">
                Pick your goal, style, and budget (or rearrange only).
              </p>
            </div>
            <div className="rounded-2xl border border-[#EAEAEA] bg-[#FAF9F7] p-5">
              <div className="text-sm font-semibold">3) Generate</div>
              <p className="mt-2 text-sm text-[#6A6A6A]">
                Get a refined concept with actionable changes and recommendations.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-16 border-t border-[#EAEAEA] pt-8 text-xs text-[#6A6A6A]">
          © {new Date().getFullYear()} ReNewTech Solutions • CozyLogic
        </footer>
      </div>
    </main>
  );
}