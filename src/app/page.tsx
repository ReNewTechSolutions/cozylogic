import Link from "next/link";

const FEATURES = [
  {
    title: "Precision Mode",
    body: "Preserves walls, windows, doors, flooring, and camera angle as closely as possible for realistic redesigns.",
  },
  {
    title: "Creative Mode",
    body: "Allows more dramatic transformation for inspiration, concepting, and stronger style exploration.",
  },
  {
    title: "Rearrange-Only Option",
    body: "Keeps your existing furniture and focuses on layout, flow, tidying, and staging improvements.",
  },
];

const STEPS = [
  {
    step: "01",
    title: "Upload your room",
    body: "Use a bright, clear photo from a corner or doorway so the room layout is easy to interpret.",
  },
  {
    step: "02",
    title: "Pick your style",
    body: "Choose the goal, style direction, mode, and intensity that best fits the look you want.",
  },
  {
    step: "03",
    title: "Generate the redesign",
    body: "CozyLogic creates a realistic before-and-after concept while trying to keep your room true to life.",
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
              AI room redesigns that keep your room real
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
              Try CozyLogic
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1180px] px-6 py-16 sm:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="inline-flex rounded-full border border-[#EAEAEA] bg-white px-3 py-1 text-xs font-medium text-[#6A6A6A] shadow-sm">
              Precision mode + creative mode
            </div>

            <h1 className="mt-5 max-w-[13ch] text-5xl font-semibold leading-[1.02] tracking-[-0.03em] sm:text-6xl">
              Redesign your room with AI.
            </h1>

            <p className="mt-5 max-w-[60ch] text-[17px] leading-7 text-[#6A6A6A]">
              Upload a photo, choose a style, and generate a realistic concept for your space.
              Use <span className="font-medium text-[#1F1F1F]">Precision Mode</span> when you
              want to preserve the room as it is, or{" "}
              <span className="font-medium text-[#1F1F1F]">Creative Mode</span> when you want
              bigger visual changes.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/app/new"
                className="rounded-2xl bg-[#1F1F1F] px-5 py-3 text-center text-sm font-medium text-white shadow-sm"
              >
                Generate your first redesign
              </Link>
              <Link
                href="/login"
                className="rounded-2xl border border-[#EAEAEA] bg-white px-5 py-3 text-center text-sm font-medium shadow-sm"
              >
                Open dashboard
              </Link>
            </div>

            <div className="mt-8 grid max-w-[700px] gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-[#EAEAEA] bg-white p-4 shadow-sm">
                <div className="text-sm font-semibold">Keep it realistic</div>
                <div className="mt-1 text-sm leading-6 text-[#6A6A6A]">
                  Designed for same-room concepts, not random fantasy outputs.
                </div>
              </div>
              <div className="rounded-2xl border border-[#EAEAEA] bg-white p-4 shadow-sm">
                <div className="text-sm font-semibold">Rearrange or redesign</div>
                <div className="mt-1 text-sm leading-6 text-[#6A6A6A]">
                  Choose subtle staging or stronger transformations.
                </div>
              </div>
              <div className="rounded-2xl border border-[#EAEAEA] bg-white p-4 shadow-sm">
                <div className="text-sm font-semibold">Built for real homes</div>
                <div className="mt-1 text-sm leading-6 text-[#6A6A6A]">
                  Messy rooms are okay. The system can tidy conceptually before styling.
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-[#EAEAEA] bg-white p-5 shadow-sm">
            <div className="grid gap-4">
              <div className="rounded-2xl border border-[#EAEAEA] bg-[#FAF9F7] p-4">
                <div className="text-sm font-semibold">What CozyLogic preserves</div>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-[#6A6A6A]">
                  <li>Walls, windows, doors, and flooring whenever possible</li>
                  <li>Original room perspective and camera angle</li>
                  <li>Real-world styling direction instead of generic filters</li>
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
                  Small decor details can still shift slightly. CozyLogic is optimized to keep the
                  redesign grounded in your actual room while delivering a stronger visual upgrade.
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
              Why it feels different
            </div>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">
              Built around controlled transformations
            </h2>
            <p className="mt-4 text-[16px] leading-7 text-[#6A6A6A]">
              Most AI room tools chase big visual changes. CozyLogic is designed to give you a more
              believable before-and-after by letting you choose how tightly the output should follow
              the original room.
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
              From photo to polished concept in three steps
            </h2>
            <p className="mt-4 max-w-[52ch] text-[16px] leading-7 text-[#6A6A6A]">
              CozyLogic is designed to feel fast and visual. Upload your room, pick a direction,
              and generate a concept that feels closer to a realistic redesign than a generic style
              filter.
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
          <div className="max-w-[760px]">
            <div className="text-sm font-medium tracking-wide text-[#6A6A6A]">Style directions</div>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">
              Choose the look that fits your space
            </h2>
          </div>

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
      </section>

      <section className="mx-auto w-full max-w-[1180px] px-6 py-16">
        <div className="rounded-[28px] border border-[#EAEAEA] bg-[#1F1F1F] px-6 py-10 text-white sm:px-10">
          <div className="max-w-[760px]">
            <div className="text-sm font-medium tracking-wide text-white/70">Ready to try it?</div>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">
              Turn your current room into a cleaner, calmer, more intentional space.
            </h2>
            <p className="mt-4 text-[16px] leading-7 text-white/75">
              Start with Precision Mode for realistic redesigns, or switch to Creative Mode when you
              want stronger visual transformation.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/app/new"
                className="rounded-2xl bg-[#6F8373] px-5 py-3 text-center text-sm font-medium text-white shadow-sm"
              >
                Start redesigning
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
            <Link href="/app/new">Try CozyLogic</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}