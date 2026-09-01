// src/app/demo/result/[token]/page.tsx
import { createClient } from "@supabase/supabase-js";
import {
  BUDGET_LABELS,
  ROOM_LABELS,
  STORAGE_BUCKET_INPUTS,
  STORAGE_BUCKET_OUTPUTS,
  STYLE_LABELS,
} from "@/lib/cozylogic/constants";
import GenerationOverlay from "@/components/GenerationOverlay";
import ResultMissionBoard from "@/components/ResultMissionBoard";
import ShopThisLook from "@/components/ShopThisLook";
import UseWhatYouHave from "@/components/UseWhatYouHave";
import ResultViewTracker from "@/components/ResultViewTracker";

type PageProps = {
  params: Promise<{ token: string }>;
};

function DemoRecoveryScreen() {
  return (
    <main className="min-h-screen bg-[#F7EFE3] p-6 text-[#1F1F1F] sm:p-10">
      <div className="mx-auto max-w-xl rounded-lg border border-[#D8C7AE] bg-[#FFFDF7] p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">This preview link is not available</h1>
        <p className="mt-3 text-sm leading-6 text-[#6A5A49]">
          It may be incomplete, expired, or no longer valid. You can safely start another free preview; this page will not create a generation.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <a
            href="/demo"
            className="rounded-lg bg-[#1F1F1F] px-4 py-2 text-center text-sm font-semibold text-white"
          >
            Try another preview
          </a>
          <a
            href="/"
            className="rounded-lg border border-[#D8C7AE] bg-white px-4 py-2 text-center text-sm font-semibold text-[#1F1F1F]"
          >
            Home
          </a>
        </div>
      </div>
    </main>
  );
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!url || !serviceRole) {
    throw new Error("Missing Supabase server environment variables.");
  }

  return createClient(url, serviceRole, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function createSignedUrl(
  bucket: string,
  path: string | null | undefined,
  expiresIn = 60 * 60
) {
  if (!path) return null;

  const supabase = getAdminClient();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);

  if (error) {
    console.error("DEMO result signed URL failed", bucket, path, error);
    return null;
  }

  return data?.signedUrl ?? null;
}

export default async function DemoResultPage({ params }: PageProps) {
  const { token } = await params;

  if (!token || token === "undefined") {
    return <DemoRecoveryScreen />;
  }

  const supabase = getAdminClient();

  const { data: trial, error } = await supabase
    .from("guest_trials")
    .select(
      "id,trial_token,input_image_path,output_image_path,room_type,goal,style_key,budget_tier,mode,strength,status,generation_status,generation_error,created_at,expires_at"
    )
    .eq("trial_token", token)
    .single();

  if (error || !trial) {
    return <DemoRecoveryScreen />;
  }

  const [inputUrl, outputUrl] = await Promise.all([
    createSignedUrl(STORAGE_BUCKET_INPUTS, trial.input_image_path),
    createSignedUrl(STORAGE_BUCKET_OUTPUTS, trial.output_image_path),
  ]);
  const isFailed =
    trial.status === "error" ||
    trial.status === "failed" ||
    trial.generation_status === "error" ||
    trial.generation_status === "failed";
  const generationError = trial.generation_error
    ? String(trial.generation_error).replaceAll("_", " ")
    : isFailed
      ? "Your original photo and choices are safe."
      : "";

  const isWorking =
    !isFailed &&
    (trial.status === "queued" ||
      trial.status === "generating" ||
      trial.generation_status === "queued" ||
      trial.generation_status === "generating");

  const isExpired = trial.expires_at && new Date(trial.expires_at) < new Date();
  const roomLabel = ROOM_LABELS[trial.room_type as keyof typeof ROOM_LABELS] ?? trial.room_type;
  const styleLabel = STYLE_LABELS[trial.style_key as keyof typeof STYLE_LABELS] ?? trial.style_key;
  const budgetLabel =
    BUDGET_LABELS[trial.budget_tier as keyof typeof BUDGET_LABELS] ?? trial.budget_tier;

  return (
    <main className="min-h-screen bg-[#F7EFE3] text-[#1F1F1F]">
      <ResultViewTracker audience="guest" budgetTier={trial.budget_tier} reopened={false} />
      {isWorking ? (
        <GenerationOverlay
          statusUrl={`/api/demo/${encodeURIComponent(token)}/status`}
          retryHref="/demo"
          retryLabel="Try the demo again"
          analytics={{ audience: "guest", budgetTier: trial.budget_tier }}
        />
      ) : null}

      <div className="mx-auto w-full max-w-[980px] px-6 py-10">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="inline-flex rotate-[-1deg] rounded-lg border border-[#DFC588] bg-[#F7E3A6] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5F4A2E] shadow-sm">
              CozyLogic demo board
            </div>
            <h1 className="mt-2 text-3xl font-semibold leading-tight">Your free room preview</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-[#6A5A49]">
              {roomLabel} • {styleLabel} • {budgetLabel}
            </p>
          </div>
        </div>

        {generationError ? (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
            <div className="font-semibold">We could not finish this free preview.</div>
            <p className="mt-1 leading-6">{generationError}</p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <a
                href="/demo"
                className="rounded-lg bg-[#1F1F1F] px-4 py-2 text-center text-sm font-semibold text-white"
              >
                Try the demo again
              </a>
              <a
                href="/"
                className="rounded-lg border border-red-200 bg-white px-4 py-2 text-center text-sm font-semibold text-[#1F1F1F]"
              >
                Back home
              </a>
            </div>
          </div>
        ) : null}

        {isExpired ? (
          <div className="mt-6 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            This free demo has expired. Create an account to make a new preview.
          </div>
        ) : null}

        <div className="relative mt-8 rounded-lg border border-[#D8C7AE] bg-[#FFF8EA] p-4 shadow-[0_22px_60px_rgba(68,52,37,0.12)] sm:p-5">
          <span
            aria-hidden="true"
            className="absolute -top-3 left-10 h-7 w-28 rotate-[-4deg] bg-[#E8D8BC]/90 shadow-sm"
          />
          <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7C6247]">
            before / after clippings
          </div>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="relative rounded-lg border border-[#D8C7AE] bg-[#FFFDF7] p-4 shadow-sm">
              <span
                aria-hidden="true"
                className="absolute -top-2 left-7 h-5 w-20 rotate-[3deg] bg-[#E8D8BC]/80 shadow-sm"
              />
              <div className="mb-3 inline-flex rounded-lg border border-[#DFC588] bg-[#F7E3A6] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5F4A2E]">
                Before
              </div>
              <div className="relative aspect-[3/2] overflow-hidden rounded-lg bg-[#EDE2D2]">
                {inputUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={inputUrl}
                    alt="Before"
                    width={1200}
                    height={800}
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="grid h-full place-items-center text-sm text-[#6A6A6A]">
                    No input image
                  </div>
                )}
              </div>
            </div>

            <div className="relative rounded-lg border border-[#D8C7AE] bg-[#FFFDF7] p-4 shadow-sm lg:translate-y-4">
              <span
                aria-hidden="true"
                className="absolute -top-2 left-7 h-5 w-20 rotate-[-3deg] bg-[#E8D8BC]/80 shadow-sm"
              />
              <div className="mb-3 inline-flex rounded-lg border border-[#DFC588] bg-[#F7E3A6] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5F4A2E]">
                After
              </div>
              <div className="relative aspect-[3/2] overflow-hidden rounded-lg bg-[#EDE2D2]">
                {outputUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={outputUrl}
                    alt="After"
                    width={1200}
                    height={800}
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                ) : isWorking ? (
                  <div className="grid h-full place-items-center p-6 text-center">
                    <div className="text-sm font-medium">Previewing…</div>
                    <div className="mt-1 text-xs text-[#6A5A49]">
                      Your free preview is still being prepared.
                    </div>
                  </div>
                ) : (
                  <div className="grid h-full place-items-center p-6 text-center">
                    <div className="text-sm font-medium">No preview yet</div>
                    <div className="mt-1 text-xs text-[#6A5A49]">Please refresh in a moment.</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {outputUrl && !isExpired ? (
          <ResultMissionBoard
            roomType={trial.room_type}
            styleKey={trial.style_key}
            budgetTier={trial.budget_tier}
          />
        ) : null}

        {outputUrl && !isExpired && trial.budget_tier !== "rearrange_only" ? (
          <ShopThisLook
            roomType={trial.room_type}
            goal={trial.goal}
            styleKey={trial.style_key}
            budgetTier={trial.budget_tier}
          />
        ) : null}

        {outputUrl && !isExpired && trial.budget_tier === "rearrange_only" ? (
          <UseWhatYouHave roomType={trial.room_type} />
        ) : null}

        <div className="relative mt-8 rounded-lg border border-[#2D2822] bg-[#1F1F1F] px-6 py-8 text-white shadow-[0_22px_60px_rgba(31,31,31,0.18)] sm:px-8">
          <span aria-hidden="true" className="absolute -top-3 left-8 h-7 w-28 rotate-[-3deg] bg-[#E8D8BC]/70" />
          <div className="max-w-[760px]">
            <div className="text-sm font-medium tracking-wide text-white/70">Like what you see?</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
              Create a free account to save this room board and make more.
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/75">
              {isExpired
                ? "Your free demo has expired. Create an account to keep making previews."
                : "Your first preview is free. Sign up to unlock more room boards, saved history, and a full dashboard."}
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a
                href="/login"
                className="rounded-lg bg-[#6F8373] px-5 py-3 text-center text-sm font-medium text-white shadow-sm"
              >
                Create free account
              </a>
              <a
                href="/"
                className="rounded-lg border border-white/15 bg-white/5 px-5 py-3 text-center text-sm font-medium text-white"
              >
                Back to home
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
