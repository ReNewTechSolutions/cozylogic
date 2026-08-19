// src/app/api/demo/generate/route.ts
import { createHash, randomUUID } from "crypto";
import { after, NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  BUDGET_LABELS,
  BUDGET_PROMPT_MEANINGS,
  STORAGE_BUCKET_INPUTS,
  STORAGE_BUCKET_OUTPUTS,
  BUDGET_TIERS,
  GOAL_LABELS,
  GOALS,
  ROOM_LABELS,
  ROOM_TYPES,
  STYLE_LABELS,
  STYLES,
} from "@/lib/cozylogic/constants";
import {
  getConfiguredImageModel,
  getConfiguredImageModelFallback,
  getConfiguredImageQuality,
  getConfiguredImageSize,
  type ImageQuality,
  type ImageSize,
} from "@/lib/cozylogic/generationConfig";

type RoomType = (typeof ROOM_TYPES)[number];
type GoalKey = (typeof GOALS)[number];
type StyleKey = (typeof STYLES)[number];
type BudgetTier = (typeof BUDGET_TIERS)[number];
type ModeKey = "reality_lock" | "precision" | "creative";
const ACTIVE_OR_COMPLETED_TRIAL_STATUSES = ["draft", "queued", "generating", "generated"];

function logDemoGenerationTiming(
  event: string,
  startedAt: number,
  details: Record<string, unknown> = {}
) {
  console.info(`[CozyLogic demo-generate] ${event}`, {
    elapsedMs: Date.now() - startedAt,
    ...details,
  });
}

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

function friendlyLabel(labels: Partial<Record<string, string>>, value: string) {
  return labels[value] ?? value.replaceAll("_", " ");
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
    `Room type: ${friendlyLabel(ROOM_LABELS, args.roomType)}.`,
    `Goal: ${friendlyLabel(GOAL_LABELS, args.goal)}.`,
    `Style: ${friendlyLabel(STYLE_LABELS, args.styleKey)}.`,
    `Budget: ${friendlyLabel(BUDGET_LABELS, args.budgetTier)}.`,
    `Budget meaning: ${friendlyLabel(BUDGET_PROMPT_MEANINGS, args.budgetTier)}.`,
    `Strength: ${args.strength}/100.`,
    modeInstruction,
    "Keep the image photorealistic.",
    "Do not invent a different room.",
    "Do not change the viewpoint.",
    "Do not turn this into a fantasy render.",
    "Return a polished before-and-after style redesign of the same exact room.",
  ].join(" ");
}

async function requestImageEdit(args: {
  apiKey: string;
  model: string;
  prompt: string;
  inputBytes: Buffer;
  fileType: string;
  fileExt: string;
  quality: ImageQuality;
  size: ImageSize;
}) {
  const formData = new FormData();
  formData.append("model", args.model);
  formData.append("prompt", args.prompt);
  formData.append("size", args.size);
  formData.append("quality", args.quality);
  formData.append(
    "image",
    bufferToBlob(args.inputBytes, args.fileType, `input.${args.fileExt}`),
    `input.${args.fileExt}`
  );

  return fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
    },
    body: formData,
  });
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
  const startedAt = Date.now();

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

    const model = getConfiguredImageModel();
    const fallbackModel = getConfiguredImageModelFallback(model);
    const quality = getConfiguredImageQuality("low");
    const size = getConfiguredImageSize("1024x1024");

    logDemoGenerationTiming("OpenAI image call started", startedAt, {
      trialId: args.trialId,
      model,
      fallbackModel,
      quality,
      size,
      passCount: 1,
    });

    let openAiRes: Response;
    let payload: any;
    try {
      openAiRes = await requestImageEdit({
        apiKey,
        model,
        prompt,
        inputBytes: args.inputBytes,
        fileType: args.fileType,
        fileExt: args.fileExt,
        quality,
        size,
      });
      payload = await openAiRes.json().catch(() => ({} as any));

      if (!openAiRes.ok && fallbackModel) {
        console.warn("Primary demo image model failed; retrying fallback model.", {
          model,
          fallbackModel,
          status: openAiRes.status,
          message: payload?.error?.message ?? payload?.error,
        });
        openAiRes = await requestImageEdit({
          apiKey,
          model: fallbackModel,
          prompt,
          inputBytes: args.inputBytes,
          fileType: args.fileType,
          fileExt: args.fileExt,
          quality,
          size,
        });
        payload = await openAiRes.json().catch(() => ({} as any));
      }
      logDemoGenerationTiming("OpenAI image call finished", startedAt, {
        trialId: args.trialId,
        status: openAiRes.status,
        ok: openAiRes.ok,
      });
    } catch (error: any) {
      logDemoGenerationTiming("OpenAI image call finished", startedAt, {
        trialId: args.trialId,
        ok: false,
        error: error?.message ?? "openai_image_failed",
      });
      throw error;
    }

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

    logDemoGenerationTiming("Supabase upload started", startedAt, {
      trialId: args.trialId,
      outputImagePath,
    });
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
    logDemoGenerationTiming("Supabase upload finished", startedAt, {
      trialId: args.trialId,
      outputImagePath,
    });

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
  const requestStartedAt = Date.now();
  const requestId = randomUUID();
  logDemoGenerationTiming("request received", requestStartedAt, { requestId });

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
    logDemoGenerationTiming("image input prepared", requestStartedAt, {
      requestId,
      inputBytes: inputBytes.byteLength,
      fileType: file.type,
    });
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
      logDemoGenerationTiming("response returned", requestStartedAt, {
        requestId,
        trialId: existingTrial.id,
        status: 200,
        reused: true,
      });
      return NextResponse.json(getTrialResponse(existingTrial, true), { status: 200 });
    }

    const trialId = randomUUID();
    const trialToken = idempotencyKey;
    const inputImagePath = `guest/${trialId}/${randomUUID()}.${ext}`;

    logDemoGenerationTiming("Supabase upload started", requestStartedAt, {
      requestId,
      trialId,
      inputImagePath,
      kind: "input",
    });
    const { error: uploadErr } = await supabase.storage
      .from(STORAGE_BUCKET_INPUTS)
      .upload(inputImagePath, inputBytes, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadErr) {
      return NextResponse.json({ error: uploadErr.message }, { status: 500 });
    }
    logDemoGenerationTiming("Supabase upload finished", requestStartedAt, {
      requestId,
      trialId,
      inputImagePath,
      kind: "input",
    });

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
        logDemoGenerationTiming("response returned", requestStartedAt, {
          requestId,
          trialId: insertedElsewhere.id,
          status: 200,
          reused: true,
        });
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

    logDemoGenerationTiming("response returned", requestStartedAt, {
      requestId,
      trialId,
      status: 202,
      reused: false,
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
