import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import { formatDate, formatDateTime, formatQuantity, formatTaskNumber } from "@/lib/format";
import { CLOSED_TASK_STATUSES, TASK_STATUS_LABELS, isOverdue, nextStatusesForAssignee } from "@/lib/labels";
import { Alert, Card, DetailRow, LinkButton, PageHeader } from "@/components/ui";
import { OverdueBadge, PriorityBadge, StatusBadge } from "@/components/task-badges";
import { assignablePeople, colleagueNameMap } from "../data";
import { ProgressPanel, ReviewPanel, ManagePanel } from "./panels";

export const metadata: Metadata = { title: "Task details" };

const DONE_MESSAGES: Record<string, string> = {
  submitted: "Submitted for review. Your manager will approve it or send it back.",
  approved: "Task approved and marked Completed.",
  reopened: "Task reopened. The employee can continue working on it.",
  cancelled: "Task cancelled.",
};

const KIND_LABEL: Record<string, string> = {
  created: "Created the task",
  status: "Changed status",
  progress: "Added a progress update",
  review: "Reviewed",
  edited: "Edited the task details",
  reassigned: "Reassigned the task",
  cancelled: "Cancelled the task",
};

export default async function TaskDetailsPage({ params, searchParams }: PageProps<"/tasks/[id]">) {
  const me = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createServerSupabase();
  // RLS returns nothing if the user may not see this task.
  const { data: t, error } = await supabase
    .from("tasks")
    .select(
      "id, task_number, title, description, status, priority, start_date, due_at, target_quantity, completed_quantity, unit, completion_note, assigned_to, created_by, reviewed_by, reviewed_at, completed_at, created_at, updated_at, departments(name)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Could not load task: ${error.message}`);
  if (!t) notFound();

  const [{ data: history, error: hErr }, { data: canManageRaw, error: cErr }, names] = await Promise.all([
    supabase
      .from("task_updates")
      .select("id, kind, from_status, to_status, note, completed_quantity, author_id, created_at")
      .eq("task_id", t.id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false }),
    supabase.rpc("can_manage_assignee", { p_assignee: t.assigned_to }),
    colleagueNameMap(),
  ]);
  if (hErr) throw new Error(`Could not load task history: ${hErr.message}`);
  if (cErr) throw new Error(`Could not check permissions: ${cErr.message}`);

  const name = (pid: string | null) => (!pid ? "—" : pid === me.profileId ? "You" : (names.get(pid) ?? "Former employee"));
  const isAssignee = t.assigned_to === me.profileId;
  const canManage = !!canManageRaw && !isAssignee;
  const closed = CLOSED_TASK_STATUSES.includes(t.status);
  const overdue = isOverdue(t.due_at, t.status);
  const nextStatuses = isAssignee ? nextStatusesForAssignee(t.status) : [];
  const reassignOptions = canManage && !closed ? (await assignablePeople(me)).filter((p) => p.id !== t.assigned_to) : [];

  return (
    <>
      <PageHeader
        title={t.title}
        description={formatTaskNumber(t.task_number)}
        actions={canManage && !closed ? <LinkButton href={`/tasks/${t.id}/edit`} variant="secondary">Edit task</LinkButton> : null}
      />

      <div className="mb-4 flex flex-wrap gap-1.5">
        <StatusBadge status={t.status} />
        <PriorityBadge priority={t.priority} />
        {overdue ? <OverdueBadge /> : null}
      </div>

      <div className="space-y-3">
        {sp.created ? <Alert tone="success">Task created and assigned.</Alert> : null}
        {sp.saved ? <Alert tone="success">Task updated.</Alert> : null}
        {typeof sp.done === "string" && DONE_MESSAGES[sp.done] ? <Alert tone="success">{DONE_MESSAGES[sp.done]}</Alert> : null}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <h2 className="mb-2 font-semibold text-ink">Details</h2>
            {t.description ? <p className="mb-3 whitespace-pre-wrap text-sm text-ink">{t.description}</p> : null}
            <dl className="divide-y divide-line">
              <DetailRow label="Assigned to">{name(t.assigned_to)}</DetailRow>
              <DetailRow label="Created by">{name(t.created_by)}</DetailRow>
              <DetailRow label="Department">{t.departments?.name ?? "—"}</DetailRow>
              <DetailRow label="Start date">{formatDate(t.start_date)}</DetailRow>
              <DetailRow label="Due">{formatDateTime(t.due_at)}</DetailRow>
              {t.target_quantity !== null || t.completed_quantity !== null ? (
                <DetailRow label="Quantity">
                  {formatQuantity(t.completed_quantity ?? 0, t.unit)} done
                  {t.target_quantity !== null ? ` of ${formatQuantity(t.target_quantity, t.unit)} target` : ""}
                </DetailRow>
              ) : null}
              {t.completion_note ? <DetailRow label="Completion note">{t.completion_note}</DetailRow> : null}
              {t.reviewed_by ? <DetailRow label="Last reviewed by">{`${name(t.reviewed_by)} on ${formatDateTime(t.reviewed_at)}`}</DetailRow> : null}
              {t.completed_at ? <DetailRow label="Completed">{formatDateTime(t.completed_at)}</DetailRow> : null}
              <DetailRow label="Created">{formatDateTime(t.created_at)}</DetailRow>
              <DetailRow label="Last updated">{formatDateTime(t.updated_at)}</DetailRow>
            </dl>
          </Card>

          <Card>
            <h2 className="mb-3 font-semibold text-ink">History</h2>
            {history.length === 0 ? (
              <p className="text-sm text-muted">No history yet.</p>
            ) : (
              <ol className="space-y-3">
                {history.map((h) => (
                  <li key={h.id} className="border-l-2 border-line pl-3">
                    <p className="text-sm text-ink">
                      <span className="font-medium">{name(h.author_id)}</span> — {KIND_LABEL[h.kind] ?? h.kind}
                      {h.to_status && h.kind !== "created" ? (
                        <>
                          {": "}
                          {h.from_status ? `${TASK_STATUS_LABELS[h.from_status]} → ` : ""}
                          {TASK_STATUS_LABELS[h.to_status]}
                        </>
                      ) : null}
                    </p>
                    {h.completed_quantity !== null ? (
                      <p className="text-sm text-muted">Quantity done: {formatQuantity(h.completed_quantity, t.unit)}</p>
                    ) : null}
                    {h.note ? <p className="whitespace-pre-wrap text-sm text-muted">“{h.note}”</p> : null}
                    <p className="text-xs text-muted">{formatDateTime(h.created_at)}</p>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          {isAssignee && !closed ? (
            t.status === "submitted_for_review" ? (
              <Card>
                <p className="text-sm text-muted">Waiting for your manager to review this task.</p>
              </Card>
            ) : (
              <ProgressPanel taskId={t.id} nextStatuses={nextStatuses} unit={t.unit} hasTarget={t.target_quantity !== null} />
            )
          ) : null}
          {canManage && t.status === "submitted_for_review" ? <ReviewPanel taskId={t.id} /> : null}
          {canManage && !closed ? <ManagePanel taskId={t.id} people={reassignOptions} /> : null}
          {closed ? (
            <Card>
              <p className="text-sm text-muted">This task is {TASK_STATUS_LABELS[t.status].toLowerCase()} and can no longer be changed.</p>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
