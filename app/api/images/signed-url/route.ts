// app/api/images/signed-url/route.ts
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  STORAGE_BUCKET_INPUTS,
  STORAGE_BUCKET_OUTPUTS,
} from "@/lib/cozylogic/constants";

const ALLOWED_BUCKETS = new Set([STORAGE_BUCKET_INPUTS, STORAGE_BUCKET_OUTPUTS]);

export async function POST(req: Request) {
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const bucket = body?.bucket as string | undefined;
  const path = body?.path as string | undefined;

  if (!bucket || !path) {
    return NextResponse.json({ error: "missing_bucket_or_path" }, { status: 400 });
  }

  if (!ALLOWED_BUCKETS.has(bucket)) {
    return NextResponse.json({ error: "bucket_not_allowed" }, { status: 400 });
  }

  // Basic path safety guard (optional, but helps prevent weirdness)
  if (path.includes("..")) {
    return NextResponse.json({ error: "invalid_path" }, { status: 400 });
  }

  // Create short-lived signed URL
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 5); // 5 minutes

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "signed_url_failed" }, { status: 500 });
  }

  return NextResponse.json({ signedUrl: data.signedUrl });
}