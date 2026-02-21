// components/ResultImages.tsx
"use client";

import { useEffect, useState } from "react";
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
  outputPath: string | null;
}) {
  const [beforeUrl, setBeforeUrl] = useState<string | null>(null);
  const [afterUrl, setAfterUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setBusy(true);
      try {
        const b = await getSignedUrl(STORAGE_BUCKET_INPUTS, inputPath);
        if (!cancelled) setBeforeUrl(b);

        if (outputPath) {
          try {
            const a = await getSignedUrl(STORAGE_BUCKET_OUTPUTS, outputPath);
            if (!cancelled) setAfterUrl(a);
          } catch {
            if (!cancelled) setAfterUrl(null);
          }
        } else {
          if (!cancelled) setAfterUrl(null);
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [inputPath, outputPath]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-[#EAEAEA] bg-white p-5 shadow-sm">
        <div className="text-sm font-medium">Before</div>
        <div className="mt-3 aspect-[4/3] w-full overflow-hidden rounded-xl border border-[#EAEAEA] bg-[#FAF9F7]">
          {beforeUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={beforeUrl}
              alt="Before"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-[#6A6A6A]">
              {busy ? "Loading…" : "Preview unavailable"}
            </div>
          )}
        </div>
        <div className="mt-3 text-xs text-[#6A6A6A]">Source: your uploaded image</div>
      </div>

      <div className="rounded-2xl border border-[#EAEAEA] bg-white p-5 shadow-sm">
        <div className="text-sm font-medium">After</div>
        <div className="mt-3 aspect-[4/3] w-full overflow-hidden rounded-xl border border-[#EAEAEA] bg-[#FAF9F7]">
          {afterUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={afterUrl}
              alt="After"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-[#6A6A6A]">
              {outputPath ? (busy ? "Loading…" : "Generated preview not available yet") : "—"}
            </div>
          )}
        </div>
        <div className="mt-3 text-xs text-[#6A6A6A]">
          {afterUrl ? "Generated image" : "Generated image (storage wired next)"}
        </div>
      </div>
    </div>
  );
}