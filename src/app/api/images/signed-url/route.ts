// src/app/api/images/signed-url/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseRouteClient } from "@/lib/supabase/route";
import { STORAGE_BUCKET_INPUTS } from "@/lib/cozylogic/constants";
import { flowErrorBody } from "@/lib/cozylogic/flowErrors";
import { getRequestId, logServerEvent, logServerFailure } from "@/lib/cozylogic/serverLog";
import {
  isOwnedUploadPath,
  validateImageFileMetadata,
} from "@/lib/cozylogic/uploads";

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const response = NextResponse.json({ ok: true });
  const supabase = getSupabaseRouteClient(req, response);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    const requestId = getRequestId();
    logServerFailure("signed-upload", "auth", authError ?? new Error("unauthorized"), {
      requestId,
      elapsedMs: Date.now() - startedAt,
    });
    return NextResponse.json(flowErrorBody("unauthorized", "auth", requestId), { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    const requestId = getRequestId();
    logServerFailure("signed-upload", "request_validation", new Error("invalid_json"), {
      requestId,
      elapsedMs: Date.now() - startedAt,
    });
    return NextResponse.json(flowErrorBody("invalid_json", "request_validation", requestId), {
      status: 400,
    });
  }

  const requestId = getRequestId(body?.requestId);
  const path = typeof body?.path === "string" ? body.path : "";
  if (!path) {
    logServerFailure("signed-upload", "upload_preparation", new Error("missing_path"), {
      requestId,
      elapsedMs: Date.now() - startedAt,
    });
    return NextResponse.json(flowErrorBody("missing_path", "upload_preparation", requestId), {
      status: 400,
    });
  }

  if (!isOwnedUploadPath(path, user.id)) {
    logServerFailure("signed-upload", "upload_preparation", new Error("forbidden_path"), {
      requestId,
      elapsedMs: Date.now() - startedAt,
    });
    return NextResponse.json(flowErrorBody("forbidden_path", "upload_preparation", requestId), {
      status: 403,
    });
  }

  const validation = validateImageFileMetadata({
    name: path,
    type: body?.fileType,
    size: body?.fileSize,
  });
  if (validation.ok === false) {
    const code = validation.code;
    logServerFailure("signed-upload", "file_validation", new Error(code), {
      requestId,
      elapsedMs: Date.now() - startedAt,
    });
    return NextResponse.json(flowErrorBody(code, "file_validation", requestId), { status: 400 });
  }

  if (!path.endsWith(`.${validation.extension}`)) {
    const code = "invalid_file_type";
    logServerFailure("signed-upload", "file_validation", new Error(code), {
      requestId,
      elapsedMs: Date.now() - startedAt,
    });
    return NextResponse.json(flowErrorBody(code, "file_validation", requestId), { status: 400 });
  }

  logServerEvent("signed-upload", "upload_preparation_started", {
    requestId,
    fileType: validation.mimeType,
    fileBytes: body.fileSize,
  });
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET_INPUTS)
    .createSignedUploadUrl(path);

  if (error) {
    logServerFailure("signed-upload", "signed_url_request", error, {
      requestId,
      elapsedMs: Date.now() - startedAt,
    });
    return NextResponse.json(flowErrorBody("signed_url_failed", "signed_url_request", requestId), {
      status: 500,
    });
  }

  logServerEvent("signed-upload", "storage_status", {
    requestId,
    stage: "signed_url_request",
    status: "ready",
    elapsedMs: Date.now() - startedAt,
  });
  return NextResponse.json({ token: data.token, requestId }, { status: 200 });
}
