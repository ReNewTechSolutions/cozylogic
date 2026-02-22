// lib/cozylogic/dev.ts
export function devBypassLimits() {
    // Only allow bypass in local/dev environments
    if (process.env.NODE_ENV === "production") return false;
    return process.env.DEV_BYPASS_LIMITS === "1" || process.env.DEV_BYPASS_LIMITS === "true";
  }