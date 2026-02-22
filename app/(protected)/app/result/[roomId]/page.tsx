// app/(protected)/app/result/[roomId]/page.tsx
import { redirect } from "next/navigation";
import Image from "next/image";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { STORAGE_BUCKET_INPUTS, STORAGE_BUCKET_OUTPUTS } from "@/lib/cozylogic/constants";
import GenerationOverlay from "@/components/GenerationOverlay";

type PageProps = {
  params: Promise<{ roomId: string }>;
};

export default async function ResultPage({ params }: PageProps) {
  const { roomId } = await params;

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: room, error: roomErr } = await supabase
    .from("rooms")
    .select("id,user_id,room_type,goal,style_key,budget_tier,input_image_path,status,generation_status,generation_error")
    .eq("id", roomId)
    .single();

  if (roomErr || !room) {
    return (
      <main className="min-h-screen bg-[#FAF9F7] p-8 text-[#1F1F1F]">
        <div className="mx-auto max-w-3xl rounded-2xl border border-[#EAEAEA] bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Not found</h1>
          <p className="mt-2 text-sm text-[#6A6A6A]">That room could not be loaded.</p>
        </div>
      </main>
    );
  }

  if (room.user_id !== user.id) {
    return (
      <main className="min-h-screen bg-[#FAF9F7] p-8 text-[#1F1F1F]">
        <div className="mx-auto max-w-3xl rounded-2xl border border-[#EAEAEA] bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Forbidden</h1>
          <p className="mt-2 text-sm text-[#6A6A6A]">You don’t have access to this room.</p>
        </div>
      </main>
    );
  }

  // Latest generation (not deleted)
  const { data: gen } = await supabase
    .from("generations")
    .select("id,output_image_path,watermarked,created_at")
    .eq("room_id", room.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Signed URLs
  let inputUrl: string | null = null;
  let outputUrl: string | null = null;

  if (room.input_image_path) {
    const { data } = await supabase.storage
      .from(STORAGE_BUCKET_INPUTS)
      .createSignedUrl(room.input_image_path, 60 * 30);
    inputUrl = data?.signedUrl ?? null;
  }

  if (gen?.output_image_path) {
    const { data } = await supabase.storage
      .from(STORAGE_BUCKET_OUTPUTS)
      .createSignedUrl(gen.output_image_path, 60 * 30);
    outputUrl = data?.signedUrl ?? null;
  }

  const status = room.status ?? "";
  const step = room.generation_status ?? "";
  const err = room.generation_error ?? "";

  const isWorking =
    status === "queued" ||
    status === "generating" ||
    (step && step !== "done" && step !== "generated" && step !== "error");

  return (
    <main className="min-h-screen bg-[#FAF9F7] text-[#1F1F1F]">
      {/* Client overlay that polls /api/rooms/[roomId]/status */}
      <GenerationOverlay roomId={room.id} />

      <div className="mx-auto w-full max-w-[980px] px-6 py-10">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="text-sm tracking-wide text-[#6A6A6A]">CozyLogic</div>
            <h1 className="mt-2 text-3xl font-semibold leading-tight">Your redesign</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-[#6A6A6A]">
              {room.room_type?.replaceAll("_", " ")} • {room.style_key?.replaceAll("_", " ")} •{" "}
              {room.budget_tier?.replaceAll("_", " ")}
            </p>
          </div>

          <a
            href="/app"
            className="rounded-xl border border-[#EAEAEA] bg-white px-4 py-2 text-sm font-medium shadow-sm"
          >
            Back to Dashboard
          </a>
        </div>

        {err ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        ) : null}

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-[#EAEAEA] bg-white p-4 shadow-sm">
            <div className="mb-3 text-sm font-medium">Before</div>
            <div className="relative aspect-[3/2] overflow-hidden rounded-xl bg-[#F2F2F2]">
              {inputUrl ? (
                <Image src={inputUrl} alt="Before" fill className="object-cover" />
              ) : (
                <div className="grid h-full place-items-center text-sm text-[#6A6A6A]">No input image</div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-[#EAEAEA] bg-white p-4 shadow-sm">
            <div className="mb-3 text-sm font-medium">After</div>
            <div className="relative aspect-[3/2] overflow-hidden rounded-xl bg-[#F2F2F2]">
              {outputUrl ? (
                <Image src={outputUrl} alt="After" fill className="object-cover" />
              ) : isWorking ? (
                <div className="grid h-full place-items-center p-6 text-center">
                  <div className="text-sm font-medium">Generating…</div>
                  <div className="mt-1 text-xs text-[#6A6A6A]">
                    Keep this page open — your design will appear here automatically.
                  </div>
                </div>
              ) : (
                <div className="grid h-full place-items-center p-6 text-center">
                  <div className="text-sm font-medium">No design yet</div>
                  <div className="mt-1 text-xs text-[#6A6A6A]">Go back and click Generate.</div>
                </div>
              )}
            </div>

            {outputUrl ? (
              <div className="mt-3 flex items-center justify-between">
                <div className="text-xs text-[#6A6A6A]">
                  Generated {gen?.created_at ? new Date(gen.created_at).toLocaleString() : ""}
                </div>
                <a href={outputUrl} target="_blank" rel="noreferrer" className="rounded-lg border px-3 py-1.5 text-sm">
                  Open image
                </a>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}