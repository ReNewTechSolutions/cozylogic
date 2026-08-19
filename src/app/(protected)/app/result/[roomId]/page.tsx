import { redirect } from "next/navigation";

import { getSupabaseServerClient } from "@/lib/supabase/server";
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

type PageProps = {
  params: Promise<{ roomId: string }>;
};

export default async function ResultPage({ params }: PageProps) {
  const { roomId } = await params;

  if (!roomId || roomId === "undefined") {
    redirect("/app");
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/app");

  const { data: room, error: roomErr } = await supabase
    .from("rooms")
    .select(
      "id,user_id,room_type,goal,style_key,budget_tier,input_image_path,status,generation_status,generation_error"
    )
    .eq("id", roomId)
    .single();

  if (roomErr || !room) {
    return (
      <main className="min-h-screen bg-[#F7EFE3] p-8 text-[#1F1F1F]">
        <div className="mx-auto max-w-3xl rounded-lg border border-[#D8C7AE] bg-[#FFFDF7] p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Not found</h1>
          <p className="mt-2 text-sm text-[#6A6A6A]">That room could not be loaded.</p>
        </div>
      </main>
    );
  }

  if (room.user_id !== user.id) {
    return (
      <main className="min-h-screen bg-[#F7EFE3] p-8 text-[#1F1F1F]">
        <div className="mx-auto max-w-3xl rounded-lg border border-[#D8C7AE] bg-[#FFFDF7] p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Forbidden</h1>
          <p className="mt-2 text-sm text-[#6A6A6A]">You don’t have access to this room.</p>
        </div>
      </main>
    );
  }

  const { data: gen } = await supabase
    .from("generations")
    .select("id,output_image_path,watermarked,created_at")
    .eq("room_id", room.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const signedTtl = 60 * 30;
  let inputUrl: string | null = null;
  let outputUrl: string | null = null;

  if (room.input_image_path) {
    const { data } = await supabase.storage
      .from(STORAGE_BUCKET_INPUTS)
      .createSignedUrl(room.input_image_path, signedTtl);
    inputUrl = data?.signedUrl ?? null;
  }

  if (gen?.output_image_path) {
    const { data } = await supabase.storage
      .from(STORAGE_BUCKET_OUTPUTS)
      .createSignedUrl(gen.output_image_path, signedTtl);
    outputUrl = data?.signedUrl ?? null;
  }

  const status = room.status ?? "";
  const step = room.generation_status ?? "";
  const err = room.generation_error ?? "";
  const friendlyErr = err.replaceAll("_", " ");
  const roomLabel = ROOM_LABELS[room.room_type as keyof typeof ROOM_LABELS] ?? room.room_type;
  const styleLabel = STYLE_LABELS[room.style_key as keyof typeof STYLE_LABELS] ?? room.style_key;
  const budgetLabel =
    BUDGET_LABELS[room.budget_tier as keyof typeof BUDGET_LABELS] ?? room.budget_tier;

  const isWorking =
    status === "queued" ||
    status === "generating" ||
    (step && step !== "done" && step !== "generated" && step !== "error");

  // Expire after 30 minutes (same as signed URL TTL)
  let isExpired = false;
  if (gen?.created_at) {
    const created = new Date(gen.created_at).getTime();
    const now = Date.now();
    const ttlMs = 30 * 60 * 1000;
    isExpired = now - created > ttlMs;
  }

  return (
    <main className="min-h-screen bg-[#F7EFE3] text-[#1F1F1F]">
      {isWorking ? <GenerationOverlay roomId={room.id} /> : null}

      <div className="mx-auto w-full max-w-[980px] px-6 py-10">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="inline-flex rotate-[-1deg] rounded-lg border border-[#DFC588] bg-[#F7E3A6] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5F4A2E] shadow-sm">
              CozyLogic result board
            </div>
            <h1 className="mt-2 text-3xl font-semibold leading-tight">Your room mission preview</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-[#6A5A49]">
              {roomLabel} • {styleLabel} • {budgetLabel}
            </p>
          </div>

          <a
            href="/app"
            className="rounded-lg border border-[#D8C7AE] bg-[#FFFDF7] px-4 py-2 text-sm font-medium shadow-sm"
          >
            Back to Dashboard
          </a>
        </div>

        {err ? (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
            <div className="font-semibold">We could not finish this preview.</div>
            <p className="mt-1 leading-6">
              {friendlyErr || "Your original photo and choices are safe."}
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <a
                href="/app/new"
                className="rounded-lg bg-[#1F1F1F] px-4 py-2 text-center text-sm font-semibold text-white"
              >
                Try a fresh preview
              </a>
              <a
                href="/app"
                className="rounded-lg border border-red-200 bg-white px-4 py-2 text-center text-sm font-semibold text-[#1F1F1F]"
              >
                Back to Dashboard
              </a>
            </div>
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
                  <img src={inputUrl} alt="Before" className="h-full w-full object-cover" />
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
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={outputUrl}
                      alt="After"
                      className={`h-full w-full object-cover ${isExpired ? "blur-sm opacity-80" : ""}`}
                    />
                    {isExpired && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                        <a
                          href="/login"
                          className="rounded-lg bg-white px-4 py-2 text-sm font-medium shadow"
                        >
                          Unlock this preview
                        </a>
                      </div>
                    )}
                  </>
                ) : isWorking ? (
                  <div className="grid h-full place-items-center p-6 text-center">
                    <div className="text-sm font-medium">Previewing…</div>
                    <div className="mt-1 text-xs text-[#6A5A49]">
                      Keep this page open — your preview will appear here automatically.
                    </div>
                  </div>
                ) : (
                  <div className="grid h-full place-items-center p-6 text-center">
                    <div className="text-sm font-medium">No preview yet</div>
                    <div className="mt-1 text-xs text-[#6A5A49]">Go back and click preview.</div>
                  </div>
                )}
              </div>

              {outputUrl ? (
                <div className="mt-3 flex items-center justify-between">
                  <div className="text-xs text-[#6A5A49]">
                    Generated {gen?.created_at ? new Date(gen.created_at).toLocaleString() : ""}
                  </div>
                  <a
                    href={outputUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-[#D8C7AE] bg-[#FFF8EA] px-3 py-1.5 text-sm"
                  >
                    Open image
                  </a>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {outputUrl && !isExpired ? (
          <ResultMissionBoard
            roomType={room.room_type}
            styleKey={room.style_key}
            budgetTier={room.budget_tier}
          />
        ) : null}

        {outputUrl && !isExpired ? (
          <ShopThisLook
            roomType={room.room_type}
            goal={room.goal}
            styleKey={room.style_key}
            budgetTier={room.budget_tier}
          />
        ) : null}
      </div>
    </main>
  );
}
