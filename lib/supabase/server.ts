// lib/supabase/server.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function getSupabaseServerClient() {
  const cookieStore = await cookies(); // ✅ MUST await in Next 16

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // Server components can't set cookies
        },
      },
    }
  );
}