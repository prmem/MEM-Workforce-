// One-time setup: create the FIRST admin on a new database and email them an invite.
// Public sign-up is disabled, so this is the only way to create the first account.
// Refuses to run if any admin already exists. After this, admins add everyone else in the app.
//
// Usage (the owner runs this; values come from the environment, never hardcoded):
//   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SITE_URL=... \
//   node scripts/create-first-admin.mjs --email owner@company.example --code ADM-001 --name "Full Name" --confirm
import { createClient } from "@supabase/supabase-js";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => {
    if (a.startsWith("--")) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith("--") ? all[i + 1] : true]);
    return acc;
  }, []),
);

function fail(msg) {
  console.error(`Aborted: ${msg}`);
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const site = process.env.NEXT_PUBLIC_SITE_URL;
if (!url || !serviceKey || !site) fail("set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SITE_URL.");

const email = typeof args.email === "string" ? args.email.trim().toLowerCase() : "";
const code = typeof args.code === "string" ? args.code.trim().toUpperCase() : "";
const name = typeof args.name === "string" ? args.name.trim() : "";
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail("--email must be a valid email.");
if (!/^[A-Z0-9-]{1,20}$/.test(code)) fail("--code must be 1-20 letters, numbers or hyphens.");
if (!name || name.length > 120) fail("--name is required (max 120 characters).");
if (args.confirm !== true) fail(`re-run with --confirm to create admin ${email} on ${new URL(url).host}.`);

const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

const { count, error: countError } = await db.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin");
if (countError) fail(countError.message);
if (count && count > 0) fail("an admin already exists. Add further people from the app.");

const { error: insertError } = await db
  .from("profiles")
  .insert({ employee_code: code, full_name: name, work_email: email, role: "admin" });
if (insertError) fail(`could not create profile: ${insertError.message}`);

const { error: inviteError } = await db.auth.admin.inviteUserByEmail(email, { redirectTo: `${site.replace(/\/+$/, "")}/auth/confirm` });
if (inviteError) fail(`profile created, but the invite failed: ${inviteError.message}. Fix email settings, then send a password reset to ${email}.`);

console.log(`Admin profile created and invite sent to ${email}.`);
