// app/api/generate/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { randomUUID } from "crypto";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  STORAGE_BUCKET_INPUTS,
  STORAGE_BUCKET_OUTPUTS,
} from "@/lib/cozylogic/constants";
import {
  getPlanStateAndResetIfNeeded,
  incrementUsage,
} from "@/lib/cozylogic/plan";
import { devBypassLimits } from "@/lib/cozylogic/dev";
import { pruneUserGenerations } from "@/lib/cozylogic/prune";

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
};

function humanize(s: string) {
  return (s ?? "").replaceAll("_", " ");
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
  // gpt-image-1 supports it; mini does not
  return model === "gpt-image-1";
}

function chooseInputFidelity(budgetTier: string): InputFidelity {
  // rearrange_only should preserve more
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

/**
 * PASS 1: Tidy only, keep furniture + architecture identical.
 */
function buildTidyPrompt() {
  return `
You are preparing a real photo for an interior redesign.

TASK: TIDY + ORGANIZE ONLY. Do NOT redesign style. Do NOT replace major furniture.

ABSOLUTE LOCK:
- SAME room, SAME camera angle, SAME framing, SAME perspective.
- Do NOT add/remove/move walls, windows, doors, openings, trim, baseboards, ceiling height.
- Curtains/blinds must remain EXACTLY the same (same open/closed state + same coverage).
- Do NOT change the visible outdoors brightness/view framing.
- Do NOT change floor material or built-ins.
- No text, logos, watermarks.
- Do NOT change lens/FOV or crop.

CLUTTER HANDLING:
- Gather loose items into baskets, lidded boxes, trays, bins, drawers, or a small movable closed cabinet.
- Keep it believable: leave 1–3 realistic items visible on surfaces.
- Do NOT erase clutter into empty space. Replace clutter with plausible organization.

RESULT:
- Same room, same angle, but visibly tidier and more organized.
- Lighting stays natural and consistent.
`.trim();
}

/**
 * PASS 2A: Rearrange-only (NO replacements).
 * Note: This is best-effort; the model may still “cheat” occasionally.
 */
function buildRearrangeOnlyPrompt(room: {
  room_type: string;
  goal: string;
  style_key: string;
  budget_tier: string;
}) {
  const style = humanize(room.style_key);

  return `
You are an expert home stager. Create a realistic "AFTER" photo of the SAME room.

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
- No text, logos, watermarks.
- Do NOT change lens/FOV or crop.

ALLOWED CHANGES:
- You MAY move/rotate/reposition existing furniture to improve flow.
- You MAY tidy and organize using baskets, bins, trays, and small organizers only.
- Keep it believable (do not make it staged-empty).

STYLE TARGET (achieve via staging only): ${style}
- Better symmetry, negative space, and cleaner surfaces.
- Improved arrangement of pillows/throws (but do NOT change them to new ones).
`.trim();
}

/**
 * PASS 2B: Full redesign (replacements allowed).
 */
function buildRedesignPrompt(room: {
  room_type: string;
  goal: string;
  style_key: string;
  budget_tier: string;
}) {
  const style = humanize(room.style_key);
  const kit = styleKit(room.style_key);

  return `
You are an expert interior designer. Create a MAGAZINE-WORTHY "AFTER" photo.

ARCHITECTURE LOCK:
- SAME room, SAME camera angle, SAME framing.
- Do NOT add/remove/move walls, windows, doors, openings, trim, baseboards, ceiling height.
- Curtains/blinds must remain EXACTLY the same (same open/closed state + same coverage).
- Do NOT change the visible outdoors brightness/view framing.
- Do NOT change floor material or built-ins.
- No text, logos, watermarks.
- Do NOT change lens/FOV or crop to hide areas.

TRANSFORMATION REQUIREMENT:
This must look like a full redesign, not a filter. Clearly different furniture + decor.

Room: ${humanize(room.room_type)}
Goal: ${humanize(room.goal)}
Style: ${style}
Budget: ${humanize(room.budget_tier)}

You may reposition furniture to create a new layout (float sofa, swap chair placement),
but do not alter architecture. At least TWO major items must move position.

You MUST change AT LEAST 8 of these (visibly):
1) Replace main seating silhouette
2) Replace coffee table shape/material
3) Replace rug pattern/texture
4) Add layered lighting (floor + table lamp) with warm glow
5) Replace wall art scale/composition
6) Change textiles (pillows/throws; keep curtain state identical)
7) Introduce 2–3 decor accents
8) Add one new secondary piece (accent chair/ottoman/side table)
9) Update color palette (clearly different harmony)
10) Improve layout flow (noticeable repositioning)

STYLE LOCK (unmistakably ${style}):
- Cohesive palette + material story
- Layered texture + designer styling

${kit ? `\n${kit}\n` : ""}

PHOTOREALISM:
- Real shadows, believable proportions, editorial real estate photo look.
`.trim();
}

/**
 * After generation: organizer recommendations prompt (JSON-only).
 */
function buildOrganizerRecsPrompt(room: {
  room_type: string;
  goal: string;
  style_key: string;
  budget_tier: string;
}) {
  return `
You are an interior organizing expert.

Given:
- Room: ${humanize(room.room_type)}
- Goal: ${humanize(room.goal)}
- Style: ${humanize(room.style_key)}
- Budget tier: ${humanize(room.budget_tier)}

Return ONLY valid JSON (no markdown) with this shape:
{
  "items": [
    {
      "category": "Baskets / bins / trays / shelves / hampers / cable management / under-bed storage",
      "name": "short product-style name",
      "why": "1 sentence why it helps this room",
      "placement": "where it goes in the room",
      "size_hint": "optional short size note",
      "finish_hint": "materials/colors that match the style"
    }
  ],
  "notes": "1 short sentence"
}

Rules:
- Do NOT invent brands, links, or retailers.
- Suggest 5–8 items max.
- Make suggestions realistic for a normal home.
- Match the style with materials/finishes.
`.trim();
}

function safeJson<T = any>(s: string): T | null {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

/**
 * TS-safe Buffer -> Blob
 * Allocates a fresh ArrayBuffer so TS never sees SharedArrayBuffer.
 */
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
  forceNoInputFidelity?: boolean;
}) {
  const { openai, model, prompt, input, inputMime, budgetTier, forceNoInputFidelity } = opts;

  const blob = bufferToBlob(input, inputMime, `input.${extFromMime(inputMime)}`);

  const params: any = {
    model,
    prompt,
    image: blob,
    size: "1536x1024",
    quality: "high",
    output_format: "png",
  };

  if (!forceNoInputFidelity && supportsInputFidelity(model)) {
    params.input_fidelity = chooseInputFidelity(budgetTier); // "high" | "low"
  }

  const img = await openai.images.edit(params);
  const b64 = img.data?.[0]?.b64_json;
  if (!b64) throw new Error("openai_no_image_returned");
  return Buffer.from(b64, "base64"); // png bytes
}

async function setRoomStep(
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>,
  roomId: string,
  patch: Partial<Pick<RoomRow, "status" | "generation_status" | "generation_error">>
) {
  // best-effort updates
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

export async function POST(req: Request) {
  const supabase = await getSupabaseServerClient();
  const admin = getSupabaseAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Parse body
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const roomId = body?.roomId as string | undefined;
  if (!roomId) return NextResponse.json({ error: "missing_roomId" }, { status: 400 });

  // Load room
  const { data: room, error: roomErr } = await supabase
    .from("rooms")
    .select(
      "id,user_id,room_type,goal,style_key,budget_tier,input_image_path,status,generation_status,generation_error"
    )
    .eq("id", roomId)
    .single<RoomRow>();

  if (roomErr || !room) return NextResponse.json({ error: "room_not_found" }, { status: 404 });
  if (room.user_id !== user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  if (!room.input_image_path || !room.goal || !room.style_key || !room.budget_tier) {
    return NextResponse.json({ error: "room_incomplete" }, { status: 400 });
  }

  // ✅ SPAM GUARD
  if (isGenerating(room)) {
    return NextResponse.json({ error: "already_generating" }, { status: 409 });
  }

  // Mark generating immediately so repeat clicks are blocked
  await setRoomStep(supabase, room.id, {
    status: "generating",
    generation_status: "queued",
    generation_error: null,
  });

  // Plan enforcement
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

  const model = process.env.COZYLOGIC_IMAGE_MODEL || "gpt-image-1";
  const textModel = process.env.COZYLOGIC_TEXT_MODEL || "gpt-4.1-mini";

  const outputPath = `${user.id}/${randomUUID()}.png`;

  try {
    // 1) Download input
    const dl = await admin.storage.from(STORAGE_BUCKET_INPUTS).download(room.input_image_path);
    if (dl.error) throw dl.error;

    const inputBytes = Buffer.from(await dl.data.arrayBuffer());
    const inputMime = getMimeFromPath(room.input_image_path);

    const openai = new OpenAI({ apiKey: openaiKey });

    // 2) PASS 1: tidy
    await setRoomStep(supabase, room.id, { generation_status: "tidy" });

    const tidyBytes = await editImage({
      openai,
      model,
      prompt: buildTidyPrompt(),
      input: inputBytes,
      inputMime,
      budgetTier: room.budget_tier,
      forceNoInputFidelity: true, // keep this neutral
    });

    // 3) PASS 2: rearrange-only vs full redesign
    const isRearrangeOnly = room.budget_tier === "rearrange_only";

    await setRoomStep(supabase, room.id, {
      generation_status: isRearrangeOnly ? "rearrange" : "redesign",
    });

    const pass2Prompt = isRearrangeOnly
      ? buildRearrangeOnlyPrompt(room)
      : buildRedesignPrompt(room);

    const finalBytes = await editImage({
      openai,
      model,
      prompt: pass2Prompt,
      input: tidyBytes,
      inputMime: "image/png",
      budgetTier: room.budget_tier,
    });

    // 4) Upload output
    await setRoomStep(supabase, room.id, { generation_status: "uploading" });

    const up = await admin.storage.from(STORAGE_BUCKET_OUTPUTS).upload(outputPath, finalBytes, {
      contentType: "image/png",
      upsert: false,
      cacheControl: "3600",
    });
    if (up.error) throw up.error;

    // 5) Persist generation row (capture id)
    const watermarked = planState.plan !== "pro";

    const { data: genRow, error: genErr } = await supabase
      .from("generations")
      .insert({
        room_id: room.id,
        user_id: user.id,
        provider: "openai",
        prompt_version: isRearrangeOnly ? "v5_2pass_rearrange" : "v5_2pass_redesign",
        output_image_path: outputPath,
        watermarked,
        explanation: isRearrangeOnly
          ? "• Tidied + organized without replacing furniture\n• Rearranged existing pieces for better flow and calm\n• Used organizers (bins/baskets/trays) where needed"
          : "• Tidied + organized the space while preserving architecture\n• Updated the core swap set for a clear style identity\n• Refined layout, lighting, and textiles for stronger flow",
      })
      .select("id")
      .single();

    if (genErr) throw genErr;

    // 6) After-generation organizer recommendations (best-effort)
    try {
      const recsPrompt = buildOrganizerRecsPrompt(room);

      const rec = await openai.chat.completions.create({
        model: textModel,
        temperature: 0.4,
        messages: [
          { role: "system", content: "Return only JSON. No markdown. No extra text." },
          { role: "user", content: recsPrompt },
        ],
      });

      const raw = rec.choices?.[0]?.message?.content?.trim() ?? "";
      const parsed = safeJson(raw);

      await supabase
        .from("generations")
        .update({
          organizer_recs_json: parsed ?? null,
          organizer_recs_raw: parsed ? null : raw,
        })
        .eq("id", genRow.id);
    } catch {
      // ignore: never fail the generation because recs failed
    }

    // 7) Update room status
    await setRoomStep(supabase, room.id, {
      status: "generated",
      generation_status: "done",
      generation_error: null,
    });

    // 8) Auto-prune for plan limits (best-effort)
    try {
      await pruneUserGenerations(user.id);
    } catch {}

    return NextResponse.json({ ok: true, outputPath });
  } catch (e: any) {
    if (didIncrement) {
      try {
        await incrementUsage(user.id, prevUsed);
      } catch {}
    }

    await setRoomStep(supabase, room.id, {
      status: "error",
      generation_status: "error",
      generation_error: e?.message ?? "generation_failed",
    });

    return NextResponse.json({ error: e?.message ?? "generation_failed" }, { status: 500 });
  }
}