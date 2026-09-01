"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BUDGET_PREVIEW_SETTINGS,
  BUDGET_TIERS,
  DEFAULT_BUDGET_TIER,
  GOALS,
  ROOM_LABELS,
  ROOM_TYPES,
  STYLE_CHOICES,
  STYLES,
  STORAGE_BUCKET_INPUTS,
} from "@/lib/cozylogic/constants";
import BudgetSelect from "@/components/BudgetSelect";
import StyleTile from "@/components/StyleTile";
import { readFriendlyApiError } from "@/lib/cozylogic/flowErrors";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { validateImageFileMetadata } from "@/lib/cozylogic/uploads";
import ProductEventOnMount from "@/components/ProductEventOnMount";
import { PRODUCT_EVENTS, trackProductEvent } from "@/lib/cozylogic/productEvents";

type PreparedUpload = {
  requestId: string;
  uploadId: string;
  path: string;
  token: string;
  sessionToken: string;
};

const DEFAULT_GOAL = "refresh_budget" as (typeof GOALS)[number];

export default function DemoPage() {
  const router = useRouter();
  const submitRef = useRef(false);
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [file, setFile] = useState<File | null>(null);
  const [roomType, setRoomType] = useState<(typeof ROOM_TYPES)[number]>("living_room");
  const [styleKey, setStyleKey] = useState<(typeof STYLES)[number]>("cozy_neutral");
  const [budgetTier, setBudgetTier] = useState<(typeof BUDGET_TIERS)[number]>(DEFAULT_BUDGET_TIER);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewPlan = BUDGET_PREVIEW_SETTINGS[budgetTier];

  const onFileChange = (nextFile: File | null) => {
    setError(null);
    if (!nextFile) {
      setFile(null);
      return;
    }

    const validation = validateImageFileMetadata(nextFile);
    if (validation.ok === false) {
      trackProductEvent(PRODUCT_EVENTS.uploadFailed, {
        audience: "guest",
        stage: "file_validation",
      });
      setFile(null);
      setError(validation.message);
      return;
    }

    setFile(nextFile);
  };

  async function reportUpload(
    upload: PreparedUpload,
    status: "started" | "succeeded" | "failed",
    errorCode?: string,
    durationMs?: number
  ) {
    try {
      await fetch("/api/demo/upload", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: upload.requestId,
          uploadId: upload.uploadId,
          sessionToken: upload.sessionToken,
          status,
          errorCode,
          durationMs,
        }),
      });
    } catch {
      // Upload instrumentation is best-effort and must not block a valid user upload.
    }
  }

  const onSubmit = async () => {
    if (submitRef.current) return;

    submitRef.current = true;
    setError(null);

    if (!file) {
      submitRef.current = false;
      setError("Please upload a photo first.");
      return;
    }

    const validation = validateImageFileMetadata(file);
    if (validation.ok === false) {
      submitRef.current = false;
      setError(validation.message);
      return;
    }

    setBusy(true);
    let shouldKeepWaiting = false;
    let failureStage = "upload_preparation";
    const uploadStartedAt = performance.now();
    trackProductEvent(PRODUCT_EVENTS.uploadStarted, { audience: "guest" });

    try {
      const requestId = crypto.randomUUID();
      const prepareRes = await fetch("/api/demo/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          fileName: file.name,
          fileType: validation.mimeType,
          fileSize: file.size,
        }),
      });
      const prepareJson = await prepareRes.json().catch(() => ({} as any));
      if (!prepareRes.ok) {
        throw new Error(
          readFriendlyApiError(
            prepareJson,
            "We could not prepare the photo upload. Please try again."
          )
        );
      }

      const upload: PreparedUpload = {
        requestId: prepareJson.requestId,
        uploadId: prepareJson.uploadId,
        path: prepareJson.path,
        token: prepareJson.token,
        sessionToken: prepareJson.sessionToken,
      };
      if (!upload.uploadId || !upload.path || !upload.token || !upload.sessionToken) {
        throw new Error("The upload setup was incomplete. Please choose the photo again.");
      }

      failureStage = "storage_upload";
      await reportUpload(upload, "started");
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET_INPUTS)
        .uploadToSignedUrl(upload.path, upload.token, file, {
          contentType: validation.mimeType,
          upsert: false,
        });
      if (uploadError) {
        const durationMs = Math.round(performance.now() - uploadStartedAt);
        await reportUpload(
          upload,
          "failed",
          uploadError.name || "storage_upload_failed",
          durationMs
        );
        trackProductEvent(PRODUCT_EVENTS.uploadFailed, {
          audience: "guest",
          stage: failureStage,
        });
        throw new Error("The photo upload did not finish. Check your connection and try again.");
      }
      const uploadDurationMs = Math.round(performance.now() - uploadStartedAt);
      await reportUpload(upload, "succeeded", undefined, uploadDurationMs);
      trackProductEvent(PRODUCT_EVENTS.uploadSucceeded, {
        audience: "guest",
      });

      failureStage = "generation_request";
      trackProductEvent(PRODUCT_EVENTS.generationSubmitted, {
        audience: "guest",
        budget_tier: budgetTier,
      });
      const res = await fetch("/api/demo/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: upload.requestId,
          uploadId: upload.uploadId,
          sessionToken: upload.sessionToken,
          roomType,
          goal: DEFAULT_GOAL,
          styleKey,
          budgetTier,
          mode: previewPlan.mode,
          strength: previewPlan.strength,
        }),
      });

      const json = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        failureStage = String((json as any)?.stage || "generation_request");
        throw new Error(
          readFriendlyApiError(
            json,
            "Your photo uploaded, but we could not start the generation job. Please try again."
          )
        );
      }

      const token = json.token;

      if (!token) {
        throw new Error("The preview job response was incomplete. Please try again.");
      }

      const resultUrl = json.resultUrl ?? `/demo/result/${encodeURIComponent(token)}`;
      trackProductEvent(PRODUCT_EVENTS.generationAccepted, {
        audience: "guest",
        budget_tier: budgetTier,
        reused: Boolean(json.reused),
      });
      shouldKeepWaiting = true;
      router.replace(resultUrl);
    } catch (e: any) {
      if (failureStage === "upload_preparation") {
        trackProductEvent(PRODUCT_EVENTS.uploadFailed, {
          audience: "guest",
          stage: failureStage,
        });
      } else if (failureStage !== "storage_upload") {
        trackProductEvent(PRODUCT_EVENTS.generationFailed, {
          audience: "guest",
          budget_tier: budgetTier,
          stage: failureStage,
        });
      }
      setError(e?.message ?? "We could not start the room preview. Please try again.");
    } finally {
      if (!shouldKeepWaiting) {
        submitRef.current = false;
        setBusy(false);
      }
    }
  };

  return (
    <main className="min-h-screen bg-[#F7EFE3] text-[#1F1F1F]">
      <ProductEventOnMount name={PRODUCT_EVENTS.demoStarted} />
      <div className="mx-auto max-w-[980px] px-5 py-8 sm:px-6 sm:py-12">
        <div>
          <div className="inline-flex rotate-[-1deg] rounded-lg border border-[#DFC588] bg-[#F7E3A6] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5F4A2E] shadow-sm">
            CozyLogic room mission
          </div>
          <h1 className="mt-2 text-3xl font-semibold leading-tight">Try a free room preview</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6A5A49]">
            Pick your room, choose your vibe and budget, then preview the refresh before moving a thing.
          </p>
        </div>

        <div className="relative mt-8 rounded-lg border border-[#D8C7AE] bg-[#FFF8EA] p-5 shadow-[0_22px_60px_rgba(68,52,37,0.12)] sm:p-6">
          <span aria-hidden="true" className="absolute -top-3 left-8 h-7 w-28 rotate-[-4deg] bg-[#E8D8BC]/90 shadow-sm" />
          <div className="space-y-5 rounded-lg border border-[#D8C7AE] bg-[#FFFDF7] p-4">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-[#6A6A6A]">
              1. Pick your room
            </div>
            <label className="relative mt-3 block rounded-lg border border-dashed border-[#C9B696] bg-[#F7EFE3] p-5">
              <span aria-hidden="true" className="absolute -top-2 left-7 h-5 w-20 rotate-[3deg] bg-[#E8D8BC]/80 shadow-sm" />
              <span className="text-base font-semibold text-[#1F1F1F]">Drop in the room you want to test</span>
              <span className="mt-1 block text-sm leading-6 text-[#6A5A49]">
                One clear JPG, PNG, or WebP up to 10 MB is perfect. Export HEIC/HEIF photos as JPG first.
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
                onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
                className="mt-4 block w-full rounded-lg border border-[#D8C7AE] bg-[#FFFDF7] px-4 py-3 text-sm"
              />
            </label>

            <div className="mt-3 flex flex-wrap gap-2">
              {ROOM_TYPES.map((item) => {
                const selected = roomType === item;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setRoomType(item)}
                    className={[
                      "min-h-[48px] rounded-lg border px-4 py-2 text-sm font-medium shadow-sm",
                      selected
                        ? "border-[#6F8373] bg-[#FFF8EA] text-[#1F1F1F] ring-2 ring-[#6F8373]/15"
                        : "border-[#D8C7AE] bg-[#FFFDF7] text-[#6A5A49]",
                    ].join(" ")}
                  >
                    {ROOM_LABELS[item]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-7">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-[#6A6A6A]">
              2. Choose your vibe
            </div>
            <p className="mt-2 text-sm leading-6 text-[#6A5A49]">
              Pick the look you want to test. CozyLogic keeps the room practical either way.
            </p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {STYLE_CHOICES.map((item) => (
                <StyleTile
                  key={item}
                  styleKey={item}
                  selected={styleKey === item}
                  onSelect={() => setStyleKey(item)}
                />
              ))}
            </div>
          </div>

          <div className="mt-7">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-[#6A6A6A]">
              3. Choose your budget
            </div>
            <p className="mt-2 text-sm leading-6 text-[#6A5A49]">
              Free Fix is the best first stop. Add small upgrades only if you want them.
            </p>
            <div className="mt-3">
              <BudgetSelect value={budgetTier} onChange={setBudgetTier} />
            </div>
          </div>

          <div className="mt-7">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-[#6A6A6A]">
              4. Preview the refresh
            </div>
            <div className="relative mt-3 rounded-lg border border-[#D8C7AE] bg-[#FFFDF7] p-4 shadow-sm">
              <span aria-hidden="true" className="absolute -top-2 left-7 h-5 w-20 rotate-[-3deg] bg-[#E8D8BC]/80 shadow-sm" />
              <div className="text-base font-semibold text-[#1F1F1F]">{previewPlan.planLabel}</div>
              <div className="mt-2 text-sm leading-6 text-[#6A5A49]">
                {previewPlan.planDescription}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onSubmit}
            disabled={busy}
            className="mt-7 min-h-[52px] w-full rounded-lg bg-[#6F8373] px-4 py-3 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
          >
            {busy ? "Starting your preview…" : "Preview my free room refresh"}
          </button>

          {error && <div className="mt-4 text-sm text-red-600">{error}</div>}
        </div>
      </div>
    </main>
  );
}
