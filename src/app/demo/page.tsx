"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DemoPage() {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);

    if (!file) {
      setError("Please upload a photo first.");
      return;
    }

    setBusy(true);

    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch("/api/demo/generate", {
        method: "POST",
        body: form,
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "Failed to generate.");
      }

      const token = json.token;

      if (!token) {
        throw new Error("Missing demo token.");
      }

      router.push(`/demo/result/${token}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FAF9F7] text-[#1F1F1F]">
      <div className="mx-auto max-w-[700px] px-6 py-12">
        <h1 className="text-3xl font-semibold">Try CozyLogic free</h1>
        <p className="mt-2 text-sm text-[#6A6A6A]">
          Upload a photo and generate your first redesign — no signup required.
        </p>

        <div className="mt-8 rounded-2xl border border-[#EAEAEA] bg-white p-6 shadow-sm">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />

          <button
            onClick={onSubmit}
            disabled={busy}
            className="mt-4 w-full rounded-xl bg-[#6F8373] px-4 py-3 text-white"
          >
            {busy ? "Generating…" : "Generate free redesign"}
          </button>

          {error && (
            <div className="mt-4 text-sm text-red-600">{error}</div>
          )}
        </div>
      </div>
    </main>
  );
}