// src/app/login/page.tsx
"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

function LoginPageInner() {
  const searchParams = useSearchParams();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const next = searchParams.get("next") || "/app";

  const onMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });

      if (error) throw error;

      setNotice("Magic link sent. Check your email and use the link on this device/browser.");
    } catch (e: any) {
      setError(e?.message ?? "Could not send magic link.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FAF9F7] text-[#1F1F1F]">
      <div className="mx-auto w-full max-w-[560px] px-6 py-14">
        <div className="mb-6">
          <div className="text-sm tracking-wide text-[#6A6A6A]">CozyLogic</div>
          <h1 className="mt-2 text-3xl font-semibold leading-tight">Sign in</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-[#6A6A6A]">
            Enter your email and we&apos;ll send you a secure sign-in link.
          </p>
        </div>

        <div className="rounded-2xl border border-[#EAEAEA] bg-white p-6 shadow-sm">
          <form onSubmit={onMagicLink} className="space-y-4">
            <div>
              <label htmlFor="email" className="text-sm text-[#6A6A6A]">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1 w-full rounded-xl border border-[#EAEAEA] bg-white px-4 py-3 text-[15px] outline-none focus:border-[#6F8373]"
                required
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-[#6F8373] px-4 py-3 text-sm font-medium text-white shadow-sm disabled:opacity-60"
            >
              {busy ? "Sending link…" : "Send magic link"}
            </button>
          </form>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {notice && (
            <div className="mt-4 rounded-xl border border-[#EAEAEA] bg-[#FAF9F7] px-4 py-3 text-sm text-[#1F1F1F]">
              {notice}
            </div>
          )}

          <div className="mt-5 rounded-xl border border-[#EAEAEA] bg-[#FAF9F7] px-4 py-3 text-sm text-[#6A6A6A]">
            New users can use the same form. Supabase will handle sign-in / sign-up through the email link.
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between text-sm text-[#6A6A6A]">
          <Link href="/" className="underline">
            Back to home
          </Link>
          <Link href="/app/new" className="underline">
            Try the app
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAF9F7]" />}>
      <LoginPageInner />
    </Suspense>
  );
}