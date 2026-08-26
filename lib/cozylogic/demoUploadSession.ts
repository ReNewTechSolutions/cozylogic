import { createHmac, timingSafeEqual } from "crypto";

export type DemoUploadSession = {
  uploadId: string;
  path: string;
  fileType: string;
  fileSize: number;
  expiresAt: number;
};

function getSigningSecret() {
  const secret =
    process.env.DEMO_UPLOAD_SIGNING_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!secret) throw new Error("guest_session_failed");
  return secret;
}

function sign(encodedPayload: string) {
  return createHmac("sha256", getSigningSecret()).update(encodedPayload).digest("base64url");
}

export function createDemoUploadSession(
  claims: Omit<DemoUploadSession, "expiresAt">,
  ttlMs = 15 * 60 * 1000
) {
  const payload: DemoUploadSession = { ...claims, expiresAt: Date.now() + ttlMs };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifyDemoUploadSession(value: unknown): DemoUploadSession {
  if (typeof value !== "string") throw new Error("guest_session_invalid");

  const [encodedPayload, suppliedSignature, extra] = value.split(".");
  if (!encodedPayload || !suppliedSignature || extra) throw new Error("guest_session_invalid");

  const expectedSignature = sign(encodedPayload);
  const expectedBytes = Buffer.from(expectedSignature);
  const suppliedBytes = Buffer.from(suppliedSignature);
  if (
    expectedBytes.length !== suppliedBytes.length ||
    !timingSafeEqual(expectedBytes, suppliedBytes)
  ) {
    throw new Error("guest_session_invalid");
  }

  let claims: DemoUploadSession;
  try {
    claims = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
  } catch {
    throw new Error("guest_session_invalid");
  }

  if (
    !claims ||
    typeof claims.uploadId !== "string" ||
    typeof claims.path !== "string" ||
    typeof claims.fileType !== "string" ||
    typeof claims.fileSize !== "number" ||
    typeof claims.expiresAt !== "number" ||
    claims.expiresAt < Date.now()
  ) {
    throw new Error("guest_session_invalid");
  }

  return claims;
}
