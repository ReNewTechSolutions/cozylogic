// app/(public)/login/page.tsx
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type Mode = "signin" | "signup";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const redirectedFrom = params.get("redirectedFrom");
  const confirmFailed = params.get("error") === "confirm_failed";

  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  // If the user is already logged in, send them into the app.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!cancelled && data.session) {
        router.replace(redirectedFrom || "/app");
        router.refresh();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase, router, redirectedFrom]);

  const confirmUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback`;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setOkMsg(null);
    setBusy(true);

    try {
      const cleanEmail = email.trim().toLowerCase();

      if (!cleanEmail || !password) {
        setError("Enter your email and password.");
        return;
      }

      if (mode === "signin") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (signInError) throw signInError;

        router.replace(redirectedFrom || "/app");
        router.refresh();
        return;
      }

      // SIGN UP: do NOT redirect into /app.
      // If email confirmations are enabled, user must confirm first.
      const { error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signUpError) throw signUpError;

      setOkMsg(
        "Check your email to confirm your account. After you click the confirmation link, you’ll land back in CozyLogic."
      );
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FAF9F7] text-[#1F1F1F]">
      <div className="mx-auto flex min-h-screen w-full max-w-[520px] flex-col justify-center px-6">
        <div className="mb-8">
          <div className="text-sm tracking-wide text-[#6A6A6A]">CozyLogic</div>
          <h1 className="mt-2 text-3xl font-semibold leading-tight">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-[#6A6A6A]">
            {mode === "signin"
              ? "Sign in to redesign your space with calm, budget-aware guidance."
              : "Create an account, confirm your email, then start your first redesign."}
          </p>
        </div>

        {confirmFailed ? (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <div className="font-medium">Email confirmation didn’t complete.</div>
            <div className="mt-1 text-amber-800">
              Try clicking the confirmation link again. If the button inside your email
              doesn’t open correctly, copy the full link and paste it into your browser.
            </div>
          </div>
        ) : null}

        <div className="rounded-2xl border border-[#EAEAEA] bg-white p-6 shadow-sm">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-[#6A6A6A]">Email</label>
              <input
                className="mt-1 w-full rounded-xl border border-[#EAEAEA] bg-white px-4 py-3 text-[15px] outline-none focus:border-[#6F8373]"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                autoComplete="email"
                inputMode="email"
              />
            </div>

            <div>
              <label className="text-sm text-[#6A6A6A]">Password</label>
              <input
                className="mt-1 w-full rounded-xl border border-[#EAEAEA] bg-white px-4 py-3 text-[15px] outline-none focus:border-[#6F8373]"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                type="password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {okMsg && (
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                {okMsg}
                {mode === "signup" ? (
                  <div className="mt-2 text-xs text-green-800">
                    If the confirmation link doesn’t open correctly, paste this into your
                    browser after signing in:
                    <div className="mt-1 select-all rounded-lg border border-green-200 bg-white px-2 py-1 font-mono text-[11px]">
                      {confirmUrl}
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-[#6F8373] px-4 py-3 text-sm font-medium text-white shadow-sm disabled:opacity-60"
            >
              {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>

            <div className="flex items-center justify-between pt-2 text-sm text-[#6A6A6A]">
              <span>{mode === "signin" ? "New here?" : "Already have an account?"}</span>
              <button
                type="button"
                className="font-medium text-[#1F1F1F] underline underline-offset-4"
                onClick={() => {
                  setError(null);
                  setOkMsg(null);
                  setMode(mode === "signin" ? "signup" : "signin");
                }}
              >
                {mode === "signin" ? "Create account" : "Sign in"}
              </button>
            </div>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-[#6A6A6A]">
          By continuing, you agree to CozyLogic’s terms and privacy policy.
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAF9F7]" />}>
      <LoginInner />
    </Suspense>
  );
}