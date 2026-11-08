import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Integration tests run against the LOCAL Supabase stack with the fictional seed data.
// Prerequisites: `npm run db:start` and `npm run db:reset` (migrations + seed).

export const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
export const password = process.env.SEED_USER_PASSWORD ?? "";

if (!url || !anonKey || !serviceKey || !password) {
  throw new Error("Integration tests need .env.local with local Supabase values and SEED_USER_PASSWORD.");
}
if (!["127.0.0.1", "localhost"].includes(new URL(url).hostname)) {
  throw new Error("Integration tests must only run against a local Supabase instance.");
}

export type Db = SupabaseClient<Database>;

export function anonClient(): Db {
  return createClient<Database>(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Service role — used ONLY to set up / verify state from outside, never as the actor under test. */
export function serviceClient(): Db {
  return createClient<Database>(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function signedIn(email: string): Promise<Db> {
  const client = anonClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);
  return client;
}

export async function profileId(email: string): Promise<string> {
  const { data, error } = await serviceClient().from("profiles").select("id").eq("work_email", email).single();
  if (error) throw new Error(`profile lookup failed for ${email}: ${error.message}`);
  return data.id;
}

export const USERS = {
  admin: "admin@example.com",
  managerProduction: "manager.production@example.com", // team: vikram, kavita, arjun
  managerSales: "manager.sales@example.com", // team: meena, rahul
  vikram: "vikram@example.com",
  kavita: "kavita@example.com",
  meena: "meena@example.com",
  former: "former@example.com", // deactivated
};
