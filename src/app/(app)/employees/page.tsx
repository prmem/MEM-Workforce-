import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import { EMPLOYMENT_STATUS_LABELS, ROLE_LABELS } from "@/lib/labels";
import { Badge, Card, EmptyState, Input, LinkButton, PageHeader, Select, buttonClass } from "@/components/ui";

export const metadata: Metadata = { title: "Employees" };

// Only allow simple search characters (also keeps PostgREST filter syntax safe).
function cleanSearch(v: unknown): string {
  return typeof v === "string" ? v.replace(/[^\p{L}\p{N} .-]/gu, "").trim().slice(0, 60) : "";
}

export default async function EmployeesPage({ searchParams }: PageProps<"/employees">) {
  const me = await requireRole(["admin", "manager"]);
  const params = await searchParams;
  const q = cleanSearch(params.q);
  const department = typeof params.department === "string" ? params.department : "";
  const status = params.status === "inactive" || params.status === "all" ? params.status : "active";

  const supabase = await createServerSupabase();
  // RLS limits rows: admins see everyone, managers see only their direct reports (and themselves).
  let query = supabase
    .from("profiles")
    .select("id, employee_code, full_name, designation, role, employment_status, user_id, departments(name)")
    .neq("id", me.profileId)
    .order("full_name");
  if (status !== "all") query = query.eq("employment_status", status);
  if (q) query = query.or(`full_name.ilike.%${q}%,employee_code.ilike.%${q}%`);
  if (/^[0-9a-f-]{36}$/i.test(department)) query = query.eq("department_id", department);

  const [{ data: people, error }, { data: departments, error: dErr }] = await Promise.all([
    query,
    supabase.from("departments").select("id, name").order("sort_order").order("name"),
  ]);
  if (error) throw new Error(`Could not load employees: ${error.message}`);
  if (dErr) throw new Error(`Could not load departments: ${dErr.message}`);

  const isAdmin = me.role === "admin";

  return (
    <>
      <PageHeader
        title={isAdmin ? "Employees" : "My Team"}
        description={isAdmin ? "Everyone in the company." : "People who report directly to you."}
        actions={isAdmin ? <LinkButton href="/employees/new">Add employee</LinkButton> : null}
      />

      <form className="mb-5 grid gap-2 sm:grid-cols-[1fr_12rem_9rem_auto]" role="search">
        <label className="sr-only" htmlFor="q">Search</label>
        <Input name="q" id="q" placeholder="Search name or employee ID" defaultValue={q} />
        <label className="sr-only" htmlFor="department">Department</label>
        <Select name="department" id="department" defaultValue={department}>
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </Select>
        <label className="sr-only" htmlFor="status">Status</label>
        <Select name="status" id="status" defaultValue={status}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="all">All</option>
        </Select>
        <button type="submit" className={buttonClass("secondary")}>Filter</button>
      </form>

      {people.length === 0 ? (
        <EmptyState title={q || department || status !== "active" ? "No one matches these filters" : isAdmin ? "No employees yet" : "No team members yet"}>
          {isAdmin ? "Use “Add employee” to invite someone." : "Ask an admin to set you as the reporting manager for your team."}
        </EmptyState>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {people.map((p) => (
            <li key={p.id}>
              <Link href={`/employees/${p.id}`} className="block rounded-xl focus-visible:outline-offset-4">
                <Card className="h-full hover:border-brand/40">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">{p.full_name}</p>
                      <p className="text-sm text-muted">
                        {p.employee_code}
                        {p.designation ? ` · ${p.designation}` : ""}
                      </p>
                      <p className="text-sm text-muted">{p.departments?.name ?? "No department"}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge tone={p.role === "admin" ? "red" : p.role === "manager" ? "blue" : "gray"}>{ROLE_LABELS[p.role]}</Badge>
                      {p.employment_status === "inactive" ? <Badge>{EMPLOYMENT_STATUS_LABELS.inactive}</Badge> : null}
                      {isAdmin && !p.user_id && p.employment_status === "active" ? <Badge tone="amber">No account</Badge> : null}
                    </div>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
