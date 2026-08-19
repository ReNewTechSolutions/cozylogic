import Link from "next/link";

export default function MarketingHomePage() {
  return (
    <main className="min-h-screen bg-[#F7EFE3] text-[#1F1F1F]">
      {/* NAV */}
      <section className="border-b border-[#D8C7AE] bg-[#FFF8EA]/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1180px] items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-[#1F1F1F] px-3 py-1.5 text-sm font-semibold text-white">
              CozyLogic
            </div>
            <div className="hidden text-sm text-[#6A5A49] sm:block">
              Room mission boards before the heavy lifting
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg border border-[#D8C7AE] bg-[#FFFDF7] px-4 py-2 text-sm font-medium shadow-sm"
            >
              Sign in
            </Link>
            <Link
              href="/demo"
              className="rounded-lg bg-[#6F8373] px-4 py-2 text-sm font-medium text-white shadow-sm"
            >
              Try free
            </Link>
          </div>
        </div>
      </section>

      {/* HERO */}
      <section className="mx-auto w-full max-w-[1180px] px-6 py-16 sm:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-[1.08fr_0.92fr]">
          <div>
            <div className="inline-flex rotate-[-1deg] rounded-lg border border-[#DFC588] bg-[#F7E3A6] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#5F4A2E] shadow-sm">
              room mission no. 01
            </div>

            <h1 className="mt-5 max-w-[16ch] text-5xl font-semibold leading-[1.02] tracking-[-0.03em] sm:text-6xl">
              Before you move all your furniture around, try it in CozyLogic first.
            </h1>

            <p className="mt-5 max-w-[62ch] text-[17px] leading-7 text-[#6A5A49]">
              Upload a room photo and preview a practical refresh before you start dragging the couch.
              CozyLogic keeps your layout realistic, helps you use what you already have, and only suggests
              small upgrades if you want them.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/demo"
                className="rounded-lg bg-[#1F1F1F] px-6 py-3 text-center text-sm font-medium text-white shadow-sm"
              >
                Try a free room preview
              </Link>
              <Link
                href="/login"
                className="rounded-lg border border-[#D8C7AE] bg-[#FFFDF7] px-6 py-3 text-center text-sm font-medium shadow-sm"
              >
                Sign in
              </Link>
            </div>

            <div className="mt-4 text-xs text-[#6A5A49]">
              No account required for your first preview
            </div>

            {/* VALUE CARDS */}
            <div className="mt-8 grid max-w-[760px] gap-3 sm:grid-cols-3">
              <div className="relative rounded-lg border border-[#D8C7AE] bg-[#FFFDF7] p-4 shadow-sm">
                <span aria-hidden="true" className="absolute -top-2 left-5 h-4 w-14 rotate-[-4deg] bg-[#E8D8BC]/80" />
                <div className="text-sm font-semibold">Try before lifting</div>
                <div className="mt-1 text-sm text-[#6A5A49]">
                  See a room refresh before moving furniture across the floor.
                </div>
              </div>

              <div className="relative rounded-lg border border-[#D8C7AE] bg-[#FFFDF7] p-4 shadow-sm sm:translate-y-3">
                <span aria-hidden="true" className="absolute -top-2 left-5 h-4 w-14 rotate-[3deg] bg-[#E8D8BC]/80" />
                <div className="text-sm font-semibold">Use what you have</div>
                <div className="mt-1 text-sm text-[#6A5A49]">
                  Start with your existing layout, furniture, and cozy little wins.
                </div>
              </div>

              <div className="relative rounded-lg border border-[#D8C7AE] bg-[#FFFDF7] p-4 shadow-sm">
                <span aria-hidden="true" className="absolute -top-2 left-5 h-4 w-14 rotate-[-2deg] bg-[#E8D8BC]/80" />
                <div className="text-sm font-semibold">Spend only if wanted</div>
                <div className="mt-1 text-sm text-[#6A5A49]">
                  Keep it no-spend or add a few small upgrades when they help.
                </div>
              </div>
            </div>
          </div>

          {/* SIDE PANEL */}
          <div className="relative rounded-lg border border-[#D8C7AE] bg-[#FFF8EA] p-5 shadow-[0_22px_60px_rgba(68,52,37,0.12)]">
            <span aria-hidden="true" className="absolute -top-3 left-10 h-7 w-28 rotate-[-4deg] bg-[#E8D8BC]/90 shadow-sm" />
            <div className="grid gap-4">
              <div className="relative rounded-lg border border-[#D8C7AE] bg-[#FFFDF7] p-4">
                <div className="mb-3 inline-flex rounded-lg border border-[#DFC588] bg-[#F7E3A6] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5F4A2E]">
                  before
                </div>
                <div className="aspect-[4/3] rounded-lg border border-dashed border-[#C9B696] bg-[#F7EFE3] p-4">
                  <div className="grid h-full place-items-center text-center text-sm font-medium text-[#6A5A49]">
                    your real room photo
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-[#D8C7AE] bg-[#FFFDF7] p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7C6247]">
                  mission board rules
                </div>
                <ul className="mt-3 space-y-2 text-sm text-[#6A5A49]">
                  <li>Keep the same camera angle</li>
                  <li>Try what you own first</li>
                  <li>Add optional buys later</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto w-full max-w-[1180px] px-6 pb-16">
        <div className="relative rounded-lg border border-[#2D2822] bg-[#1F1F1F] px-6 py-10 text-white shadow-[0_22px_60px_rgba(31,31,31,0.18)] sm:px-10">
          <span aria-hidden="true" className="absolute -top-3 left-8 h-7 w-28 rotate-[-3deg] bg-[#E8D8BC]/70" />
          <h2 className="text-3xl font-semibold">
            Test the idea before you move the furniture.
          </h2>

          <p className="mt-3 text-white/70">
            Your first room preview is free — no signup needed.
          </p>

          <div className="mt-6">
            <Link
              href="/demo"
              className="rounded-lg bg-[#6F8373] px-6 py-3 text-sm font-medium text-white"
            >
              Try a free room preview
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
