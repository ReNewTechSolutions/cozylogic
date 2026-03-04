// src/app/api/images/signed-url/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseRouteClient } from "@/lib/supabase/route";
import { STORAGE_BUCKET_INPUTS } from "@/lib/cozylogic/constants";

export async function POST(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = getSupabaseRouteClient(req, res);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const path = body?.path as string | undefined;
  if (!path) return NextResponse.json({ error: "missing_path" }, { status: 400 });

  const { data, error } = await supabase.storage.from(STORAGE_BUCKET_INPUTS).createSignedUploadUrl(path);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 200 });
}