import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import { formatDateTime, formatTaskNumber } from "@/lib/format";
import { OPEN_TASK_STATUSES, TASK_STATUSES, TASK_STATUS_LABELS, isOverdue, type TaskStatus } from "@/lib/labels";
import { Card, EmptyState, LinkButton, PageHeader, Select, buttonClass } from "@/components/ui";
import { OverdueBadge, PriorityBadge, StatusBadge } from "@/components/task-badges";
import { assignablePeople, colleagueNameMap } from "./data";

export const metadata: Metadata = { title: "Tasks" };

const UUID = /^[0-9a-f-]{36}$/i;

export default async function TasksPage({ searchParams }: PageProps<"/tasks">) {
  const me = await requireUser();
  const sp = await searchParams;
  const view = typeof sp.view === "string" ? sp.view : "open";
  const assignee = typeof sp.assignee === "string" && (sp.assignee === "me" || UUID.test(sp.assignee)) ? sp.assignee : "";
  const isEmployee = me.role === "employee";

  const supabase = await createServerSupabase();
  // RLS limits rows to: own tasks, tasks of direct reports (managers), everything (admins).
  let query = supabase
    .from("tasks")
    .select("id, task_number, title, status, priority, due_at, assigned_to")
    .order("due_at", { ascending: true, nullsFirst: false })
    .order("task_number", { ascending: false })
    .limit(200);
  if (view === "open" || view === "overdue") query = query.in("status", OPEN_TASK_STATUSES);
  else if ((TASK_STATUSES as string[]).includes(view)) query = query.eq("status", view as TaskStatus);
  if (view === "overdue") query = query.lt("due_at", new Date().toISOString());
  if (assignee === "me") query = query.eq("assigned_to", me.profileId);
  else if (assignee) query = query.eq("assigned_to", assignee);

  const [{ data: tasks, error }, names, people] = await Promise.all([query, colleagueNameMap(), assignablePeople(me)]);
  if (error) throw new Error(`Could not load tasks: ${error.message}`);

  return (
    <>
      <PageHeader
        title={isEmployee ? "My Tasks" : "Tasks"}
        description={isEmployee ? "Tasks assigned to you." : me.role === "manager" ? "Your team's tasks and tasks assigned to you." : "All tasks in the company."}
        actions={!isEmployee ? <LinkButton href="/tasks/new">New task</LinkButton> : null}
      />

      <form className="mb-5 grid gap-2 sm:grid-cols-[14rem_1fr_auto]">
        <label className="sr-only" htmlFor="view">Show</label>
        <Select id="view" name="view" defaultValue={view}>
          <option value="open">Open tasks</option>
          <option value="overdue">Overdue</option>
          <option value="all">All tasks</option>
          {TASK_STATUSES.map((s) => (
            <option key={s} value={s}>{TASK_STATUS_LABELS[s]}</option>
          ))}
        </Select>
        {!isEmployee ? (
          <>
            <label className="sr-only" htmlFor="assignee">Assigned to</label>
            <Select id="assignee" name="assignee" defaultValue={assignee}>
              <option value="">Everyone</option>
              <option value="me">Assigned to me</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </>
        ) : (
          <span className="hidden sm:block" />
        )}
        <button type="submit" className={buttonClass("secondary")}>Filter</button>
      </form>

      {tasks.length === 0 ? (
        <EmptyState title={view === "open" ? "No open tasks" : "No tasks match these filters"}>
          {isEmployee ? "New tasks from your manager will appear here." : "Use “New task” to assign work."}
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {tasks.map((t) => {
            const overdue = isOverdue(t.due_at, t.status);
            return (
              <li key={t.id}>
                <Link href={`/tasks/${t.id}`} className="block rounded-xl">
                  <Card className={`hover:border-brand/40 ${overdue ? "border-l-4 border-l-brand" : ""}`}>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-muted">{formatTaskNumber(t.task_number)}</p>
                        <p className="font-semibold text-ink">{t.title}</p>
                        <p className="text-sm text-muted">
                          {t.assigned_to === me.profileId ? "Assigned to you" : (names.get(t.assigned_to) ?? "Former employee")}
                          {" · "}
                          {t.due_at ? `Due ${formatDateTime(t.due_at)}` : "No due date"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5 sm:justify-end">
                        {overdue ? <OverdueBadge /> : null}
                        <PriorityBadge priority={t.priority} />
                        <StatusBadge status={t.status} />
                      </div>
                    </div>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {tasks.length === 200 ? <p className="mt-3 text-sm text-muted">Showing the first 200 tasks. Use the filters to narrow the list.</p> : null}
    </>
  );
}
