import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { supabasePublicEnv } from "@/lib/env";

/**
 * Service-role client. BYPASSES Row Level Security.
 * Only for: sending invites, and blocking/unblocking sign-in of deactivated employees.
 * Callers MUST first confirm the signed-in user is an admin (see requireAdminForAction).
 * Never import this from a Client Component.
 */
export function createAdminSupabase() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY (server only). See .env.example.");
  }
  const { url } = supabasePublicEnv();
  return createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
