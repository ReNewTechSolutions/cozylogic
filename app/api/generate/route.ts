// app/api/generate/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { STORAGE_BUCKET_INPUTS, STORAGE_BUCKET_OUTPUTS } from "@/lib/cozylogic/constants";
import { getPlanStateAndResetIfNeeded, incrementUsage } from "@/lib/cozylogic/plan";

function humanize(s: string) {
  return s.replaceAll("_", " ");
}

export async function POST(req: Request) {
  const supabase = await getSupabaseServerClient();

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

  const roomId = body?.roomId as string | undefined;
  if (!roomId) return NextResponse.json({ error: "missing_roomId" }, { status: 400 });

  const { data: room, error: roomErr } = await supabase
    .from("rooms")
    .select("id,user_id,room_type,goal,style_key,budget_tier,input_image_path,status")
    .eq("id", roomId)
    .single();

  if (roomErr || !room) return NextResponse.json({ error: "room_not_found" }, { status: 404 });
  if (room.user_id !== user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  if (!room.input_image_path || !room.goal || !room.style_key || !room.budget_tier) {
    return NextResponse.json({ error: "room_incomplete" }, { status: 400 });
  }

  // Plan enforcement
  const planState = await getPlanStateAndResetIfNeeded(user.id);
  if (typeof planState.limit === "number" && planState.used >= planState.limit) {
    return NextResponse.json({ error: "limit_reached", code: "LIMIT_REACHED" }, { status: 402 });
  }

  const prevUsed = planState.used;
  await incrementUsage(user.id, prevUsed + 1);

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    await incrementUsage(user.id, prevUsed);
    return NextResponse.json({ error: "missing_openai_key" }, { status: 500 });
  }

  const model = process.env.COZYLOGIC_IMAGE_MODEL || "gpt-image-1-mini";

  const outputPath = `${user.id}/${crypto.randomUUID()}.png`;

  try {
    // 1) Download the uploaded input image from Supabase Storage (server-side)
    const admin = getSupabaseAdminClient();

    const dl = await admin.storage.from(STORAGE_BUCKET_INPUTS).download(room.input_image_path);
    if (dl.error) throw dl.error;

    const arrayBuffer = await dl.data.arrayBuffer();
    const inputBytes = Buffer.from(arrayBuffer);

    // Make a data URL for the Image Edit endpoint
    // (We don’t need to upload to OpenAI Files API for this MVP.)
    const inputDataUrl = `data:image/jpeg;base64,${inputBytes.toString("base64")}`;

    // 2) Build a strong “photorealistic redesign” prompt
    // Keep it very explicit: preserve architecture, change decor/layout only.
    const prompt = [
      `Photorealistic interior redesign of this ${humanize(room.room_type)}.`,
      `Goal: ${humanize(room.goal)}.`,
      `Style direction: ${humanize(room.style_key)}.`,
      `Budget tier: ${humanize(room.budget_tier)}.`,
      ``,
      `Constraints:`,
      `- Keep the same room and camera angle (same architecture).`,
      `- Do not change windows/doors/walls/ceiling height.`,
      `- Improve layout, furniture placement, lighting, and decor to match the style.`,
      `- Make it realistic, like a high-end staged photo.`,
      `- No text, logos, watermarks.`,
    ].join("\n");

    // 3) Call OpenAI Image Edit
    const openai = new OpenAI({ apiKey: openaiKey });

    const img = await openai.images.edit({
      model,
      prompt,
      images: [{ image_url: inputDataUrl }],
      size: "1536x1024",
      quality: "medium",
      output_format: "png",
      // If you want tighter preservation of the original layout/geometry:
      // input_fidelity: "high",
      moderation: "auto",
    });

    const b64 = img.data?.[0]?.b64_json;
    if (!b64) throw new Error("openai_no_image_returned");

    const outBytes = Buffer.from(b64, "base64");

    // 4) Upload output to private bucket
    const up = await admin.storage.from(STORAGE_BUCKET_OUTPUTS).upload(outputPath, outBytes, {
      contentType: "image/png",
      upsert: false,
      cacheControl: "3600",
    });
    if (up.error) throw up.error;

    // 5) Write generation record + mark room generated
    const watermarked = planState.plan !== "pro";

    const { error: genErr } = await supabase.from("generations").insert({
      room_id: room.id,
      user_id: user.id,
      provider: "openai",
      prompt_version: "v1",
      output_image_path: outputPath,
      watermarked,
      explanation:
        "• Optimized layout for better flow\n• Refined palette + textures for the chosen style\n• Suggested budget-aware swaps that elevate the space",
    });
    if (genErr) throw genErr;

    const { error: roomUpdateErr } = await supabase.from("rooms").update({ status: "generated" }).eq("id", room.id);
    if (roomUpdateErr) throw roomUpdateErr;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    // Roll back usage (best effort)
    try {
      await incrementUsage(user.id, prevUsed);
    } catch {}

    return NextResponse.json({ error: e?.message ?? "generation_failed" }, { status: 500 });
  }
}