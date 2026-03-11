// src/app/api/images/signed-url/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseRouteClient } from "@/lib/supabase/route";
import { STORAGE_BUCKET_INPUTS } from "@/lib/cozylogic/constants";

export async function POST(req: NextRequest) {
  const response = NextResponse.json({ ok: true });
  const supabase = getSupabaseRouteClient(req, response);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const path = body?.path as string | undefined;
  if (!path) {
    return NextResponse.json({ error: "missing_path" }, { status: 400 });
  }

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET_INPUTS)
    .createSignedUploadUrl(path);

  if (error) {
    return NextResponse.json(
      { error: error.message ?? "signed_url_failed" },
      { status: 500 }
    );
  }

  return NextResponse.json(data, { status: 200 });
}