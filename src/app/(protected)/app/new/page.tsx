// src/app/(protected)/app/result/[roomId]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function ResultPage({ params }: { params: { roomId: string } }) {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  const { roomId } = params;

  const [inputUrl, setInputUrl] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRoom() {
      const { data, error } = await supabase.from("rooms").select("*").eq("id", roomId).single();
      if (error) {
        setError(error.message);
        return;
      }
      if (!data) {
        setError("Room not found.");
        return;
      }

      const { input_image_path, output_image_path, generation_status } = data;

      if (input_image_path) {
        const { data: urlData } = await supabase.storage.from("images").getPublicUrl(input_image_path);
        setInputUrl(urlData.publicUrl);
      }

      if (output_image_path) {
        const { data: urlData } = await supabase.storage.from("images").getPublicUrl(output_image_path);
        setOutputUrl(urlData.publicUrl);
      }

      setIsWorking(generation_status === "generating");
    }

    void fetchRoom();
  }, [roomId, supabase]);

  return (
    <main className="min-h-screen bg-[#FAF9F7] text-[#1F1F1F]">
      <div className="mx-auto w-full max-w-[900px] px-6 py-10">
        <button
          type="button"
          onClick={() => router.push("/app")}
          className="rounded-xl border border-[#EAEAEA] bg-white px-4 py-2 text-sm font-medium shadow-sm"
        >
          Back to Dashboard
        </button>

        <h1 className="mt-4 text-3xl font-semibold leading-tight">Redesign Result</h1>

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="relative h-64 w-full rounded-2xl border border-[#EAEAEA] bg-white shadow-sm">
            <div className="absolute left-4 top-4 z-10 rounded-full bg-[#6F8373] px-3 py-1 text-xs font-semibold text-white">
              Before
            </div>
            {inputUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={inputUrl} alt="Before" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-[#6A6A6A]">
                No input image
              </div>
            )}
          </div>

          <div className="relative h-64 w-full rounded-2xl border border-[#EAEAEA] bg-white shadow-sm">
            <div className="absolute left-4 top-4 z-10 rounded-full bg-[#6F8373] px-3 py-1 text-xs font-semibold text-white">
              After
            </div>
            {outputUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={outputUrl} alt="After" className="h-full w-full object-cover" />
            ) : isWorking ? (
              <div className="flex h-full items-center justify-center text-sm text-[#6A6A6A]">
                Generating...
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-[#6A6A6A]">
                No output image yet
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}