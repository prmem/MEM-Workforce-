// Fictional demo data for LOCAL development and tests (and an explicitly named preview project).
// Usage: npm run seed   (reads .env.local; run after `supabase db reset`)
// Refuses to run against any non-local Supabase URL. Never put real employee data here.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.SEED_USER_PASSWORD;

function fail(msg) {
  console.error(`Seed aborted: ${msg}`);
  process.exit(1);
}

if (!url || !serviceKey || !password) fail("NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SEED_USER_PASSWORD must be set in .env.local.");
const host = new URL(url).hostname;
// A remote project may be seeded ONLY when it is explicitly named as a preview project:
//   SEED_PREVIEW_PROJECT_REF=<ref> where the URL is https://<ref>.supabase.co
// Never use this for a production project.
const previewRef = process.env.SEED_PREVIEW_PROJECT_REF;
const isLocal = ["127.0.0.1", "localhost"].includes(host);
const isNamedPreview = !!previewRef && /^[a-z0-9]{20}$/.test(previewRef) && host === `${previewRef}.supabase.co`;
if (!isLocal && !isNamedPreview) {
  fail(`refusing to seed non-local Supabase (${host}). For a preview project only, set SEED_PREVIEW_PROJECT_REF to its project ref.`);
}
if (isNamedPreview) console.log(`Seeding PREVIEW project ${previewRef} with fictional data.`);
if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) fail("SEED_USER_PASSWORD must be 8+ characters with letters and numbers.");

const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

async function must(promise, what) {
  const { data, error } = await promise;
  if (error) fail(`${what}: ${error.message}`);
  return data;
}

const { count } = await db.from("profiles").select("id", { count: "exact", head: true });
if (count && count > 0) fail("profiles already exist. Run `npm run db:reset` to start fresh.");

const departments = await must(db.from("departments").select("id, name"), "load departments");
const dept = (name) => {
  const d = departments.find((x) => x.name === name);
  if (!d) fail(`department ${name} missing`);
  return d.id;
};

// Fictional people. Surname "Demo" marks them as demo data.
const people = [
  { key: "admin", employee_code: "ADM-001", full_name: "Anita Demo", work_email: "admin@example.com", role: "admin", department: "Administration", designation: "Administrator" },
  { key: "mgrProd", employee_code: "MGR-001", full_name: "Rohit Demo", work_email: "manager.production@example.com", role: "manager", department: "Production", designation: "Production Supervisor", manager: "admin" },
  { key: "mgrSales", employee_code: "MGR-002", full_name: "Sunita Demo", work_email: "manager.sales@example.com", role: "manager", department: "Sales", designation: "Sales Manager", manager: "admin" },
  { key: "vikram", employee_code: "EMP-001", full_name: "Vikram Demo", work_email: "vikram@example.com", role: "employee", department: "Production", designation: "Machine Operator", manager: "mgrProd", phone: "+91 90000 00001" },
  { key: "kavita", employee_code: "EMP-002", full_name: "Kavita Demo", work_email: "kavita@example.com", role: "employee", department: "Quality Control", designation: "QC Inspector", manager: "mgrProd" },
  { key: "arjun", employee_code: "EMP-003", full_name: "Arjun Demo", work_email: "arjun@example.com", role: "employee", department: "Dispatch", designation: "Dispatch Assistant", manager: "mgrProd" },
  { key: "meena", employee_code: "EMP-004", full_name: "Meena Demo", work_email: "meena@example.com", role: "employee", department: "Sales", designation: "Sales Executive", manager: "mgrSales" },
  { key: "rahul", employee_code: "EMP-005", full_name: "Rahul Demo", work_email: "rahul@example.com", role: "employee", department: "Purchase", designation: "Purchase Assistant", manager: "mgrSales" },
  { key: "pooja", employee_code: "EMP-006", full_name: "Pooja Demo", work_email: "pooja@example.com", role: "employee", department: "Accounts", designation: "Accounts Assistant", manager: "admin" },
  { key: "former", employee_code: "EMP-007", full_name: "Former Demo", work_email: "former@example.com", role: "employee", department: "Production", designation: "Helper", manager: "mgrProd", inactive: true },
];

const ids = {};
for (const p of people) {
  const row = await must(
    db
      .from("profiles")
      .insert({
        employee_code: p.employee_code,
        full_name: p.full_name,
        work_email: p.work_email,
        role: p.role,
        department_id: dept(p.department),
        designation: p.designation,
        reporting_manager_id: p.manager ? ids[p.manager] : null,
        phone: p.phone ?? null,
        joining_date: "2026-04-01",
      })
      .select("id")
      .single(),
    `insert profile ${p.employee_code}`,
  );
  ids[p.key] = row.id;
  // Creating the auth user links it to the profile (database trigger on auth.users).
  const created = await must(
    db.auth.admin.createUser({ email: p.work_email, password, email_confirm: true }),
    `create auth user ${p.work_email}`,
  );
  if (p.inactive) {
    await must(db.from("profiles").update({ employment_status: "inactive" }).eq("id", row.id), "deactivate former");
    await must(db.auth.admin.updateUserById(created.user.id, { ban_duration: "876000h" }), "ban former");
  }
}

// Tasks (examples from the spec). Times are relative to now so "overdue" is always demonstrable.
const hours = (h) => new Date(Date.now() + h * 3600_000).toISOString();
const tasks = [
  { title: "Complete cable tray production batch 14", assignee: "vikram", by: "mgrProd", priority: "high", status: "in_progress", due: 30, target: 500, done: 220, unit: "pcs" },
  { title: "Update actual production quantity for batch 13", assignee: "vikram", by: "mgrProd", priority: "medium", status: "to_do", due: -20 },
  { title: "Inspect finished cable trays (batch 12)", assignee: "kavita", by: "mgrProd", priority: "high", status: "submitted_for_review", due: 10, target: 300, done: 300, unit: "pcs", note: "All 300 inspected; 4 rejected for coating defects." },
  { title: "Record inspection quantity and defects", assignee: "kavita", by: "mgrProd", priority: "medium", status: "completed", due: -48 },
  { title: "Prepare dispatch documentation for order 2211", assignee: "arjun", by: "mgrProd", priority: "urgent", status: "blocked", due: 6, note: "Waiting for invoice copy from Accounts." },
  { title: "Confirm order dispatch 2209", assignee: "arjun", by: "mgrProd", priority: "medium", status: "to_do", due: 72 },
  { title: "Follow up with distributors (North region)", assignee: "meena", by: "mgrSales", priority: "medium", status: "in_progress", due: 48 },
  { title: "Record quotation response from distributor", assignee: "meena", by: "mgrSales", priority: "low", status: "reopened", due: -5, note: "Please add the quoted price." },
  { title: "Follow up on raw material deliveries", assignee: "rahul", by: "mgrSales", priority: "high", status: "to_do", due: 24 },
  { title: "Complete payment reconciliation for October", assignee: "pooja", by: "admin", priority: "high", status: "in_progress", due: -2 },
  { title: "Monthly production review", assignee: "mgrProd", by: "admin", priority: "medium", status: "to_do", due: 96 },
  { title: "Old cancelled stock count", assignee: "vikram", by: "mgrProd", priority: "low", status: "cancelled", due: -100, note: "Replaced by batch audit." },
];

const deptOf = (key) => dept(people.find((p) => p.key === key).department);
for (const t of tasks) {
  const completed = t.status === "completed";
  const reviewed = completed || t.status === "reopened";
  const row = await must(
    db
      .from("tasks")
      .insert({
        title: t.title,
        description: "Fictional demo task.",
        assigned_to: ids[t.assignee],
        created_by: ids[t.by],
        department_id: deptOf(t.assignee),
        priority: t.priority,
        status: t.status,
        due_at: hours(t.due),
        target_quantity: t.target ?? null,
        completed_quantity: t.done ?? null,
        unit: t.unit ?? null,
        completion_note: t.status === "submitted_for_review" ? t.note : null,
        reviewed_by: reviewed ? ids[t.by] : null,
        reviewed_at: reviewed ? hours(-1) : null,
        completed_at: completed ? hours(-1) : null,
      })
      .select("id")
      .single(),
    `insert task ${t.title}`,
  );
  const history = [{ task_id: row.id, author_id: ids[t.by], kind: "created", to_status: "to_do" }];
  if (t.status !== "to_do") {
    const author = ["completed", "reopened", "cancelled"].includes(t.status) ? ids[t.by] : ids[t.assignee];
    const kind = t.status === "cancelled" ? "cancelled" : reviewed ? "review" : "status";
    history.push({ task_id: row.id, author_id: author, kind, from_status: "to_do", to_status: t.status, note: t.note ?? null });
  }
  await must(db.from("task_updates").insert(history), "insert task history");
}

console.log(`Seeded ${people.length} fictional people and ${tasks.length} tasks.`);
console.log("Sign in with any seeded email (e.g. admin@example.com) and SEED_USER_PASSWORD from .env.local.");
