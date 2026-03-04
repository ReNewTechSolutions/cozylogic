// src/app/login/page.tsx
import Image from "next/image";
import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#FAF9F7] text-[#1F1F1F]">
      <div className="mx-auto w-full max-w-[520px] px-6 py-14">
        <div className="mb-6">
          <div className="text-sm tracking-wide text-[#6A6A6A]">CozyLogic</div>
          <h1 className="mt-2 text-3xl font-semibold leading-tight">Sign in</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-[#6A6A6A]">
            Sign in to generate redesigns and view your history.
          </p>
        </div>

        <div className="rounded-2xl border border-[#EAEAEA] bg-white p-6 shadow-sm">
          {/* Replace this block with your actual sign-in UI */}
          <div className="text-sm text-[#6A6A6A]">
            Your sign-in component isn’t wired yet.
          </div>

          <div className="mt-4 rounded-xl border border-[#EAEAEA] bg-[#FAF9F7] px-4 py-3 text-sm">
            Next step: add Supabase email/password sign-in form here.
          </div>
        </div>

        <div className="mt-6 text-sm text-[#6A6A6A]">
          <Link href="/" className="underline">
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}