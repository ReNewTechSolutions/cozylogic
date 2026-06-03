// src/app/api/demo/generate/route.ts
import { createHash, randomUUID } from "crypto";
import { after, NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  STORAGE_BUCKET_INPUTS,
  STORAGE_BUCKET_OUTPUTS,
  BUDGET_TIERS,
  GOALS,
  ROOM_TYPES,
  STYLES,
} from "@/lib/cozylogic/constants";
import { getConfiguredImageModel } from "@/lib/cozylogic/generationConfig";

type RoomType = (typeof ROOM_TYPES)[number];
type GoalKey = (typeof GOALS)[number];
type StyleKey = (typeof STYLES)[number];
type BudgetTier = (typeof BUDGET_TIERS)[number];
type ModeKey = "reality_lock" | "precision" | "creative";
const ACTIVE_OR_COMPLETED_TRIAL_STATUSES = ["draft", "queued", "generating", "generated"];

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

function safeMode(value: string | null): ModeKey {
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

function bufferToBlob(input: Buffer, mime: string, filename: string) {
  const ab = new ArrayBuffer(input.byteLength);
  new Uint8Array(ab).set(input);
  const blob = new Blob([ab], { type: mime }) as any;
  blob.name = filename;
  return blob;
}

function buildDemoIdempotencyKey(args: {
  inputBytes: Buffer;
  roomType: RoomType;
  goal: GoalKey;
  styleKey: StyleKey;
  budgetTier: BudgetTier;
  mode: ModeKey;
  strength: number;
}) {
  const fileHash = createHash("sha256").update(args.inputBytes).digest("hex");

  return createHash("sha256")
    .update(
      [
        "guest",
        fileHash,
        args.roomType,
        args.goal,
        args.styleKey,
        args.budgetTier,
        args.mode,
        String(args.strength),
      ].join("|")
    )
    .digest("hex");
}

function getTrialResponse(trial: { id: string; trial_token: string }, reused = false) {
  return {
    ok: true,
    token: trial.trial_token,
    trialId: trial.id,
    generationId: trial.id,
    reused,
    statusUrl: `/api/demo/${encodeURIComponent(trial.trial_token)}/status`,
    resultUrl: `/demo/result/${trial.trial_token}`,
  };
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

function buildDemoPrompt(args: {
  roomType: RoomType;
  goal: GoalKey;
  styleKey: StyleKey;
  budgetTier: BudgetTier;
  mode: ModeKey;
  strength: number;
}) {
  const modeInstruction =
    args.mode === "reality_lock"
      ? "Preserve the real room very tightly. Keep walls, windows, doors, flooring, perspective, and camera angle as close to the original as possible."
      : args.mode === "creative"
        ? "Allow a stronger transformation while still respecting the original room structure and camera angle."
        : "Create a realistic redesign with controlled, believable changes that still clearly matches the original room.";

  return [
    "You are redesigning a real interior photo.",
    `Room type: ${args.roomType.replaceAll("_", " ")}.`,
    `Goal: ${args.goal.replaceAll("_", " ")}.`,
    `Style: ${args.styleKey.replaceAll("_", " ")}.`,
    `Budget: ${args.budgetTier.replaceAll("_", " ")}.`,
    `Strength: ${args.strength}/100.`,
    modeInstruction,
    "Keep the image photorealistic.",
    "Do not invent a different room.",
    "Do not change the viewpoint.",
    "Do not turn this into a fantasy render.",
    "Return a polished before-and-after style redesign of the same exact room.",
  ].join(" ");
}

async function updateTrial(
  supabase: ReturnType<typeof getAdminClient>,
  trialId: string,
  patch: Record<string, unknown>
) {
  const { error } = await supabase.from("guest_trials").update(patch).eq("id", trialId);
  if (error) {
    console.error("guest_trials update failed", trialId, error);
  }
}

async function processGuestTrial(args: {
  trialId: string;
  inputImagePath: string;
  inputBytes: Buffer;
  fileType: string;
  fileExt: string;
  roomType: RoomType;
  goal: GoalKey;
  styleKey: StyleKey;
  budgetTier: BudgetTier;
  mode: ModeKey;
  strength: number;
}) {
  const supabase = getAdminClient();

  await updateTrial(supabase, args.trialId, {
    status: "generating",
    generation_status: "preparing",
    generation_error: null,
  });

  const apiKey = process.env.OPENAI_API_KEY ?? "";
  if (!apiKey) {
    await updateTrial(supabase, args.trialId, {
      status: "failed",
      generation_status: "error",
      generation_error: "Missing OPENAI_API_KEY.",
    });
    return;
  }

  try {
    await updateTrial(supabase, args.trialId, {
      generation_status: "rendering",
    });

    const prompt = buildDemoPrompt({
      roomType: args.roomType,
      goal: args.goal,
      styleKey: args.styleKey,
      budgetTier: args.budgetTier,
      mode: args.mode,
      strength: args.strength,
    });

    const formData = new FormData();
    formData.append("model", getConfiguredImageModel());
    formData.append("prompt", prompt);
    formData.append("size", "1536x1024");
    formData.append("quality", "medium");
    formData.append(
      "image",
      bufferToBlob(args.inputBytes, args.fileType, `input.${args.fileExt}`),
      `input.${args.fileExt}`
    );

    const openAiRes = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    const payload = await openAiRes.json().catch(() => ({} as any));

    if (!openAiRes.ok) {
      const message =
        payload?.error?.message ?? payload?.error ?? "OpenAI image edit failed.";
      await updateTrial(supabase, args.trialId, {
        status: "failed",
        generation_status: "error",
        generation_error: message,
      });
      return;
    }

    const b64 = payload?.data?.[0]?.b64_json as string | undefined;
    if (!b64) {
      await updateTrial(supabase, args.trialId, {
        status: "failed",
        generation_status: "error",
        generation_error: "Image generation returned no image data.",
      });
      return;
    }

    const outputImagePath = `guest/${args.trialId}/${randomUUID()}.png`;
    const outputBytes = Buffer.from(b64, "base64");

    const { error: outputUploadErr } = await supabase.storage
      .from(STORAGE_BUCKET_OUTPUTS)
      .upload(outputImagePath, outputBytes, {
        contentType: "image/png",
        upsert: false,
      });

    if (outputUploadErr) {
      await updateTrial(supabase, args.trialId, {
        status: "failed",
        generation_status: "error",
        generation_error: outputUploadErr.message,
      });
      return;
    }

    await updateTrial(supabase, args.trialId, {
      output_image_path: outputImagePath,
      status: "generated",
      generation_status: "generated",
      generation_error: null,
    });
  } catch (error: any) {
    await updateTrial(supabase, args.trialId, {
      status: "failed",
      generation_status: "error",
      generation_error: error?.message ?? "demo_generation_failed",
    });
  }
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
    const ext = safeExt(file);
    const inputBytes = Buffer.from(await file.arrayBuffer());
    const idempotencyKey = buildDemoIdempotencyKey({
      inputBytes,
      roomType,
      goal,
      styleKey,
      budgetTier,
      mode,
      strength,
    });

    const { data: existingTrial } = await supabase
      .from("guest_trials")
      .select("id,trial_token,status,generation_status,output_image_path")
      .eq("trial_token", idempotencyKey)
      .in("status", ACTIVE_OR_COMPLETED_TRIAL_STATUSES)
      .maybeSingle();

    if (existingTrial) {
      return NextResponse.json(getTrialResponse(existingTrial, true), { status: 200 });
    }

    const trialId = randomUUID();
    const trialToken = idempotencyKey;
    const inputImagePath = `guest/${trialId}/${randomUUID()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from(STORAGE_BUCKET_INPUTS)
      .upload(inputImagePath, inputBytes, {
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
      status: "queued",
      generation_status: "queued",
      generation_error: null,
    });

    if (insertErr) {
      const { data: insertedElsewhere } = await supabase
        .from("guest_trials")
        .select("id,trial_token,status,generation_status,output_image_path")
        .eq("trial_token", trialToken)
        .in("status", ACTIVE_OR_COMPLETED_TRIAL_STATUSES)
        .maybeSingle();

      if (insertedElsewhere) {
        return NextResponse.json(getTrialResponse(insertedElsewhere, true), { status: 200 });
      }

      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    after(async () => {
      await processGuestTrial({
        trialId,
        inputImagePath,
        inputBytes,
        fileType: file.type,
        fileExt: ext,
        roomType,
        goal,
        styleKey,
        budgetTier,
        mode,
        strength,
      });
    });

    return NextResponse.json(getTrialResponse({ id: trialId, trial_token: trialToken }), {
      status: 202,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "demo_generate_failed" },
      { status: 500 }
    );
  }
}
