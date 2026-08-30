// src/app/api/generate/route.ts
import { after, NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createHash, randomUUID } from "crypto";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseRouteClient } from "@/lib/supabase/route";
import {
  BUDGET_LABELS,
  BUDGET_PROMPT_MEANINGS,
  GOAL_LABELS,
  ROOM_LABELS,
  STORAGE_BUCKET_INPUTS,
  STORAGE_BUCKET_OUTPUTS,
  STYLE_LABELS,
} from "@/lib/cozylogic/constants";
import { flowErrorBody } from "@/lib/cozylogic/flowErrors";
import {
  getPlanStateAndResetIfNeeded,
  incrementUsage,
  type PlanState,
} from "@/lib/cozylogic/plan";
import { devBypassLimits } from "@/lib/cozylogic/dev";
import { pruneUserGenerations } from "@/lib/cozylogic/prune";
import {
  getConfiguredImageGeneration,
  type ImageQuality,
  type ImageSize,
} from "@/lib/cozylogic/generationConfig";
import { buildFreeFixImagePrompt } from "@/lib/cozylogic/freeFixPrompt";
import { getImageEditInputFidelity } from "@/lib/cozylogic/imageEditPolicy";
import {
  getRequestId,
  logServerEvent,
  logServerFailure,
  safeErrorDetails,
} from "@/lib/cozylogic/serverLog";
import {
  hasMatchingImageSignature,
  MAX_IMAGE_UPLOAD_BYTES,
} from "@/lib/cozylogic/uploads";

type RoomRow = {
  id: string;
  user_id: string;
  room_type: string;
  goal: string;
  style_key: string;
  budget_tier: string;
  input_image_path: string;
  status: string | null;
  generation_status: string | null;
  generation_error: string | null;
  mode: string | null;
  strength: number | null;
};

const ACTIVE_OR_COMPLETED_ROOM_STATUSES = ["generating", "generated"];
const ROOM_SELECT =
  "id,user_id,room_type,goal,style_key,budget_tier,input_image_path,status,generation_status,generation_error,mode,strength";

function logGenerationTiming(
  scope: string,
  event: string,
  startedAt: number,
  details: Record<string, unknown> = {}
) {
  logServerEvent(scope, event, {
    elapsedMs: Date.now() - startedAt,
    ...details,
  });
}

function humanize(s: string) {
  return (s ?? "").replaceAll("_", " ");
}

function friendlyLabel(labels: Partial<Record<string, string>>, value: string) {
  return labels[value] ?? humanize(value);
}

function getMimeFromPath(path: string) {
  const p = (path || "").toLowerCase();
  if (p.endsWith(".png")) return "image/png";
  if (p.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

function extFromMime(mime: string) {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

function buildRoomGenerationKey(userId: string, room: RoomRow) {
  return createHash("sha256")
    .update(
      [
        "room",
        userId,
        room.input_image_path,
        room.room_type,
        room.goal,
        room.style_key,
        room.budget_tier,
        room.mode ?? "precision",
        String(room.strength ?? 60),
      ].join("|")
    )
    .digest("hex");
}

function getJobResponse(roomId: string, idempotencyKey: string, reused = false) {
  return {
    ok: true,
    generationId: roomId,
    roomId,
    idempotencyKey,
    reused,
    statusUrl: `/api/generate/status?id=${encodeURIComponent(roomId)}`,
    resultUrl: `/app/result/${roomId}`,
  };
}

async function findExistingMatchingRoom(supabase: any, userId: string, room: RoomRow) {
  let query = supabase
    .from("rooms")
    .select("id,status,generation_status,generation_error,created_at")
    .eq("user_id", userId)
    .eq("input_image_path", room.input_image_path)
    .eq("room_type", room.room_type)
    .eq("goal", room.goal)
    .eq("style_key", room.style_key)
    .eq("budget_tier", room.budget_tier)
    .in("status", ACTIVE_OR_COMPLETED_ROOM_STATUSES)
    .order("created_at", { ascending: false })
    .limit(1);

  if (room.mode) query = query.eq("mode", room.mode);
  if (typeof room.strength === "number") query = query.eq("strength", room.strength);

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data as { id: string; status: string | null; generation_status: string | null } | null;
}

function styleKit(style_key: string) {
  switch (style_key) {
    case "soft_boho":
      return `
Style kit (Soft Boho, editorial):
- Palette: warm white + sand + terracotta + olive + black accents
- Materials: light oak, rattan, linen, boucle, handmade ceramics
- Shapes: rounded coffee table, arched mirror, sculptural lamp
- Rug: vintage-inspired pattern or woven jute with subtle border
- Art: large-scale abstract line art or tonal landscape diptych
`.trim();

    case "japandi":
      return `
Style kit (Japandi, high-end):
- Palette: warm white + taupe + charcoal + natural wood
- Materials: oak, paper/linen, matte ceramic, black metal
- Shapes: low-profile seating, minimal decor, negative space
- Rug: flatweave neutral with subtle texture
- Art: one large minimal print or textured canvas
`.trim();

    case "modern_minimal":
      return `
Style kit (Modern Minimal):
- Palette: warm white + light greige + charcoal accents
- Materials: light oak / walnut, matte black metal, linen upholstery
- Shapes: clean lines, low clutter, fewer but larger statement pieces
- Rug: neutral low pile, subtle weave (no busy patterns)
- Art: 1–2 oversized abstracts with generous white space
- Lighting: sculptural floor lamp + small table lamp, warm 2700K
`.trim();

    default:
      return "";
  }
}

function buildRedesignPrompt(room: {
  room_type: string;
  goal: string;
  style_key: string;
  budget_tier: string;
}) {
  const style = friendlyLabel(STYLE_LABELS, room.style_key);
  const kit = styleKit(room.style_key);
  const roomType = friendlyLabel(ROOM_LABELS, room.room_type);
  const goal = friendlyLabel(GOAL_LABELS, room.goal);
  const budget = friendlyLabel(BUDGET_LABELS, room.budget_tier);
  const budgetMeaning = friendlyLabel(BUDGET_PROMPT_MEANINGS, room.budget_tier);

  return `
You are an expert interior designer. Create a realistic "AFTER" photo of the SAME room.

OUTPUT CONTRACT:
- Return exactly ONE realistic "AFTER" image of this same room.
- Do not return a collage, split screen, before/after composite, multiple views, text, labels, logos, or watermarks.

ARCHITECTURE LOCK:
- SAME room, SAME camera angle, SAME framing.
- Do NOT add/remove/move walls, windows, doors, openings, trim, baseboards, ceiling height.
- Curtains/blinds must remain EXACTLY the same (same open/closed state + same coverage).
- Do NOT change the visible outdoors brightness/view framing.
- Do NOT change floor material or built-ins.
- Do NOT change lens/FOV or crop to hide areas.
- If a TV is present, keep the same TV on the same wall and in the same location, orientation, and scale.

REALISTIC REFRESH:
Make a controlled, practical improvement that remains unmistakably the same real room.
Tidy and organize visible clutter during the same edit pass using believable baskets, trays, bins, or closed storage.
Do not simply erase clutter into empty space.

Room: ${roomType}
Goal: ${goal}
Style: ${style}
Budget: ${budget}
Budget meaning: ${budgetMeaning}

Change only the furniture, lighting, textiles, color, and decor needed to express the requested style and budget.
Keep major furniture in its original location unless a small, realistic adjustment clearly improves function.
Do not force major movement, replace every item, or change the room beyond what the requested budget supports.

STYLE LOCK (unmistakably ${style}):
- Cohesive palette + material story
- Layered texture + designer styling

${kit ? `\n${kit}\n` : ""}

PHOTOREALISM:
- Real shadows, believable proportions, and a natural interior-photo finish.
`.trim();
}

// Buffer -> Blob (TS-safe)
function bufferToBlob(input: Buffer, mime: string, filename: string) {
  const ab = new ArrayBuffer(input.byteLength);
  new Uint8Array(ab).set(input);
  const blob = new Blob([ab], { type: mime }) as any;
  blob.name = filename;
  return blob;
}

async function editImage(opts: {
  openai: OpenAI;
  model: string;
  prompt: string;
  input: Buffer;
  inputMime: string;
  budgetTier: string;
  quality: ImageQuality;
  size: ImageSize;
}) {
  const {
    openai,
    model,
    prompt,
    input,
    inputMime,
    budgetTier,
    quality,
    size,
  } = opts;

  const blob = bufferToBlob(input, inputMime, `input.${extFromMime(inputMime)}`);

  async function runImageEdit(modelName: string) {
    const params: any = {
      model: modelName,
      prompt,
      image: blob,
      size,
      quality,
      n: 1,
      output_format: "png",
    };

    const inputFidelity = getImageEditInputFidelity(modelName, budgetTier);
    if (inputFidelity) params.input_fidelity = inputFidelity;

    const img = await openai.images.edit(params);
    const b64 = img.data?.[0]?.b64_json;
    if (!b64) throw new Error("openai_no_image_returned");
    return Buffer.from(b64, "base64");
  }

  return runImageEdit(model);
}

async function setRoomStep(
  supabase: any,
  roomId: string,
  patch: Partial<Pick<RoomRow, "status" | "generation_status" | "generation_error">>
) {
  try {
    await supabase.from("rooms").update(patch).eq("id", roomId);
  } catch {}
}

function isGenerating(room: Pick<RoomRow, "status" | "generation_status">) {
  const step = room.generation_status ?? "";
  return (
    room.status === "generating" ||
    room.status === "queued" ||
    ["queued", "tidy", "rearrange", "redesign", "uploading"].includes(step)
  );
}

async function rollbackUsageIfNeeded(opts: {
  admin: any;
  userId: string;
  didIncrement: boolean;
  prevUsed: number;
}) {
  if (!opts.didIncrement) return;

  try {
    await opts.admin
      .from("profiles")
      .update({ monthly_generations_used: opts.prevUsed })
      .eq("id", opts.userId);
  } catch {}
}

async function processRoomGeneration(opts: {
  room: RoomRow;
  userId: string;
  planState: PlanState;
  didIncrement: boolean;
  prevUsed: number;
}) {
  const { room, userId, planState, didIncrement, prevUsed } = opts;
  const admin = getSupabaseAdminClient();
  const startedAt = Date.now();
  const { model, quality, size } = getConfiguredImageGeneration({
    budgetTier: room.budget_tier,
    defaultQuality: planState.plan === "pro" ? "medium" : "low",
    defaultSize: "auto",
  });
  const outputPath = `${userId}/${randomUUID()}.png`;
  let activeStage = "generation_setup";

  try {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) throw new Error("missing_openai_key");

    await setRoomStep(admin, room.id, {
      status: "generating",
      generation_status: "analyzing",
      generation_error: null,
    });

    activeStage = "input_storage_download";
    logGenerationTiming("generate-job", "storage status", startedAt, {
      roomId: room.id,
      stage: activeStage,
      status: "started",
    });
    const dl = await admin.storage.from(STORAGE_BUCKET_INPUTS).download(room.input_image_path);
    if (dl.error) throw dl.error;

    const inputBytes = Buffer.from(await dl.data.arrayBuffer());
    const inputMime = getMimeFromPath(room.input_image_path);
    if (
      inputBytes.byteLength <= 0 ||
      inputBytes.byteLength > MAX_IMAGE_UPLOAD_BYTES ||
      !hasMatchingImageSignature(inputBytes, inputMime)
    ) {
      throw new Error("invalid_image_content");
    }
    logGenerationTiming("generate-job", "storage status", startedAt, {
      roomId: room.id,
      stage: activeStage,
      status: "succeeded",
    });
    const openai = new OpenAI({ apiKey: openaiKey, maxRetries: 0 });
    logGenerationTiming("generate-job", "image input prepared", startedAt, {
      roomId: room.id,
      inputBytes: inputBytes.byteLength,
      inputMime,
    });

    const isRearrangeOnly = room.budget_tier === "rearrange_only";

    await setRoomStep(admin, room.id, {
      generation_status: isRearrangeOnly ? "rearrange" : "redesign",
    });

    const prompt = isRearrangeOnly
      ? buildFreeFixImagePrompt({
          roomTypeLabel: friendlyLabel(ROOM_LABELS, room.room_type),
          styleLabel: friendlyLabel(STYLE_LABELS, room.style_key),
        })
      : buildRedesignPrompt(room);

    activeStage = "openai_call";
    logGenerationTiming("generate-job", "OpenAI image call started", startedAt, {
      roomId: room.id,
      model,
      quality,
      size,
      passCount: 1,
    });
    let finalBytes: Buffer;
    try {
      finalBytes = await editImage({
        openai,
        model,
        prompt,
        input: inputBytes,
        inputMime,
        budgetTier: room.budget_tier,
        quality,
        size,
      });
      logGenerationTiming("generate-job", "OpenAI image call finished", startedAt, {
        roomId: room.id,
        outputBytes: finalBytes.byteLength,
        ok: true,
      });
    } catch (error: any) {
      logGenerationTiming("generate-job", "OpenAI image call finished", startedAt, {
        roomId: room.id,
        ok: false,
        error: safeErrorDetails(error),
      });
      throw error;
    }

    activeStage = "output_storage_upload";
    await setRoomStep(admin, room.id, { generation_status: "uploading" });

    logGenerationTiming("generate-job", "Supabase upload started", startedAt, {
      roomId: room.id,
      outputPath,
    });
    const up = await admin.storage.from(STORAGE_BUCKET_OUTPUTS).upload(outputPath, finalBytes, {
      contentType: "image/png",
      upsert: false,
      cacheControl: "3600",
    });
    if (up.error) throw up.error;
    logGenerationTiming("generate-job", "Supabase upload finished", startedAt, {
      roomId: room.id,
      outputPath,
    });
    logGenerationTiming("generate-job", "storage status", startedAt, {
      roomId: room.id,
      stage: activeStage,
      status: "succeeded",
    });

    const watermarked = planState.plan !== "pro";

    activeStage = "generation_record_creation";
    const { data: genRow, error: genErr } = await admin
      .from("generations")
      .insert({
        room_id: room.id,
        user_id: userId,
        provider: "openai",
        prompt_version: isRearrangeOnly
          ? "v7_1pass_object_preservation"
          : "v6_1pass_redesign",
        output_image_path: outputPath,
        watermarked,
        explanation: isRearrangeOnly
          ? "• Preserved every major visible object\n• Rearranged existing movable pieces for better flow\n• Straightened and presented existing belongings without adding anything"
          : "• Redesigned the space while preserving architecture\n• Tidied and styled the room in one faster pass\n• Refined layout, lighting, and textiles for stronger flow",
      })
      .select("id")
      .single();

    if (genErr) throw genErr;

    await setRoomStep(admin, room.id, {
      status: "generated",
      generation_status: "done",
      generation_error: null,
    });
    logGenerationTiming("generate-job", "generation marked done", startedAt, {
      roomId: room.id,
      generationId: genRow.id,
    });
    logGenerationTiming("generate-job", "final_success", startedAt, {
      roomId: room.id,
      finalStage: "generated",
    });

    try {
      await pruneUserGenerations(userId);
    } catch {}
  } catch (e: any) {
    await rollbackUsageIfNeeded({ admin, userId, didIncrement, prevUsed });

    const generationError =
      e?.message === "invalid_image_content"
        ? "invalid_image_content"
        : activeStage === "openai_call"
          ? "openai_image_failed"
          : activeStage === "output_storage_upload"
            ? "output_upload_failed"
            : "generation_failed";
    await setRoomStep(admin, room.id, {
      status: "failed",
      generation_status: "error",
      generation_error: generationError,
    });
    logServerFailure("generate-job", activeStage, e, {
      roomId: room.id,
      elapsedMs: Date.now() - startedAt,
    });
  }
}

export async function POST(req: NextRequest) {
  const requestStartedAt = Date.now();
  let requestId: string = randomUUID();
  let routeSupabase: any = null;
  let lockedRoomId: string | null = null;
  let jobAccepted = false;
  let pendingUsageRollback: { userId: string; prevUsed: number } | null = null;
  logGenerationTiming("generate", "request received", requestStartedAt, { requestId });

  const failure = (
    code: string,
    stage: string,
    status: number,
    error: unknown,
    details: Record<string, unknown> = {}
  ) => {
    logServerFailure("generate", stage, error, {
      requestId,
      elapsedMs: Date.now() - requestStartedAt,
      ...details,
    });
    return NextResponse.json(flowErrorBody(code, stage, requestId), { status });
  };

  try {
    const res = NextResponse.next();
    const supabase = getSupabaseRouteClient(req, res);
    routeSupabase = supabase;

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return failure("unauthorized", "auth", 401, authErr ?? new Error("unauthorized"));
    }

    let body: any;
    try {
      body = await req.json();
    } catch (error) {
      return failure("invalid_json", "request_validation", 400, error);
    }
    requestId = getRequestId(body?.requestId);

    const roomId = body?.roomId as string | undefined;
    if (!roomId) {
      return failure("missing_roomId", "request_validation", 400, new Error("missing_roomId"));
    }

    const { data: room, error: roomErr } = await supabase
      .from("rooms")
      .select(ROOM_SELECT)
      .eq("id", roomId)
      .single<RoomRow>();

    if (roomErr || !room) {
      return failure("room_not_found", "room_lookup", 404, roomErr ?? new Error("room_not_found"), {
        roomId,
      });
    }
    if (room.user_id !== user.id) {
      return failure("forbidden", "authorization", 403, new Error("forbidden"), { roomId });
    }

    if (!room.input_image_path || !room.goal || !room.style_key || !room.budget_tier) {
      return failure("room_incomplete", "request_validation", 400, new Error("room_incomplete"), {
        roomId,
      });
    }

    const idempotencyKey = buildRoomGenerationKey(user.id, room);
    const existingRoom = await findExistingMatchingRoom(supabase, user.id, room);

    if (existingRoom) {
      logGenerationTiming("generate", "response returned", requestStartedAt, {
        requestId,
        roomId: existingRoom.id,
        status: 200,
        reused: true,
      });
      logGenerationTiming("generate", "final_success", requestStartedAt, {
        requestId,
        roomId: existingRoom.id,
        finalStage: "job_reused",
      });
      return NextResponse.json(getJobResponse(existingRoom.id, idempotencyKey, true), {
        status: 200,
      });
    }

    if (isGenerating(room) || room.status === "generated") {
      logGenerationTiming("generate", "response returned", requestStartedAt, {
        requestId,
        roomId: room.id,
        status: 200,
        reused: true,
      });
      logGenerationTiming("generate", "final_success", requestStartedAt, {
        requestId,
        roomId: room.id,
        finalStage: "job_reused",
      });
      return NextResponse.json(getJobResponse(room.id, idempotencyKey, true), { status: 200 });
    }

    logGenerationTiming("generate", "generation job creation started", requestStartedAt, {
      requestId,
      roomId: room.id,
    });
    const { data: locked, error: lockErr } = await supabase
      .from("rooms")
      .update({ status: "generating", generation_status: "queued", generation_error: null })
      .eq("id", room.id)
      .eq("status", "draft")
      .select("id")
      .maybeSingle();

    if (lockErr) {
      return failure("generation_job_creation_failed", "generation_job_creation", 500, lockErr, {
        roomId,
      });
    }

    if (!locked) {
      const { data: currentRoom, error: currentRoomError } = await supabase
        .from("rooms")
        .select("id,status,generation_status,generation_error")
        .eq("id", room.id)
        .maybeSingle();

      if (currentRoomError) {
        return failure(
          "generation_job_creation_failed",
          "generation_job_creation",
          500,
          currentRoomError,
          { roomId }
        );
      }

      if (
        currentRoom &&
        (ACTIVE_OR_COMPLETED_ROOM_STATUSES.includes(String(currentRoom.status)) ||
          isGenerating(currentRoom))
      ) {
        logGenerationTiming("generate", "response returned", requestStartedAt, {
          requestId,
          roomId: room.id,
          status: 200,
          reused: true,
        });
        return NextResponse.json(getJobResponse(room.id, idempotencyKey, true), { status: 200 });
      }

      return failure("already_generating", "generation_job_creation", 409, new Error("already_generating"), {
        roomId,
      });
    }
    lockedRoomId = room.id;
    logGenerationTiming("generate", "generation job creation finished", requestStartedAt, {
      requestId,
      roomId: room.id,
      status: "queued",
    });

    const bypass = devBypassLimits();
    const planState = await getPlanStateAndResetIfNeeded(user.id);
    const prevUsed = planState.used;
    const didIncrement = !bypass;

    if (!bypass) {
      if (typeof planState.limit === "number" && planState.used >= planState.limit) {
        await setRoomStep(supabase, room.id, {
          status: "failed",
          generation_status: "error",
          generation_error: "limit_reached",
        });
        return failure("limit_reached", "usage_limit", 402, new Error("limit_reached"), {
          roomId,
        });
      }
      await incrementUsage(user.id, prevUsed + 1);
      pendingUsageRollback = { userId: user.id, prevUsed };
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      if (didIncrement) {
        try {
          await incrementUsage(user.id, prevUsed);
        } catch {}
      }
      await setRoomStep(supabase, room.id, {
        status: "failed",
        generation_status: "error",
        generation_error: "missing_openai_key",
      });
      return failure("missing_openai_key", "openai_configuration", 500, new Error("missing_openai_key"), {
        roomId,
      });
    }

    const queuedRoom: RoomRow = {
      ...room,
      status: "generating",
      generation_status: "queued",
      generation_error: null,
    };

    after(async () => {
      await processRoomGeneration({
        room: queuedRoom,
        userId: user.id,
        planState,
        didIncrement,
        prevUsed,
      });
    });
    jobAccepted = true;
    pendingUsageRollback = null;

    logGenerationTiming("generate", "response returned", requestStartedAt, {
      requestId,
      roomId: room.id,
      status: 202,
      reused: false,
    });
    logGenerationTiming("generate", "final_success", requestStartedAt, {
      requestId,
      roomId: room.id,
      finalStage: "job_queued",
    });
    return NextResponse.json(getJobResponse(room.id, idempotencyKey), { status: 202 });
  } catch (error) {
    if (pendingUsageRollback) {
      try {
        await incrementUsage(
          pendingUsageRollback.userId,
          pendingUsageRollback.prevUsed
        );
      } catch {}
    }
    if (routeSupabase && lockedRoomId && !jobAccepted) {
      await setRoomStep(routeSupabase, lockedRoomId, {
        status: "draft",
        generation_status: null,
        generation_error: null,
      });
      logGenerationTiming("generate", "generation job rollback", requestStartedAt, {
        requestId,
        roomId: lockedRoomId,
        status: "draft",
      });
    }
    return failure("generation_request_failed", "generation_request", 500, error);
  }
}
