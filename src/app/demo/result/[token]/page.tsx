// src/app/demo/result/[token]/page.tsx
import { notFound } from "next/navigation";

import { createClient } from "@supabase/supabase-js";
import { STORAGE_BUCKET_INPUTS, STORAGE_BUCKET_OUTPUTS } from "@/lib/cozylogic/constants";

type PageProps = {
  params: Promise<{ token: string }>;
};

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
    notFound();
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
    notFound();
  }

  const inputUrl = await createSignedUrl(STORAGE_BUCKET_INPUTS, trial.input_image_path);
  const outputUrl = await createSignedUrl(STORAGE_BUCKET_OUTPUTS, trial.output_image_path);

  const isWorking =
    trial.status === "draft" ||
    trial.status === "queued" ||
    trial.status === "generating" ||
    trial.generation_status === "queued" ||
    trial.generation_status === "generating";

  const isExpired = trial.expires_at && new Date(trial.expires_at) < new Date();

  return (
    <main className="min-h-screen bg-[#FAF9F7] text-[#1F1F1F]">
      <div className="mx-auto w-full max-w-[980px] px-6 py-10">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="text-sm tracking-wide text-[#6A6A6A]">CozyLogic Demo</div>
            <h1 className="mt-2 text-3xl font-semibold leading-tight">Your free redesign</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-[#6A6A6A]">
              {trial.room_type?.replaceAll("_", " ")} • {trial.style_key?.replaceAll("_", " ")} •{" "}
              {trial.budget_tier?.replaceAll("_", " ")}
            </p>
          </div>
        </div>

        {trial.generation_error ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {trial.generation_error}
          </div>
        ) : null}

        {isExpired ? (
          <div className="mt-6 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            This free demo has expired. Create an account to generate a new redesign.
          </div>
        ) : null}

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-[#EAEAEA] bg-white p-4 shadow-sm">
            <div className="mb-3 text-sm font-medium">Before</div>
            <div className="relative aspect-[3/2] overflow-hidden rounded-xl bg-[#F2F2F2]">
              {inputUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={inputUrl} alt="Before" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full place-items-center text-sm text-[#6A6A6A]">
                  No input image
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-[#EAEAEA] bg-white p-4 shadow-sm">
            <div className="mb-3 text-sm font-medium">After</div>
            <div className="relative aspect-[3/2] overflow-hidden rounded-xl bg-[#F2F2F2]">
              {outputUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={outputUrl} alt="After" className="h-full w-full object-cover" />
              ) : isWorking ? (
                <div className="grid h-full place-items-center p-6 text-center">
                  <div className="text-sm font-medium">Generating…</div>
                  <div className="mt-1 text-xs text-[#6A6A6A]">
                    Your free redesign is still being prepared.
                  </div>
                </div>
              ) : (
                <div className="grid h-full place-items-center p-6 text-center">
                  <div className="text-sm font-medium">No design yet</div>
                  <div className="mt-1 text-xs text-[#6A6A6A]">Please refresh in a moment.</div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-[28px] border border-[#EAEAEA] bg-[#1F1F1F] px-6 py-8 text-white sm:px-8">
          <div className="max-w-[760px]">
            <div className="text-sm font-medium tracking-wide text-white/70">Like what you see?</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
              Create a free account to save this design and generate more.
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/75">
              {isExpired
                ? "Your free demo has expired. Create an account to continue generating designs."
                : "Your first redesign is free. Sign up to unlock more generations, saved history, and a full dashboard."}
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a
                href="/login"
                className="rounded-2xl bg-[#6F8373] px-5 py-3 text-center text-sm font-medium text-white shadow-sm"
              >
                Create free account
              </a>
              <a
                href="/"
                className="rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-center text-sm font-medium text-white"
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