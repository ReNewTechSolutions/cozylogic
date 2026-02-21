// components/UploadCard.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { STORAGE_BUCKET_INPUTS } from "@/lib/cozylogic/constants";
import { getSignedUrl } from "@/lib/cozylogic/images";

function extFromName(name: string) {
  const parts = name.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "jpg";
}

function safeExt(ext: string) {
  if (ext === "png") return "png";
  if (ext === "webp") return "webp";
  return "jpg";
}

export default function UploadCard({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (path: string | null) => void;
}) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setPreviewUrl(null);
      if (!value) return;

      setPreviewBusy(true);
      try {
        const url = await getSignedUrl(STORAGE_BUCKET_INPUTS, value);
        if (!cancelled) setPreviewUrl(url);
      } catch {
        // non-fatal; user can still continue
      } finally {
        if (!cancelled) setPreviewBusy(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [value]);

  const onPick = async (file: File | null) => {
    setErr(null);
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setErr("Please upload a JPG, PNG, or WebP image.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErr("Max file size is 10MB.");
      return;
    }

    setBusy(true);
    try {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr) throw userErr;
      if (!user) {
        setErr("Please sign in again.");
        return;
      }

      // RLS requires: `${auth.uid()}/...`
      const ext = safeExt(extFromName(file.name));
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from(STORAGE_BUCKET_INPUTS)
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || "image/jpeg",
        });

      if (uploadErr) throw uploadErr;

      onChange(path);
    } catch (e: any) {
      setErr(e?.message ?? "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[#EAEAEA] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-medium">Room photo</div>
          <div className="mt-1 text-xs text-[#6A6A6A]">
            Upload a clear photo of your room (JPG/PNG/WebP, max 10MB).
          </div>
        </div>

        {value ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="rounded-xl border border-[#EAEAEA] bg-white px-3 py-2 text-xs font-medium shadow-sm"
          >
            Remove
          </button>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={busy}
            onChange={(e) => onPick(e.target.files?.[0] ?? null)}
          />

          <div
            className={[
              "flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center",
              value ? "border-[#6F8373] bg-[#FAF9F7]" : "border-[#EAEAEA] bg-white",
              busy ? "opacity-60" : "",
            ].join(" ")}
          >
            <div className="text-sm font-medium">
              {busy ? "Uploading…" : value ? "Photo uploaded" : "Click to upload"}
            </div>
            <div className="mt-1 text-xs text-[#6A6A6A]">
              {value ? "Preview loads on the right." : "Natural light works best."}
            </div>
          </div>
        </label>

        <div className="rounded-2xl border border-[#EAEAEA] bg-[#FAF9F7] p-3">
          <div className="text-xs font-medium text-[#6A6A6A]">Preview</div>
          <div className="mt-2 aspect-[4/3] w-full overflow-hidden rounded-xl border border-[#EAEAEA] bg-white">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Room preview"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-[#6A6A6A]">
                {value ? (previewBusy ? "Loading…" : "Preview unavailable") : "—"}
              </div>
            )}
          </div>
        </div>
      </div>

      {err && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      )}
    </div>
  );
}