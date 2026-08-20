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
import {
  getPlanStateAndResetIfNeeded,
  incrementUsage,
  type PlanState,
} from "@/lib/cozylogic/plan";
import { devBypassLimits } from "@/lib/cozylogic/dev";
import { pruneUserGenerations } from "@/lib/cozylogic/prune";
import {
  getConfiguredImageModel,
  getConfiguredImageModelFallback,
  getConfiguredImageQuality,
  getConfiguredImageSize,
  type ImageQuality,
  type ImageSize,
} from "@/lib/cozylogic/generationConfig";

type InputFidelity = "high" | "low";

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

const ACTIVE_OR_COMPLETED_ROOM_STATUSES = ["queued", "generating", "generated"];
const ROOM_SELECT =
  "id,user_id,room_type,goal,style_key,budget_tier,input_image_path,status,generation_status,generation_error,mode,strength";

function logGenerationTiming(
  scope: string,
  event: string,
  startedAt: number,
  details: Record<string, unknown> = {}
) {
  console.info(`[CozyLogic ${scope}] ${event}`, {
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

function supportsInputFidelity(model: string) {
  return model === "gpt-image-1";
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
    .select("id,status,generation_status,generation_error,updated_at")
    .eq("user_id", userId)
    .eq("input_image_path", room.input_image_path)
    .eq("room_type", room.room_type)
    .eq("goal", room.goal)
    .eq("style_key", room.style_key)
    .eq("budget_tier", room.budget_tier)
    .in("status", ACTIVE_OR_COMPLETED_ROOM_STATUSES)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (room.mode) query = query.eq("mode", room.mode);
  if (typeof room.strength === "number") query = query.eq("strength", room.strength);

  const { data } = await query.maybeSingle();
  return data as { id: string; status: string | null; generation_status: string | null } | null;
}

function chooseInputFidelity(budgetTier: string): InputFidelity {
  if (budgetTier === "rearrange_only") return "high";
  return "low";
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

function buildRearrangeOnlyPrompt(room: {
  room_type: string;
  goal: string;
  style_key: string;
  budget_tier: string;
}) {
  const style = friendlyLabel(STYLE_LABELS, room.style_key);

  return `
You are an expert home stager. Create a realistic "AFTER" photo of the SAME room.

OUTPUT CONTRACT:
- Return exactly ONE realistic "AFTER" image of this same room.
- Do not return a collage, split screen, before/after composite, multiple views, text, labels, logos, or watermarks.

STRICT RULE: DO NOT REPLACE FURNITURE OR DECOR.
- Keep the user's existing major furniture the SAME:
  sofa/sectional, chairs, coffee table, side tables, TV/console, bed frame/dresser if present.
- Do NOT change silhouettes, materials, designs, or swap to new items.
- Do NOT add a new rug, new lamp, new wall art, or new furniture.

ARCHITECTURE LOCK:
- SAME room, SAME camera angle, SAME framing.
- Do NOT add/remove/move walls, windows, doors, openings, trim, baseboards, ceiling height.
- Curtains/blinds must remain EXACTLY the same (same open/closed state + same coverage).
- Do NOT change the visible outdoors brightness/view framing.
- Do NOT change floor material or built-ins.
- Do NOT change lens/FOV or crop.
- If a TV is present, keep the same TV on the same wall and in the same location, orientation, and scale.

ALLOWED CHANGES:
- You MAY move/rotate/reposition existing furniture to improve flow.
- You MAY tidy and organize using baskets, bins, trays, and small organizers only.
- Keep it believable (do not make it staged-empty).

STYLE TARGET (achieve via staging only): ${style}
- Better symmetry, negative space, and cleaner surfaces.
- Improved arrangement of pillows/throws (but do NOT change them to new ones).
`.trim();
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
  fallbackModel?: string | null;
  prompt: string;
  input: Buffer;
  inputMime: string;
  budgetTier: string;
  quality: ImageQuality;
  size: ImageSize;
  forceNoInputFidelity?: boolean;
}) {
  const {
    openai,
    model,
    fallbackModel,
    prompt,
    input,
    inputMime,
    budgetTier,
    quality,
    size,
    forceNoInputFidelity,
  } = opts;

  const blob = bufferToBlob(input, inputMime, `input.${extFromMime(inputMime)}`);

  async function runImageEdit(modelName: string) {
    const params: any = {
      model: modelName,
      prompt,
      image: blob,
      size,
      quality,
      output_format: "png",
    };

    if (!forceNoInputFidelity && supportsInputFidelity(modelName)) {
      params.input_fidelity = chooseInputFidelity(budgetTier);
    }

    const img = await openai.images.edit(params);
    const b64 = img.data?.[0]?.b64_json;
    if (!b64) throw new Error("openai_no_image_returned");
    return Buffer.from(b64, "base64");
  }

  try {
    return await runImageEdit(model);
  } catch (error) {
    if (!fallbackModel) throw error;

    console.warn("Primary image model failed; retrying fallback model.", {
      model,
      fallbackModel,
    });
    return runImageEdit(fallbackModel);
  }
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
  const model = getConfiguredImageModel();
  const fallbackModel = getConfiguredImageModelFallback(model);
  const quality = getConfiguredImageQuality(planState.plan === "pro" ? "medium" : "low");
  const size = getConfiguredImageSize("1024x1024");
  const outputPath = `${userId}/${randomUUID()}.png`;

  try {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) throw new Error("missing_openai_key");

    await setRoomStep(admin, room.id, {
      status: "generating",
      generation_status: "analyzing",
      generation_error: null,
    });

    const dl = await admin.storage.from(STORAGE_BUCKET_INPUTS).download(room.input_image_path);
    if (dl.error) throw dl.error;

    const inputBytes = Buffer.from(await dl.data.arrayBuffer());
    const inputMime = getMimeFromPath(room.input_image_path);
    const openai = new OpenAI({ apiKey: openaiKey });
    logGenerationTiming("generate-job", "image input prepared", startedAt, {
      roomId: room.id,
      inputBytes: inputBytes.byteLength,
      inputMime,
    });

    const isRearrangeOnly = room.budget_tier === "rearrange_only";

    await setRoomStep(admin, room.id, {
      generation_status: isRearrangeOnly ? "rearrange" : "redesign",
    });

    const prompt = isRearrangeOnly ? buildRearrangeOnlyPrompt(room) : buildRedesignPrompt(room);

    logGenerationTiming("generate-job", "OpenAI image call started", startedAt, {
      roomId: room.id,
      model,
      fallbackModel,
      quality,
      size,
      passCount: 1,
    });
    let finalBytes: Buffer;
    try {
      finalBytes = await editImage({
        openai,
        model,
        fallbackModel,
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
        error: error?.message ?? "openai_image_failed",
      });
      throw error;
    }

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

    const watermarked = planState.plan !== "pro";

    const { data: genRow, error: genErr } = await admin
      .from("generations")
      .insert({
        room_id: room.id,
        user_id: userId,
        provider: "openai",
        prompt_version: isRearrangeOnly ? "v6_1pass_rearrange" : "v6_1pass_redesign",
        output_image_path: outputPath,
        watermarked,
        explanation: isRearrangeOnly
          ? "• Rearranged existing pieces for better flow and calm\n• Tidied with organizers where useful\n• Kept furniture and architecture close to the original"
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

    try {
      await pruneUserGenerations(userId);
    } catch {}
  } catch (e: any) {
    await rollbackUsageIfNeeded({ admin, userId, didIncrement, prevUsed });

    await setRoomStep(admin, room.id, {
      status: "error",
      generation_status: "error",
      generation_error: e?.message ?? "generation_failed",
    });
  }
}

export async function POST(req: NextRequest) {
  const requestStartedAt = Date.now();
  const requestId = randomUUID();
  logGenerationTiming("generate", "request received", requestStartedAt, { requestId });

  const res = NextResponse.next();
  const supabase = getSupabaseRouteClient(req, res);

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const roomId = body?.roomId as string | undefined;
  if (!roomId) return NextResponse.json({ error: "missing_roomId" }, { status: 400 });

  const { data: room, error: roomErr } = await supabase
    .from("rooms")
    .select(ROOM_SELECT)
    .eq("id", roomId)
    .single<RoomRow>();

  if (roomErr || !room) return NextResponse.json({ error: "room_not_found" }, { status: 404 });
  if (room.user_id !== user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  if (!room.input_image_path || !room.goal || !room.style_key || !room.budget_tier) {
    return NextResponse.json({ error: "room_incomplete" }, { status: 400 });
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
    return NextResponse.json(getJobResponse(existingRoom.id, idempotencyKey, true), { status: 200 });
  }

  if (isGenerating(room) || room.status === "generated") {
    logGenerationTiming("generate", "response returned", requestStartedAt, {
      requestId,
      roomId: room.id,
      status: 200,
      reused: true,
    });
    return NextResponse.json(getJobResponse(room.id, idempotencyKey, true), { status: 200 });
  }

  const { data: locked, error: lockErr } = await supabase
    .from("rooms")
    .update({ status: "queued", generation_status: "queued", generation_error: null })
    .eq("id", room.id)
    .eq("status", "draft")
    .select("id")
    .maybeSingle();

  if (lockErr) throw lockErr;

  if (!locked) {
    const { data: currentRoom } = await supabase
      .from("rooms")
      .select("id,status,generation_status,generation_error")
      .eq("id", room.id)
      .maybeSingle();

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

    return NextResponse.json({ error: "already_generating" }, { status: 409 });
  }

  const bypass = devBypassLimits();
  const planState = await getPlanStateAndResetIfNeeded(user.id);
  const prevUsed = planState.used;
  const didIncrement = !bypass;

  if (!bypass) {
    if (typeof planState.limit === "number" && planState.used >= planState.limit) {
      await setRoomStep(supabase, room.id, {
        status: "error",
        generation_status: "error",
        generation_error: "limit_reached",
      });
      return NextResponse.json({ error: "limit_reached", code: "LIMIT_REACHED" }, { status: 402 });
    }
    await incrementUsage(user.id, prevUsed + 1);
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    if (didIncrement) {
      try {
        await incrementUsage(user.id, prevUsed);
      } catch {}
    }
    await setRoomStep(supabase, room.id, {
      status: "error",
      generation_status: "error",
      generation_error: "missing_openai_key",
    });
    return NextResponse.json({ error: "missing_openai_key" }, { status: 500 });
  }

  const queuedRoom: RoomRow = {
    ...room,
    status: "queued",
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

  logGenerationTiming("generate", "response returned", requestStartedAt, {
    requestId,
    roomId: room.id,
    status: 202,
    reused: false,
  });
  return NextResponse.json(getJobResponse(room.id, idempotencyKey), { status: 202 });
}
