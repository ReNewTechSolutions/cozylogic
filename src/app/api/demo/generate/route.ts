

// src/app/api/demo/generate/route.ts
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  STORAGE_BUCKET_INPUTS,
  BUDGET_TIERS,
  GOALS,
  ROOM_TYPES,
  STYLES,
} from "@/lib/cozylogic/constants";

type RoomType = (typeof ROOM_TYPES)[number];
type GoalKey = (typeof GOALS)[number];
type StyleKey = (typeof STYLES)[number];
type BudgetTier = (typeof BUDGET_TIERS)[number];

function safeRoomType(value: string | null): RoomType {
  return ROOM_TYPES.includes(value as RoomType)
    ? (value as RoomType)
    : "living_room";
}

function safeGoal(value: string | null): GoalKey {
  return GOALS.includes(value as GoalKey) ? (value as GoalKey) : "modern";
}

function safeStyle(value: string | null): StyleKey {
  return STYLES.includes(value as StyleKey)
    ? (value as StyleKey)
    : "cozy_neutral";
}

function safeBudget(value: string | null): BudgetTier {
  return BUDGET_TIERS.includes(value as BudgetTier)
    ? (value as BudgetTier)
    : "under_500";
}

function safeMode(value: string | null) {
  return value === "reality_lock" || value === "creative" ? value : "precision";
}

function safeStrength(value: string | null) {
  const parsed = Number(value ?? 60);
  if (Number.isNaN(parsed)) return 60;
  return Math.min(100, Math.max(0, Math.round(parsed)));
}

function safeExt(file: File) {
  const type = file.type.toLowerCase();
  if (type.includes("png")) return "png";
  if (type.includes("webp")) return "webp";
  return "jpg";
}

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

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();

    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "missing_file" }, { status: 400 });
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return NextResponse.json({ error: "invalid_file_type" }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "file_too_large" }, { status: 400 });
    }

    const roomType = safeRoomType(String(form.get("roomType") || "living_room"));
    const goal = safeGoal(String(form.get("goal") || "modern"));
    const styleKey = safeStyle(String(form.get("styleKey") || "cozy_neutral"));
    const budgetTier = safeBudget(String(form.get("budgetTier") || "under_500"));
    const mode = safeMode(String(form.get("mode") || "precision"));
    const strength = safeStrength(String(form.get("strength") || "60"));

    const supabase = getAdminClient();

    const trialId = randomUUID();
    const trialToken = randomUUID();
    const ext = safeExt(file);
    const inputImagePath = `guest/${trialId}/${randomUUID()}.${ext}`;

    const uploadBytes = new Uint8Array(await file.arrayBuffer());
    const { error: uploadErr } = await supabase.storage
      .from(STORAGE_BUCKET_INPUTS)
      .upload(inputImagePath, uploadBytes, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadErr) {
      return NextResponse.json({ error: uploadErr.message }, { status: 500 });
    }

    const { error: insertErr } = await supabase.from("guest_trials").insert({
      id: trialId,
      trial_token: trialToken,
      input_image_path: inputImagePath,
      room_type: roomType,
      goal,
      style_key: styleKey,
      budget_tier: budgetTier,
      mode,
      strength,
      status: "draft",
      generation_status: "queued",
    });

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        ok: true,
        token: trialToken,
        trialId,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "demo_generate_failed" },
      { status: 500 }
    );
  }
}