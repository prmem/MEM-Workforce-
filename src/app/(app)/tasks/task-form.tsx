"use client";

import { useActionState } from "react";
import { createTask, editTask } from "@/app/actions/tasks";
import type { FormState } from "@/app/actions/auth";
import { Alert, Field, Input, Select, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { PRIORITY_LABELS, TASK_PRIORITIES } from "@/lib/labels";

export type TaskFormValues = {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  start_date: string | null;
  due_date: string;
  due_time: string;
  target_quantity: number | null;
  unit: string | null;
};

export function TaskForm({ people, task }: { people?: { id: string; name: string }[]; task?: TaskFormValues }) {
  const [state, action] = useActionState<FormState, FormData>(task ? editTask : createTask, {});
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      {task ? <input type="hidden" name="task_id" value={task.id} /> : null}
      {state.error ? <Alert>{state.error}</Alert> : null}

      <Field label="Task title" name="title" error={fe.title} required>
        <Input name="title" defaultValue={task?.title} required maxLength={200} invalid={!!fe.title} placeholder="e.g. Complete cable tray batch" />
      </Field>
      <Field label="Description" name="description" error={fe.description}>
        <Textarea name="description" defaultValue={task?.description ?? ""} maxLength={5000} rows={4} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        {people ? (
          <Field label="Assign to" name="assigned_to" error={fe.assigned_to} required>
            <Select name="assigned_to" defaultValue="" required invalid={!!fe.assigned_to}>
              <option value="" disabled>Choose a person</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </Field>
        ) : null}
        <Field label="Priority" name="priority" error={fe.priority} required>
          <Select name="priority" defaultValue={task?.priority ?? "medium"}>
            {TASK_PRIORITIES.map((p) => (
              <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
            ))}
          </Select>
        </Field>
        <Field label="Start date" name="start_date" error={fe.start_date}>
          <Input name="start_date" type="date" defaultValue={task?.start_date ?? ""} invalid={!!fe.start_date} />
        </Field>
        <Field label="Due date" name="due_date" error={fe.due_date}>
          <Input name="due_date" type="date" defaultValue={task?.due_date ?? ""} invalid={!!fe.due_date} />
        </Field>
        <Field label="Due time" name="due_time" error={fe.due_time} hint="If left empty, the task is due by 11:59 PM.">
          <Input name="due_time" type="time" defaultValue={task?.due_time ?? ""} invalid={!!fe.due_time} />
        </Field>
        <Field label="Target quantity (optional)" name="target_quantity" error={fe.target_quantity}>
          <Input name="target_quantity" type="number" inputMode="decimal" min={0} step="any" defaultValue={task?.target_quantity ?? ""} invalid={!!fe.target_quantity} />
        </Field>
        <Field label="Unit (optional)" name="unit" error={fe.unit} hint="e.g. pcs, metres, kg">
          <Input name="unit" defaultValue={task?.unit ?? ""} maxLength={30} />
        </Field>
      </div>

      <SubmitButton pendingText="Saving…">{task ? "Save changes" : "Create task"}</SubmitButton>
    </form>
  );
}
