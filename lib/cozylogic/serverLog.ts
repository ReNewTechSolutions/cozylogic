import { randomUUID } from "crypto";

const SENSITIVE_FIELD = /(authorization|cookie|password|secret|signed.?url|token|api.?key)/i;
const SAFE_CODE = /^[A-Za-z0-9_.:-]{1,100}$/;

function sanitize(value: unknown, fieldName = ""): unknown {
  if (SENSITIVE_FIELD.test(fieldName)) return "[redacted]";
  if (value === null || value === undefined) return value;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) return value.map((item) => sanitize(item));
  if (value instanceof Error) return safeErrorDetails(value);
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        sanitize(item, key),
      ])
    );
  }
  return String(value);
}

export function safeErrorDetails(error: unknown) {
  if (!error || typeof error !== "object") {
    return { name: "Error", code: "unknown_error" };
  }

  const candidate = error as {
    name?: unknown;
    code?: unknown;
    status?: unknown;
    type?: unknown;
    message?: unknown;
  };
  const messageCode =
    typeof candidate.message === "string" && SAFE_CODE.test(candidate.message)
      ? candidate.message
      : undefined;

  return {
    name: typeof candidate.name === "string" ? candidate.name : "Error",
    code:
      typeof candidate.code === "string" && SAFE_CODE.test(candidate.code)
        ? candidate.code
        : messageCode ?? "unknown_error",
    status: typeof candidate.status === "number" ? candidate.status : undefined,
    type:
      typeof candidate.type === "string" && SAFE_CODE.test(candidate.type)
        ? candidate.type
        : undefined,
  };
}

export function getRequestId(value?: unknown) {
  return typeof value === "string" && SAFE_CODE.test(value) ? value : randomUUID();
}

export function logServerEvent(
  scope: string,
  event: string,
  details: Record<string, unknown> = {}
) {
  console.info(
    JSON.stringify(
      sanitize({
        service: "cozylogic",
        timestamp: new Date().toISOString(),
        level: "info",
        scope,
        event,
        ...details,
      })
    )
  );
}

export function logServerFailure(
  scope: string,
  stage: string,
  error: unknown,
  details: Record<string, unknown> = {}
) {
  console.error(
    JSON.stringify(
      sanitize({
        service: "cozylogic",
        timestamp: new Date().toISOString(),
        level: "error",
        scope,
        event: "final_failure",
        stage,
        ...details,
        error: safeErrorDetails(error),
      })
    )
  );
}
