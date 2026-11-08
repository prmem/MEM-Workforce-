import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import { utcToIstInputs } from "@/lib/format";
import { CLOSED_TASK_STATUSES } from "@/lib/labels";
import { Card, PageHeader } from "@/components/ui";
import { TaskForm } from "../../task-form";

export const metadata: Metadata = { title: "Edit task" };

export default async function EditTaskPage({ params }: PageProps<"/tasks/[id]/edit">) {
  const me = await requireRole(["admin", "manager"]);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createServerSupabase();
  const { data: t, error } = await supabase
    .from("tasks")
    .select("id, title, description, priority, start_date, due_at, target_quantity, unit, status, assigned_to")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Could not load task: ${error.message}`);
  if (!t || t.assigned_to === me.profileId || CLOSED_TASK_STATUSES.includes(t.status)) notFound();

  const { data: canManage, error: cErr } = await supabase.rpc("can_manage_assignee", { p_assignee: t.assigned_to });
  if (cErr) throw new Error(`Could not check permissions: ${cErr.message}`);
  if (!canManage) notFound();

  const due = utcToIstInputs(t.due_at);
  return (
    <>
      <PageHeader title="Edit task" />
      <Card>
        <TaskForm task={{ ...t, due_date: due.date, due_time: due.time }} />
      </Card>
    </>
  );
}
