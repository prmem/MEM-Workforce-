import type { Metadata } from "next";
import Link from "next/link";
import { requireUser, type CurrentUser } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import { formatDateTime, formatTaskNumber } from "@/lib/format";
import { OPEN_TASK_STATUSES, TASK_STATUSES, TASK_STATUS_LABELS, isOverdue } from "@/lib/labels";
import { Alert, Card, EmptyState, PageHeader } from "@/components/ui";
import { OverdueBadge, StatusBadge } from "@/components/task-badges";

export const metadata: Metadata = { title: "Dashboard" };

type Supabase = Awaited<ReturnType<typeof createServerSupabase>>;

function Stat({ label, value, href, highlight }: { label: string; value: number; href?: string; highlight?: boolean }) {
  const body = (
    <Card className={`h-full ${href ? "hover:border-brand/40" : ""}`}>
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${highlight && value > 0 ? "text-brand" : "text-ink"}`}>{value}</p>
    </Card>
  );
  return href ? (
    <Link href={href} className="block rounded-xl">
      {body}
    </Link>
  ) : (
    body
  );
}

async function count(q: PromiseLike<{ count: number | null; error: { message: string } | null }>, what: string) {
  const { count: n, error } = await q;
  if (error) throw new Error(`Could not count ${what}: ${error.message}`);
  return n ?? 0;
}

/** Task count query, scoped to `assignees` when given (manager's team). RLS applies as well. */
function taskCount(supabase: Supabase, assignees: string[] | null) {
  const q = supabase.from("tasks").select("id", { count: "exact", head: true });
  return assignees ? q.in("assigned_to", assignees) : q;
}

async function ManagementDashboard({ me }: { me: CurrentUser }) {
  const supabase = await createServerSupabase();
  const nowIso = new Date().toISOString();

  // Admin: whole company. Manager: active direct reports only.
  let team: { id: string; department_id: string | null }[] = [];
  let assignees: string[] | null = null;
  if (me.role === "manager") {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, department_id")
      .eq("reporting_manager_id", me.profileId)
      .eq("employment_status", "active");
    if (error) throw new Error(`Could not load team: ${error.message}`);
    team = data;
    assignees = data.map((p) => p.id);
  }
  // Manager with no team: avoid an empty IN () filter.
  const scope = assignees && assignees.length === 0 ? ["00000000-0000-0000-0000-000000000000"] : assignees;

  const [activeEmployees, open, overdue, review, ...byStatus] = await Promise.all([
    me.role === "admin"
      ? count(supabase.from("profiles").select("id", { count: "exact", head: true }).eq("employment_status", "active"), "employees")
      : Promise.resolve(team.length),
    count(taskCount(supabase, scope).in("status", OPEN_TASK_STATUSES), "open tasks"),
    count(taskCount(supabase, scope).in("status", OPEN_TASK_STATUSES).lt("due_at", nowIso), "overdue tasks"),
    count(taskCount(supabase, scope).eq("status", "submitted_for_review"), "tasks for review"),
    ...TASK_STATUSES.map((s) => count(taskCount(supabase, scope).eq("status", s), `${s} tasks`)),
  ]);

  // Employees per department (admin) — counted from active profiles.
  let departmentRows: { name: string; count: number }[] = [];
  if (me.role === "admin") {
    const [{ data: deps, error: dErr }, { data: people, error: pErr }] = await Promise.all([
      supabase.from("departments").select("id, name").eq("is_active", true).order("sort_order").order("name"),
      supabase.from("profiles").select("department_id").eq("employment_status", "active"),
    ]);
    if (dErr) throw new Error(`Could not load departments: ${dErr.message}`);
    if (pErr) throw new Error(`Could not load employees: ${pErr.message}`);
    const tally = new Map<string | null, number>();
    for (const p of people) tally.set(p.department_id, (tally.get(p.department_id) ?? 0) + 1);
    departmentRows = deps.map((d) => ({ name: d.name, count: tally.get(d.id) ?? 0 }));
    const none = tally.get(null) ?? 0;
    if (none > 0) departmentRows.push({ name: "No department", count: none });
  }

  // Tasks waiting for review (top 5).
  let reviewQuery = supabase
    .from("tasks")
    .select("id, task_number, title, due_at, status")
    .eq("status", "submitted_for_review")
    .order("updated_at", { ascending: true })
    .limit(5);
  if (scope) reviewQuery = reviewQuery.in("assigned_to", scope);
  const { data: toReview, error: rErr } = await reviewQuery;
  if (rErr) throw new Error(`Could not load review list: ${rErr.message}`);

  const isAdmin = me.role === "admin";
  return (
    <>
      <PageHeader title="Dashboard" description={isAdmin ? "Company overview" : "Your team at a glance"} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={isAdmin ? "Active employees" : "Team members"} value={activeEmployees} href="/employees" />
        <Stat label="Open tasks" value={open} href="/tasks?view=open" />
        <Stat label="Overdue tasks" value={overdue} href="/tasks?view=overdue" highlight />
        <Stat label="Waiting for review" value={review} href="/tasks?view=submitted_for_review" highlight />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold text-ink">Tasks by status{isAdmin ? "" : " (your team)"}</h2>
          <ul className="divide-y divide-line">
            {TASK_STATUSES.map((s, i) => (
              <li key={s} className="flex items-center justify-between py-2 text-sm">
                <Link href={`/tasks?view=${s}`} className="text-ink hover:text-brand">{TASK_STATUS_LABELS[s]}</Link>
                <span className="font-semibold tabular-nums">{byStatus[i]}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold text-ink">{isAdmin ? "Waiting for review" : "Waiting for your review"}</h2>
          {toReview.length === 0 ? (
            <p className="text-sm text-muted">Nothing to review right now.</p>
          ) : (
            <ul className="divide-y divide-line">
              {toReview.map((t) => (
                <li key={t.id} className="py-2">
                  <Link href={`/tasks/${t.id}`} className="text-sm font-medium text-ink hover:text-brand">
                    {formatTaskNumber(t.task_number)} · {t.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {isAdmin ? (
          <Card className="lg:col-span-2">
            <h2 className="mb-3 font-semibold text-ink">Active employees by department</h2>
            {departmentRows.length === 0 ? (
              <p className="text-sm text-muted">No departments yet.</p>
            ) : (
              <ul className="grid gap-x-6 sm:grid-cols-2">
                {departmentRows.map((d) => (
                  <li key={d.name} className="flex items-center justify-between border-b border-line py-2 text-sm">
                    <span>{d.name}</span>
                    <span className="font-semibold tabular-nums">{d.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ) : null}
      </div>
      <p className="mt-4 text-xs text-muted">Attendance and leave figures will be added in later phases.</p>
    </>
  );
}

async function EmployeeDashboard({ me }: { me: CurrentUser }) {
  const supabase = await createServerSupabase();
  const nowIso = new Date().toISOString();
  const mine = () => supabase.from("tasks").select("id", { count: "exact", head: true }).eq("assigned_to", me.profileId);

  const [open, overdue, review, completed, upcoming] = await Promise.all([
    count(mine().in("status", OPEN_TASK_STATUSES), "open tasks"),
    count(mine().in("status", OPEN_TASK_STATUSES).lt("due_at", nowIso), "overdue tasks"),
    count(mine().eq("status", "submitted_for_review"), "tasks for review"),
    count(mine().eq("status", "completed"), "completed tasks"),
    supabase
      .from("tasks")
      .select("id, task_number, title, due_at, status")
      .eq("assigned_to", me.profileId)
      .in("status", ["to_do", "in_progress", "blocked", "reopened"])
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(6),
  ]);
  if (upcoming.error) throw new Error(`Could not load tasks: ${upcoming.error.message}`);

  return (
    <>
      <PageHeader title={`Hello, ${me.fullName.split(" ")[0]}`} description="Your work at a glance" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Open tasks" value={open} href="/tasks?view=open" />
        <Stat label="Overdue" value={overdue} href="/tasks?view=overdue" highlight />
        <Stat label="Waiting for review" value={review} href="/tasks?view=submitted_for_review" />
        <Stat label="Completed" value={completed} href="/tasks?view=completed" />
      </div>
      <h2 className="mb-3 mt-6 font-semibold text-ink">What to work on next</h2>
      {upcoming.data.length === 0 ? (
        <EmptyState title="You have no tasks to work on">New tasks from your manager will appear here.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {upcoming.data.map((t) => (
            <li key={t.id}>
              <Link href={`/tasks/${t.id}`} className="block rounded-xl">
                <Card className="hover:border-brand/40">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs text-muted">{formatTaskNumber(t.task_number)}</p>
                      <p className="font-semibold text-ink">{t.title}</p>
                      <p className="text-sm text-muted">{t.due_at ? `Due ${formatDateTime(t.due_at)}` : "No due date"}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {isOverdue(t.due_at, t.status) ? <OverdueBadge /> : null}
                      <StatusBadge status={t.status} />
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

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const me = await requireUser();
  const sp = await searchParams;
  return (
    <>
      {sp.passwordSet ? (
        <div className="mb-4">
          <Alert tone="success">Your password has been saved.</Alert>
        </div>
      ) : null}
      {me.role === "employee" ? <EmployeeDashboard me={me} /> : <ManagementDashboard me={me} />}
    </>
  );
}
