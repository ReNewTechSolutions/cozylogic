import { NextRequest, NextResponse } from "next/server";

import { getSupabaseRouteClient } from "@/lib/supabase/route";
import { flowErrorBody } from "@/lib/cozylogic/flowErrors";
import { getRequestId, logServerEvent, logServerFailure } from "@/lib/cozylogic/serverLog";
import { isOwnedUploadPath } from "@/lib/cozylogic/uploads";

export async function POST(req: NextRequest) {
  const response = NextResponse.json({ ok: true });
  const supabase = getSupabaseRouteClient(req, response);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const requestId = getRequestId(body?.requestId);
  if (authError || !user) {
    logServerFailure("signed-upload", "auth", authError ?? new Error("unauthorized"), {
      requestId,
    });
    return NextResponse.json(flowErrorBody("unauthorized", "auth", requestId), { status: 401 });
  }

  const path = typeof body?.path === "string" ? body.path : "";
  const status = body?.status;
  const durationMs =
    typeof body?.durationMs === "number" &&
    Number.isFinite(body.durationMs) &&
    body.durationMs >= 0 &&
    body.durationMs <= 10 * 60 * 1000
      ? Math.round(body.durationMs)
      : undefined;
  if (
    !isOwnedUploadPath(path, user.id) ||
    !["started", "succeeded", "failed"].includes(status)
  ) {
    logServerFailure("signed-upload", "upload_status", new Error("invalid_request"), {
      requestId,
    });
    return NextResponse.json(flowErrorBody("invalid_request", "upload_status", requestId), {
      status: 400,
    });
  }

  if (status === "started") {
    logServerEvent("signed-upload", "upload_start", { requestId, stage: "storage_upload" });
  } else {
    logServerEvent("signed-upload", "storage_status", {
      requestId,
      stage: "storage_upload",
      status,
      errorCode:
        typeof body?.errorCode === "string" && /^[A-Za-z0-9_.:-]{1,100}$/.test(body.errorCode)
          ? body.errorCode
          : undefined,
    });
    logServerEvent("signed-upload", "upload_end", {
      requestId,
      stage: "storage_upload",
      status,
      durationMs,
    });
    if (status === "failed") {
      logServerFailure("signed-upload", "storage_upload", new Error("storage_upload_failed"), {
        requestId,
      });
    }
  }

  return new NextResponse(null, { status: 204 });
}
