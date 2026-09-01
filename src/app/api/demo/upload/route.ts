import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { STORAGE_BUCKET_INPUTS } from "@/lib/cozylogic/constants";
import {
  createDemoUploadSession,
  verifyDemoUploadSession,
} from "@/lib/cozylogic/demoUploadSession";
import { flowErrorBody } from "@/lib/cozylogic/flowErrors";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getRequestId, logServerEvent, logServerFailure } from "@/lib/cozylogic/serverLog";
import { validateImageFileMetadata } from "@/lib/cozylogic/uploads";

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  let body: any;
  try {
    body = await req.json();
  } catch {
    const requestId = getRequestId();
    logServerFailure("demo-upload", "request_validation", new Error("invalid_json"), {
      requestId,
    });
    return NextResponse.json(flowErrorBody("invalid_json", "request_validation", requestId), {
      status: 400,
    });
  }

  const requestId = getRequestId(body?.requestId);
  const validation = validateImageFileMetadata({
    name: body?.fileName,
    type: body?.fileType,
    size: body?.fileSize,
  });
  if (validation.ok === false) {
    logServerFailure("demo-upload", "file_validation", new Error(validation.code), {
      requestId,
      elapsedMs: Date.now() - startedAt,
    });
    return NextResponse.json(flowErrorBody(validation.code, "file_validation", requestId), {
      status: 400,
    });
  }

  const uploadId = randomUUID();
  const path = `guest/${uploadId}/${randomUUID()}.${validation.extension}`;
  logServerEvent("demo-upload", "upload_preparation_started", {
    requestId,
    uploadId,
    fileType: validation.mimeType,
    fileBytes: body.fileSize,
  });

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET_INPUTS)
      .createSignedUploadUrl(path);

    if (error) throw error;

    const sessionToken = createDemoUploadSession({
      uploadId,
      path,
      fileType: validation.mimeType,
      fileSize: body.fileSize,
    });

    logServerEvent("demo-upload", "guest_session_created", {
      requestId,
      uploadId,
      elapsedMs: Date.now() - startedAt,
    });
    logServerEvent("demo-upload", "storage_status", {
      requestId,
      uploadId,
      stage: "signed_url_request",
      status: "ready",
    });

    return NextResponse.json(
      { ok: true, requestId, uploadId, path, token: data.token, sessionToken },
      { status: 200 }
    );
  } catch (error) {
    const code =
      error instanceof Error && error.message === "guest_session_failed"
        ? "guest_session_failed"
        : "signed_url_failed";
    logServerFailure("demo-upload", "upload_preparation", error, {
      requestId,
      uploadId,
      elapsedMs: Date.now() - startedAt,
    });
    return NextResponse.json(flowErrorBody(code, "upload_preparation", requestId), { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const requestId = getRequestId(body?.requestId);
  try {
    const session = verifyDemoUploadSession(body?.sessionToken);
    if (body?.uploadId !== session.uploadId) throw new Error("guest_session_invalid");

    const status = body?.status;
    const durationMs =
      typeof body?.durationMs === "number" &&
      Number.isFinite(body.durationMs) &&
      body.durationMs >= 0 &&
      body.durationMs <= 10 * 60 * 1000
        ? Math.round(body.durationMs)
        : undefined;
    if (!["started", "succeeded", "failed"].includes(status)) {
      throw new Error("invalid_request");
    }

    if (status === "started") {
      logServerEvent("demo-upload", "upload_start", {
        requestId,
        uploadId: session.uploadId,
        stage: "storage_upload",
      });
    } else {
      logServerEvent("demo-upload", "storage_status", {
        requestId,
        uploadId: session.uploadId,
        stage: "storage_upload",
        status,
        errorCode:
          typeof body?.errorCode === "string" && /^[A-Za-z0-9_.:-]{1,100}$/.test(body.errorCode)
            ? body.errorCode
            : undefined,
      });
      logServerEvent("demo-upload", "upload_end", {
        requestId,
        uploadId: session.uploadId,
        stage: "storage_upload",
        status,
        durationMs,
      });
      if (status === "failed") {
        logServerFailure("demo-upload", "storage_upload", new Error("storage_upload_failed"), {
          requestId,
          uploadId: session.uploadId,
        });
      }
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logServerFailure("demo-upload", "upload_status", error, { requestId });
    return NextResponse.json(flowErrorBody("guest_session_invalid", "upload_status", requestId), {
      status: 400,
    });
  }
}
