// src/app/api/generations/delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseRouteClient } from "@/lib/supabase/route";

export async function POST(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = getSupabaseRouteClient(req, res);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const generationId = body?.generationId as string | undefined;

  if (!generationId) return NextResponse.json({ error: "missing_generationId" }, { status: 400 });

  // Verify ownership
  const { data: gen } = await supabase
    .from("generations")
    .select("id,user_id")
    .eq("id", generationId)
    .maybeSingle();

  if (!gen) return NextResponse.json({ error: "generation_not_found" }, { status: 404 });
  if (gen.user_id !== user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  // soft delete if you have deleted_at, otherwise hard delete
  const { error } = await supabase
    .from("generations")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", generationId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true }, { status: 200 });
}