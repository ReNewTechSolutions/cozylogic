// components/ResultImages.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getSignedUrl } from "@/lib/cozylogic/images";
import {
  STORAGE_BUCKET_INPUTS,
  STORAGE_BUCKET_OUTPUTS,
} from "@/lib/cozylogic/constants";

export default function ResultImages({
  inputPath,
  outputPath,
}: {
  inputPath: string;
  outputPath?: string | null;
}) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [beforeUrl, setBeforeUrl] = useState<string | null>(null);
  const [afterUrl, setAfterUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setBusy(true);
      try {
        const b = await getSignedUrl(supabase, STORAGE_BUCKET_INPUTS, inputPath);
        if (!cancelled) setBeforeUrl(b);

        if (outputPath) {
          const a = await getSignedUrl(supabase, STORAGE_BUCKET_OUTPUTS, outputPath);
          if (!cancelled) setAfterUrl(a);
        } else if (!cancelled) {
          setAfterUrl(null);
        }
      } catch (e) {
        console.error("RESULT signed URL failed", e);
      } finally {
        if (!cancelled) setBusy(false);
      }
    }

    if (inputPath) {
      void run();
    } else {
      setBeforeUrl(null);
      setAfterUrl(null);
      setBusy(false);
    }

    return () => {
      cancelled = true;
    };
  }, [inputPath, outputPath, supabase]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-[#EAEAEA] bg-white p-4 shadow-sm">
        <div className="mb-3 text-sm font-medium">Before</div>
        <div className="relative aspect-[3/2] overflow-hidden rounded-xl bg-[#F2F2F2]">
          {beforeUrl ? (
            <img src={beforeUrl} alt="Before" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full place-items-center text-sm text-[#6A6A6A]">
              {busy ? "Loading…" : "No input image"}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-[#EAEAEA] bg-white p-4 shadow-sm">
        <div className="mb-3 text-sm font-medium">After</div>
        <div className="relative aspect-[3/2] overflow-hidden rounded-xl bg-[#F2F2F2]">
          {afterUrl ? (
            <img src={afterUrl} alt="After" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full place-items-center text-sm text-[#6A6A6A]">
              {busy ? "Loading…" : "No output image yet"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}