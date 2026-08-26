export const FLOW_ERROR_MESSAGES: Record<string, string> = {
  missing_file: "Choose a room photo before starting the preview.",
  empty_file: "That photo appears to be empty. Choose another JPG, PNG, or WebP image.",
  heic_not_supported:
    "HEIC/HEIF photos are not supported yet. On iPhone, choose Most Compatible in Settings > Camera > Formats, or export this photo as a JPG, then try again.",
  invalid_file_type: "Choose a JPG, PNG, or WebP room photo.",
  file_too_large:
    "This photo is larger than 10 MB. Choose a smaller copy or reduce the photo size, then try again.",
  invalid_image_content:
    "We could not read that image. Export it again as a JPG, PNG, or WebP, then retry.",
  unauthorized: "Your sign-in expired. Sign in again, then retry your room preview.",
  invalid_json: "We could not read this request. Refresh the page and try again.",
  invalid_request: "We could not read this request. Refresh the page and try again.",
  missing_roomId: "We could not identify this room preview. Refresh the page and try again.",
  forbidden: "We could not verify access to this room preview. Sign in again and retry.",
  missing_path: "We could not prepare this photo for upload. Please choose it again.",
  forbidden_path: "We could not verify this upload. Refresh the page and try again.",
  upload_prepare_failed: "We could not prepare the photo upload. Please try again.",
  signed_url_failed: "We could not prepare the photo upload. Please try again.",
  missing_upload_token: "The upload setup was incomplete. Please choose the photo again.",
  storage_upload_failed: "The photo upload did not finish. Check your connection and try again.",
  guest_session_invalid: "This upload session expired. Choose the photo again to restart it.",
  guest_session_failed: "We could not start a secure upload session. Please try again.",
  room_create_failed: "Your photo uploaded, but we could not create the room preview. Please try again.",
  choice_save_failed: "We could not save your room choices. Please try again.",
  generation_job_creation_failed:
    "Your photo uploaded, but we could not start the generation job. Please try again.",
  generation_request_failed: "We could not start the room preview. Please try again.",
  room_not_found: "We could not find this room preview. Start a fresh preview and try again.",
  room_incomplete: "This room preview is missing a photo or choice. Start it again.",
  already_generating: "This room preview is already starting. Please wait a moment.",
  limit_reached: "You have reached this month's preview limit.",
  missing_openai_key: "The image service is not configured right now. Please try again later.",
  openai_image_failed: "The image service could not finish this preview. Please try again.",
  output_upload_failed: "The preview was created, but we could not save it. Please try again.",
  generation_failed: "We could not finish this preview. Your original photo and choices are safe.",
};

export function getFlowErrorMessage(code: unknown, fallback: string) {
  return typeof code === "string" && FLOW_ERROR_MESSAGES[code]
    ? FLOW_ERROR_MESSAGES[code]
    : fallback;
}

export function readFriendlyApiError(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;

  const body = payload as { code?: unknown; error?: unknown };
  if (typeof body.code === "string" && FLOW_ERROR_MESSAGES[body.code]) {
    return FLOW_ERROR_MESSAGES[body.code];
  }

  if (
    typeof body.error === "string" &&
    body.error.length > 0 &&
    !/^[a-z0-9_]+$/.test(body.error)
  ) {
    return body.error;
  }

  return getFlowErrorMessage(body.error, fallback);
}

export function flowErrorBody(code: string, stage: string, requestId: string) {
  return {
    error: getFlowErrorMessage(code, "We could not complete this request. Please try again."),
    code,
    stage,
    requestId,
  };
}
