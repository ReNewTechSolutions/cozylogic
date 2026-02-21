// app/(protected)/app/history/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import RecentDesignGrid, { type RecentCard } from "@/components/RecentDesignGrid";

export default async function HistoryPage() {
    const supabase = await getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: rows } = await supabase
    .from("generations")
    .select(
      `
      id,
      created_at,
      output_image_path,
      watermarked,
      room:rooms (
        id,
        room_type,
        goal,
        style_key,
        budget_tier,
        input_image_path
      )
    `
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(60);

  const items: RecentCard[] =
    (rows ?? [])
      .filter((g: any) => !!g.room)
      .map((g: any) => ({
        generation_id: g.id,
        created_at: g.created_at,
        output_image_path: g.output_image_path,
        watermarked: !!g.watermarked,
        room: {
          id: g.room.id,
          room_type: g.room.room_type,
          goal: g.room.goal,
          style_key: g.room.style_key,
          budget_tier: g.room.budget_tier,
          input_image_path: g.room.input_image_path,
        },
      })) ?? [];

  return (
    <main className="min-h-screen bg-[#FAF9F7] text-[#1F1F1F]">
      <div className="mx-auto w-full max-w-[1100px] px-6 py-10">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="text-sm tracking-wide text-[#6A6A6A]">CozyLogic</div>
            <h1 className="mt-2 text-3xl font-semibold leading-tight">History</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-[#6A6A6A]">
              All your redesigns in one place.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/app"
              className="rounded-xl border border-[#EAEAEA] bg-white px-4 py-2 text-sm font-medium shadow-sm"
            >
              Dashboard
            </Link>
            <Link
              href="/app/new"
              className="rounded-xl bg-[#6F8373] px-4 py-2 text-sm font-medium text-white shadow-sm"
            >
              New redesign
            </Link>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-[#EAEAEA] bg-white p-8 text-center shadow-sm">
            <div className="text-lg font-semibold">No redesigns yet</div>
            <p className="mt-2 text-[15px] leading-relaxed text-[#6A6A6A]">
              Create your first redesign to see it here.
            </p>
            <div className="mt-6">
              <Link
                href="/app/new"
                className="inline-flex rounded-xl bg-[#6F8373] px-4 py-2 text-sm font-medium text-white shadow-sm"
              >
                Start new redesign
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-8">
            <RecentDesignGrid items={items} />
          </div>
        )}
      </div>
    </main>
  );
}