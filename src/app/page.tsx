// src/app/page.tsx
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#FAF9F7] text-[#1F1F1F]">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm tracking-wide text-[#6A6A6A]">CozyLogic</div>
          <Link
            href="/app"
            className="rounded-xl border border-[#EAEAEA] bg-white px-4 py-2 text-sm font-medium shadow-sm"
          >
            Open app
          </Link>
        </div>

        <h1 className="mt-10 text-5xl font-semibold leading-[1.05]">
          Redesign your room with AI.
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-[#6A6A6A]">
          Upload a photo, pick a style, and get a realistic “after” image — with tidy + rearrange
          options.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/app/new"
            className="rounded-xl bg-[#1F1F1F] px-5 py-3 text-sm font-medium text-white shadow-sm"
          >
            Start a redesign
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-[#EAEAEA] bg-white px-5 py-3 text-sm font-medium shadow-sm"
          >
            Sign in
          </Link>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { title: "Tidy first", sub: "A clean baseline before the redesign pass." },
            { title: "Rearrange-only", sub: "Same furniture — better flow and calm." },
            { title: "Full redesign", sub: "New style identity with upgraded pieces." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-[#EAEAEA] bg-white p-5 shadow-sm">
              <div className="text-sm font-semibold">{f.title}</div>
              <div className="mt-1 text-sm text-[#6A6A6A]">{f.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}