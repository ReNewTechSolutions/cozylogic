// src/app/login/page.tsx
"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type AuthView = "signin" | "signup";
type AuthMode = "password" | "magic";

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [view, setView] = useState<AuthView>("signin");
  const [mode, setMode] = useState<AuthMode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const next = searchParams.get("next") || "/app";

  const onPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      if (view === "signup") {
        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters.");
        }
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match.");
        }

        const origin =
          typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${origin}/auth/callback`,
          },
        });

        if (error) throw error;

        setNotice(
          "Account created. If email confirmation is enabled, check your inbox. Otherwise you can sign in now."
        );
        setView("signin");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      router.replace(next);
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? "Could not complete authentication.");
    } finally {
      setBusy(false);
    }
  };

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
          emailRedirectTo: `${origin}/auth/callback`,
        },
      });

      if (error) throw error;

      setNotice(
        view === "signup"
          ? "Magic link sent. Check your email to finish creating your account."
          : "Magic link sent. Check your email and come right back."
      );
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
          <h1 className="mt-2 text-3xl font-semibold leading-tight">
            {view === "signin" ? "Sign in" : "Create your account"}
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-[#6A6A6A]">
            {view === "signin"
              ? "Sign in to generate redesigns, save ideas, and view your room history."
              : "Create an account to start redesigning your room with Reality Lock™."}
          </p>
        </div>

        <div className="rounded-2xl border border-[#EAEAEA] bg-white p-6 shadow-sm">
          <div className="mb-5 flex rounded-xl border border-[#EAEAEA] bg-[#FAF9F7] p-1">
            <button
              type="button"
              onClick={() => {
                setView("signin");
                setError(null);
                setNotice(null);
              }}
              className={[
                "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition",
                view === "signin" ? "bg-[#1F1F1F] text-white" : "text-[#1F1F1F]",
              ].join(" ")}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => {
                setView("signup");
                setError(null);
                setNotice(null);
              }}
              className={[
                "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition",
                view === "signup" ? "bg-[#1F1F1F] text-white" : "text-[#1F1F1F]",
              ].join(" ")}
            >
              Sign up
            </button>
          </div>

          <div className="mb-5 flex rounded-xl border border-[#EAEAEA] bg-[#FAF9F7] p-1">
            <button
              type="button"
              onClick={() => setMode("password")}
              className={[
                "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition",
                mode === "password" ? "bg-[#1F1F1F] text-white" : "text-[#1F1F1F]",
              ].join(" ")}
            >
              Email + password
            </button>
            <button
              type="button"
              onClick={() => setMode("magic")}
              className={[
                "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition",
                mode === "magic" ? "bg-[#1F1F1F] text-white" : "text-[#1F1F1F]",
              ].join(" ")}
            >
              Magic link
            </button>
          </div>

          <form onSubmit={mode === "password" ? onPasswordSubmit : onMagicLink} className="space-y-4">
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

            {mode === "password" && (
              <>
                <div>
                  <label htmlFor="password" className="text-sm text-[#6A6A6A]">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    autoComplete={view === "signin" ? "current-password" : "new-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={view === "signin" ? "Your password" : "Create a password"}
                    className="mt-1 w-full rounded-xl border border-[#EAEAEA] bg-white px-4 py-3 text-[15px] outline-none focus:border-[#6F8373]"
                    required
                  />
                </div>

                {view === "signup" && (
                  <div>
                    <label htmlFor="confirmPassword" className="text-sm text-[#6A6A6A]">
                      Confirm password
                    </label>
                    <input
                      id="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      className="mt-1 w-full rounded-xl border border-[#EAEAEA] bg-white px-4 py-3 text-[15px] outline-none focus:border-[#6F8373]"
                      required
                    />
                  </div>
                )}
              </>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-[#6F8373] px-4 py-3 text-sm font-medium text-white shadow-sm disabled:opacity-60"
            >
              {busy
                ? mode === "password"
                  ? view === "signin"
                    ? "Signing in…"
                    : "Creating account…"
                  : "Sending link…"
                : mode === "password"
                  ? view === "signin"
                    ? "Sign in"
                    : "Create account"
                  : view === "signin"
                    ? "Send magic link"
                    : "Send sign-up link"}
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
            {mode === "password"
              ? view === "signin"
                ? "Use your existing email and password to sign in."
                : "Create an account with email and password, or switch to magic link for a faster setup."
              : "We’ll email you a sign-in link. Make sure your Supabase redirect URLs include /auth/callback."}
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