import Link from "next/link";

export default function MarketingHomePage() {
  return (
    <main className="min-h-screen bg-[#FAF9F7] text-[#1F1F1F]">
      
      {/* NAV */}
      <section className="border-b border-[#EAEAEA] bg-white/70 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1180px] items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#1F1F1F] px-3 py-1.5 text-sm font-semibold text-white">
              CozyLogic
            </div>
            <div className="hidden text-sm text-[#6A6A6A] sm:block">
              AI room redesigns with Reality Lock™
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-xl border border-[#EAEAEA] bg-white px-4 py-2 text-sm font-medium shadow-sm"
            >
              Sign in
            </Link>
            <Link
              href="/demo"
              className="rounded-xl bg-[#6F8373] px-4 py-2 text-sm font-medium text-white shadow-sm"
            >
              Start free
            </Link>
          </div>
        </div>
      </section>

      {/* HERO */}
      <section className="mx-auto w-full max-w-[1180px] px-6 py-16 sm:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-[1.08fr_0.92fr]">
          <div>
            <div className="inline-flex rounded-full border border-[#EAEAEA] bg-white px-3 py-1 text-xs font-medium text-[#6A6A6A] shadow-sm">
              No signup required • 1 free redesign
            </div>

            <h1 className="mt-5 max-w-[14ch] text-5xl font-semibold leading-[1.02] tracking-[-0.03em] sm:text-6xl">
              Redesign your real room — not a fake AI version.
            </h1>

            <p className="mt-5 max-w-[62ch] text-[17px] leading-7 text-[#6A6A6A]">
              Upload a photo and generate a realistic redesign with AI. 
              Use <span className="font-medium text-[#1F1F1F]">Reality Lock™</span> to preserve your space,
              or push further with <span className="font-medium text-[#1F1F1F]">Creative mode</span>.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/demo"
                className="rounded-2xl bg-[#1F1F1F] px-6 py-3 text-center text-sm font-medium text-white shadow-sm"
              >
                Try your first redesign free
              </Link>
              <Link
                href="/login"
                className="rounded-2xl border border-[#EAEAEA] bg-white px-6 py-3 text-center text-sm font-medium shadow-sm"
              >
                Sign in
              </Link>
            </div>

            <div className="mt-4 text-xs text-[#6A6A6A]">
              No account required for your first generation
            </div>

            {/* VALUE CARDS */}
            <div className="mt-8 grid max-w-[760px] gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-[#EAEAEA] bg-white p-4 shadow-sm">
                <div className="text-sm font-semibold">Keep it real</div>
                <div className="mt-1 text-sm text-[#6A6A6A]">
                  Your actual room stays recognizable — no AI hallucinations.
                </div>
              </div>

              <div className="rounded-2xl border border-[#EAEAEA] bg-white p-4 shadow-sm">
                <div className="text-sm font-semibold">Control the change</div>
                <div className="mt-1 text-sm text-[#6A6A6A]">
                  Dial subtle → bold with precision.
                </div>
              </div>

              <div className="rounded-2xl border border-[#EAEAEA] bg-white p-4 shadow-sm">
                <div className="text-sm font-semibold">Made to share</div>
                <div className="mt-1 text-sm text-[#6A6A6A]">
                  Before & after results designed to go viral.
                </div>
              </div>
            </div>
          </div>

          {/* SIDE PANEL */}
          <div className="rounded-[28px] border border-[#EAEAEA] bg-white p-5 shadow-sm">
            <div className="grid gap-4">
              <div className="rounded-2xl border border-[#EAEAEA] bg-[#FAF9F7] p-4">
                <div className="text-sm font-semibold">What Reality Lock™ protects</div>
                <ul className="mt-3 space-y-2 text-sm text-[#6A6A6A]">
                  <li>Walls, windows, and layout</li>
                  <li>Camera angle + perspective</li>
                  <li>A believable before/after</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-[#EAEAEA] bg-[#FAF9F7] p-4">
                <div className="text-sm font-semibold">Best results</div>
                <ul className="mt-3 space-y-2 text-sm text-[#6A6A6A]">
                  <li>Bright photo</li>
                  <li>Full room view</li>
                  <li>No filters</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto w-full max-w-[1180px] px-6 pb-16">
        <div className="rounded-[28px] border border-[#EAEAEA] bg-[#1F1F1F] px-6 py-10 text-white sm:px-10">
          <h2 className="text-3xl font-semibold">
            Try it once. You’ll get it instantly.
          </h2>

          <p className="mt-3 text-white/70">
            Your first redesign is free — no signup needed.
          </p>

          <div className="mt-6">
            <Link
              href="/demo"
              className="rounded-2xl bg-[#6F8373] px-6 py-3 text-sm font-medium text-white"
            >
              Start free redesign
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}