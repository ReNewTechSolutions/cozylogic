import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { PRODUCT_EVENTS } from "@/lib/cozylogic/productEventNames";
import { trackServerProductEvent } from "@/lib/cozylogic/productEventsServer";

function getSafeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/app";
  }

  try {
    const parsed = new URL(value, "http://cozylogic.local");
    if (parsed.origin !== "http://cozylogic.local") {
      return "/app";
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/app";
  }
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = getSafeNextPath(requestUrl.searchParams.get("next"));
  const origin = requestUrl.origin;

  const cookieStore = await cookies();
  const response = NextResponse.redirect(new URL(next, origin));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    const createdAt = data.user?.created_at ? Date.parse(data.user.created_at) : Number.NaN;
    const lastSignInAt = data.user?.last_sign_in_at
      ? Date.parse(data.user.last_sign_in_at)
      : Number.NaN;

    if (!error && Number.isFinite(createdAt) && Number.isFinite(lastSignInAt)) {
      const isNewAccount = Math.abs(lastSignInAt - createdAt) <= 5 * 60 * 1000;
      if (isNewAccount) {
        await trackServerProductEvent(PRODUCT_EVENTS.accountCreated, {
          method: "magic_link",
        });
      }
    }
  }

  return response;
}
