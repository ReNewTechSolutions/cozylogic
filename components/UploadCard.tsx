// components/UploadCard.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { STORAGE_BUCKET_INPUTS } from "@/lib/cozylogic/constants";
import { readFriendlyApiError } from "@/lib/cozylogic/flowErrors";
import { getSignedUrl } from "@/lib/cozylogic/images";
import { validateImageFileMetadata } from "@/lib/cozylogic/uploads";
import { PRODUCT_EVENTS, trackProductEvent } from "@/lib/cozylogic/productEvents";

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
        const url = await getSignedUrl(supabase, STORAGE_BUCKET_INPUTS, value);
        if (!cancelled) {
          setPreviewUrl(url);
        }
      } catch {
        // Leave the preview unavailable without exposing storage details in the browser console.
      } finally {
        if (!cancelled) {
          setPreviewBusy(false);
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [supabase, value]);

  async function reportUploadStatus(args: {
    requestId: string;
    path: string;
    status: "started" | "succeeded" | "failed";
    errorCode?: string;
    durationMs?: number;
  }) {
    try {
      await fetch("/api/images/upload-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(args),
      });
    } catch {
      // Upload instrumentation is best-effort and must not block a valid user upload.
    }
  }

  const onPick = async (file: File | null) => {
    setErr(null);
    if (!file) return;

    const validation = validateImageFileMetadata(file);
    if (validation.ok === false) {
      trackProductEvent(PRODUCT_EVENTS.uploadFailed, {
        audience: "authenticated",
        stage: "file_validation",
      });
      setErr(validation.message);
      return;
    }

    setBusy(true);
    const requestId = crypto.randomUUID();
    let path = "";
    let uploadFailureReported = false;
    let failureStage = "auth";
    const uploadStartedAt = performance.now();
    trackProductEvent(PRODUCT_EVENTS.uploadStarted, { audience: "authenticated" });
    try {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr) throw new Error("Your sign-in could not be verified. Sign in again and retry.");
      if (!user) {
        throw new Error("Please sign in again.");
      }

      path = `${user.id}/${crypto.randomUUID()}.${validation.extension}`;
      failureStage = "upload_preparation";

      const signedRes = await fetch("/api/images/signed-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId,
          path,
          fileName: file.name,
          fileType: validation.mimeType,
          fileSize: file.size,
        }),
      });

      const signedJson = await signedRes.json().catch(() => ({} as any));

      if (!signedRes.ok) {
        throw new Error(
          readFriendlyApiError(signedJson, "We could not prepare the photo upload. Please try again.")
        );
      }

      const token = signedJson?.token as string | undefined;

      if (!token) {
        throw new Error("The upload setup was incomplete. Please choose the photo again.");
      }

      await reportUploadStatus({ requestId, path, status: "started" });

      failureStage = "storage_upload";
      const { error: uploadErr } = await supabase.storage
        .from(STORAGE_BUCKET_INPUTS)
        .uploadToSignedUrl(path, token, file, {
          contentType: validation.mimeType,
          upsert: false,
        });

      if (uploadErr) {
        uploadFailureReported = true;
        const durationMs = Math.round(performance.now() - uploadStartedAt);
        await reportUploadStatus({
          requestId,
          path,
          status: "failed",
          errorCode: uploadErr.name || "storage_upload_failed",
          durationMs,
        });
        throw new Error("The photo upload did not finish. Check your connection and try again.");
      }

      const durationMs = Math.round(performance.now() - uploadStartedAt);
      await reportUploadStatus({ requestId, path, status: "succeeded", durationMs });
      trackProductEvent(PRODUCT_EVENTS.uploadSucceeded, {
        audience: "authenticated",
      });
      onChange(path);
    } catch (e: any) {
      if (path && !uploadFailureReported) {
        await reportUploadStatus({
          requestId,
          path,
          status: "failed",
          errorCode: "upload_failed",
          durationMs: Math.round(performance.now() - uploadStartedAt),
        });
      }
      trackProductEvent(PRODUCT_EVENTS.uploadFailed, {
        audience: "authenticated",
        stage: failureStage,
      });
      setErr(e?.message ?? "The photo upload did not finish. Please try again.");
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
            Upload a clear photo of your room (JPG/PNG/WebP, max 10 MB). HEIC/HEIF needs to be exported as JPG first.
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
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
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
              <img src={previewUrl} alt="Room preview" className="h-full w-full object-cover" />
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
