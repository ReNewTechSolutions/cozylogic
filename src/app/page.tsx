import Link from "next/link";

const FEATURES = [
  {
    title: "Reality Lock™",
    body: "Preserves walls, windows, doors, flooring, and camera angle as closely as possible so your room still feels like your room.",
  },
  {
    title: "Precision + Creative Modes",
    body: "Choose tightly controlled redesigns or stronger visual transformations depending on how bold you want to go.",
  },
  {
    title: "Share-Ready Before / After",
    body: "CozyLogic is built to become a naturally shareable before-and-after experience across Pinterest, Instagram, and Reddit.",
  },
];

const STEPS = [
  {
    step: "01",
    title: "Upload your room",
    body: "Start with a bright, clear photo from a doorway or corner so the room structure reads well.",
  },
  {
    step: "02",
    title: "Choose mode + strength",
    body: "Use Reality Lock™ for the tightest preservation, Precision for realistic redesign, or Creative for bigger visual change.",
  },
  {
    step: "03",
    title: "Generate + share",
    body: "Get a realistic before-and-after concept, then save or share it as a visual reveal.",
  },
];

const STYLES = [
  "Modern Minimal",
  "Cozy Neutral",
  "Scandinavian",
  "Japandi",
  "Soft Boho",
  "Clean Traditional",
];

const SHARE_ITEMS = [
  { title: "Pinterest", body: "Perfect for before/after interiors and inspiration boards." },
  { title: "Instagram", body: "Turn every redesign into a visual post or story." },
  { title: "Reddit", body: "Great for feedback, reveals, and viral room transformations." },
];

export default function MarketingHomePage() {
  return (
    <main className="min-h-screen bg-[#FAF9F7] text-[#1F1F1F]">
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
              href="/app/new"
              className="rounded-xl bg-[#6F8373] px-4 py-2 text-sm font-medium text-white shadow-sm"
            >
              Redesign My Room
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1180px] px-6 py-16 sm:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-[1.08fr_0.92fr]">
          <div>
            <div className="inline-flex rounded-full border border-[#EAEAEA] bg-white px-3 py-1 text-xs font-medium text-[#6A6A6A] shadow-sm">
              Reality Lock™ • Precision • Creative
            </div>

            <h1 className="mt-5 max-w-[12ch] text-5xl font-semibold leading-[1.02] tracking-[-0.03em] sm:text-6xl">
              Redesign your real room — not a fantasy version of it.
            </h1>

            <p className="mt-5 max-w-[62ch] text-[17px] leading-7 text-[#6A6A6A]">
              Upload a photo of your space and generate a realistic redesign with AI. Use{" "}
              <span className="font-medium text-[#1F1F1F]">Reality Lock™</span> when you want to
              preserve the real structure of the room,{" "}
              <span className="font-medium text-[#1F1F1F]">Precision</span> for controlled
              redesigns, or <span className="font-medium text-[#1F1F1F]">Creative</span> when you
              want a bigger visual leap.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/app/new"
                className="rounded-2xl bg-[#1F1F1F] px-5 py-3 text-center text-sm font-medium text-white shadow-sm"
              >
                Redesign My Room
              </Link>
              <Link
                href="/login"
                className="rounded-2xl border border-[#EAEAEA] bg-white px-5 py-3 text-center text-sm font-medium shadow-sm"
              >
                Sign in
              </Link>
            </div>

            <div className="mt-8 grid max-w-[760px] gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-[#EAEAEA] bg-white p-4 shadow-sm">
                <div className="text-sm font-semibold">Keep it recognizable</div>
                <div className="mt-1 text-sm leading-6 text-[#6A6A6A]">
                  CozyLogic is built to keep your actual room readable instead of generating random AI fantasy decor.
                </div>
              </div>
              <div className="rounded-2xl border border-[#EAEAEA] bg-white p-4 shadow-sm">
                <div className="text-sm font-semibold">Dial the transformation</div>
                <div className="mt-1 text-sm leading-6 text-[#6A6A6A]">
                  Go subtle, balanced, or bold with a clear strength control.
                </div>
              </div>
              <div className="rounded-2xl border border-[#EAEAEA] bg-white p-4 shadow-sm">
                <div className="text-sm font-semibold">Built to be shared</div>
                <div className="mt-1 text-sm leading-6 text-[#6A6A6A]">
                  Create reveal-worthy before-and-after concepts designed to be saved and shared.
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-[#EAEAEA] bg-white p-5 shadow-sm">
            <div className="grid gap-4">
              <div className="rounded-2xl border border-[#EAEAEA] bg-[#FAF9F7] p-4">
                <div className="text-sm font-semibold">What Reality Lock™ protects</div>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-[#6A6A6A]">
                  <li>Walls, windows, doors, and floor layout whenever possible</li>
                  <li>Original room perspective and camera angle</li>
                  <li>A believable before-and-after relationship</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-[#EAEAEA] bg-[#FAF9F7] p-4">
                <div className="text-sm font-semibold">Best photo tips</div>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-[#6A6A6A]">
                  <li>Use a bright, level photo</li>
                  <li>Show the full room from a doorway or corner</li>
                  <li>Avoid blur, filters, and extreme wide-angle distortion</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-[#EAEAEA] bg-[#FAF9F7] p-4">
                <div className="text-sm font-semibold">Good to know</div>
                <p className="mt-3 text-sm leading-6 text-[#6A6A6A]">
                  Small decor details can still shift slightly. CozyLogic is designed to keep the
                  redesign grounded in your actual room while making the result feel stronger,
                  cleaner, and more intentional.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#EAEAEA] bg-white">
        <div className="mx-auto w-full max-w-[1180px] px-6 py-16">
          <div className="max-w-[760px]">
            <div className="text-sm font-medium tracking-wide text-[#6A6A6A]">
              Why CozyLogic feels different
            </div>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">
              Most tools apply style filters. CozyLogic uses controlled transformations.
            </h2>
            <p className="mt-4 text-[16px] leading-7 text-[#6A6A6A]">
              CozyLogic is built around room preservation, transformation control, and realistic
              redesign logic. That means your room can evolve without losing its identity.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {FEATURES.map((item) => (
              <div key={item.title} className="rounded-2xl border border-[#EAEAEA] bg-[#FAF9F7] p-5">
                <div className="text-base font-semibold">{item.title}</div>
                <p className="mt-2 text-sm leading-6 text-[#6A6A6A]">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1180px] px-6 py-16">
        <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <div className="text-sm font-medium tracking-wide text-[#6A6A6A]">How it works</div>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">
              From upload to share-worthy reveal in three steps
            </h2>
            <p className="mt-4 max-w-[52ch] text-[16px] leading-7 text-[#6A6A6A]">
              Upload your room, choose how tightly the redesign should respect the original space,
              and generate a visual concept that feels far more grounded than a generic AI filter.
            </p>
          </div>

          <div className="grid gap-4">
            {STEPS.map((item) => (
              <div
                key={item.step}
                className="flex gap-4 rounded-2xl border border-[#EAEAEA] bg-white p-5 shadow-sm"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1F1F1F] text-sm font-semibold text-white">
                  {item.step}
                </div>
                <div>
                  <div className="text-base font-semibold">{item.title}</div>
                  <p className="mt-1 text-sm leading-6 text-[#6A6A6A]">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[#EAEAEA] bg-white">
        <div className="mx-auto w-full max-w-[1180px] px-6 py-16">
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <div className="text-sm font-medium tracking-wide text-[#6A6A6A]">Style directions</div>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">
                Choose a look that fits your room
              </h2>

              <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {STYLES.map((style) => (
                  <div
                    key={style}
                    className="rounded-2xl border border-[#EAEAEA] bg-[#FAF9F7] px-4 py-4 text-sm font-medium"
                  >
                    {style}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium tracking-wide text-[#6A6A6A]">Built to be shared</div>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">
                Turn every redesign into a share card
              </h2>
              <p className="mt-4 text-[16px] leading-7 text-[#6A6A6A]">
                CozyLogic is a natural before-and-after product. Save, post, pin, and share your
                reveals across the platforms people already use for interior inspiration.
              </p>

              <div className="mt-8 grid gap-3">
                {SHARE_ITEMS.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-[#EAEAEA] bg-[#FAF9F7] p-4"
                  >
                    <div className="text-sm font-semibold">{item.title}</div>
                    <div className="mt-1 text-sm leading-6 text-[#6A6A6A]">{item.body}</div>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="rounded-xl border border-[#EAEAEA] bg-white px-4 py-2 text-sm font-medium shadow-sm"
                >
                  Share on Pinterest
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-[#EAEAEA] bg-white px-4 py-2 text-sm font-medium shadow-sm"
                >
                  Share on Instagram
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-[#EAEAEA] bg-white px-4 py-2 text-sm font-medium shadow-sm"
                >
                  Share on Reddit
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1180px] px-6 py-16">
        <div className="rounded-[28px] border border-[#EAEAEA] bg-[#1F1F1F] px-6 py-10 text-white sm:px-10">
          <div className="max-w-[800px]">
            <div className="text-sm font-medium tracking-wide text-white/70">Ready to try it?</div>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">
              Start with Reality Lock™ and generate a room you’ll actually want to share.
            </h2>
            <p className="mt-4 text-[16px] leading-7 text-white/75">
              CozyLogic starts with realistic redesigns and controlled transformations — built to
              make your room feel elevated without losing what makes it real.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/app/new"
                className="rounded-2xl bg-[#6F8373] px-5 py-3 text-center text-sm font-medium text-white shadow-sm"
              >
                Redesign My Room
              </Link>
              <Link
                href="/login"
                className="rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-center text-sm font-medium text-white"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#EAEAEA] bg-white">
        <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4 px-6 py-8 text-sm text-[#6A6A6A] sm:flex-row sm:items-center sm:justify-between">
          <div>© {new Date().getFullYear()} CozyLogic</div>
          <div className="flex items-center gap-5">
            <Link href="/login">Sign in</Link>
            <Link href="/app">Dashboard</Link>
            <Link href="/app/new">Redesign My Room</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}