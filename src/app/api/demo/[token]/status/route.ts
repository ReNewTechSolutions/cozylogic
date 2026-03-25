// src/app/api/demo/[token]/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await ctx.params;

    if (!token || token === "undefined") {
      return NextResponse.json({ error: "invalid_token" }, { status: 400 });
    }

    const supabase = getAdminClient();

    const { data: trial, error } = await supabase
      .from("guest_trials")
      .select(
        "id,trial_token,status,generation_status,generation_error,input_image_path,output_image_path,created_at,expires_at"
      )
      .eq("trial_token", token)
      .single();

    if (error || !trial) {
      return NextResponse.json({ error: "trial_not_found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        id: trial.id,
        token: trial.trial_token,
        status: trial.status,
        generation_status: trial.generation_status,
        generation_error: trial.generation_error,
        input_image_path: trial.input_image_path,
        output_image_path: trial.output_image_path,
        created_at: trial.created_at,
        expires_at: trial.expires_at,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "demo_status_failed" },
      { status: 500 }
    );
  }
}