import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { supabasePublicEnv } from "@/lib/env";

/**
 * Supabase client for Server Components (pages/layouts).
 * Cookies are read-only during rendering; session refresh is handled by the proxy
 * (src/proxy.ts) before the page renders, so no cookie writes are needed here.
 */
export async function createServerSupabase() {
  const cookieStore = await cookies();
  const { url, anonKey } = supabasePublicEnv();
  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
    },
  });
}

/**
 * Supabase client for Server Actions and Route Handlers, where cookies can be written
 * (sign in, sign out, set password).
 */
export async function createActionSupabase() {
  const cookieStore = await cookies();
  const { url, anonKey } = supabasePublicEnv();
  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      },
    },
  });
}
