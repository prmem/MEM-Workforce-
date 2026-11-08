"use client";

import { useActionState } from "react";
import { cancelTask, reassignTask, reviewTask, updateTaskProgress } from "@/app/actions/tasks";
import type { FormState } from "@/app/actions/auth";
import { Alert, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { TASK_STATUS_LABELS, type TaskStatus } from "@/lib/labels";

function Messages({ state }: { state: FormState }) {
  return (
    <>
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.message ? <Alert tone="success">{state.message}</Alert> : null}
    </>
  );
}

const ACTION_LABEL: Partial<Record<TaskStatus, string>> = {
  in_progress: "Start / continue work (In Progress)",
  blocked: "I am blocked (Blocked)",
  submitted_for_review: "Work is finished — submit for review",
};

export function ProgressPanel({
  taskId,
  nextStatuses,
  unit,
  hasTarget,
}: {
  taskId: string;
  nextStatuses: TaskStatus[];
  unit: string | null;
  hasTarget: boolean;
}) {
  const [state, action] = useActionState<FormState, FormData>(updateTaskProgress, {});
  const fe = state.fieldErrors ?? {};
  return (
    <Card>
      <h2 className="mb-3 font-semibold text-ink">Update progress</h2>
      <form action={action} className="space-y-3" noValidate>
        <input type="hidden" name="task_id" value={taskId} />
        <Messages state={state} />
        <Field label="Change status" name="new_status" error={fe.new_status}>
          <Select name="new_status" defaultValue="">
            <option value="">Keep current status</option>
            {nextStatuses.map((s) => (
              <option key={s} value={s}>{ACTION_LABEL[s] ?? TASK_STATUS_LABELS[s]}</option>
            ))}
          </Select>
        </Field>
        <Field label={hasTarget ? `Quantity done so far${unit ? ` (${unit})` : ""}` : `Quantity done (optional)${unit ? ` (${unit})` : ""}`} name="completed_quantity" error={fe.completed_quantity}>
          <Input name="completed_quantity" type="number" inputMode="decimal" min={0} step="any" invalid={!!fe.completed_quantity} />
        </Field>
        <Field label="Note" name="note" error={fe.note} hint="Required when blocked. Used as the completion note when submitting.">
          <Textarea name="note" rows={3} maxLength={2000} invalid={!!fe.note} />
        </Field>
        <SubmitButton className="w-full" pendingText="Saving…">Save update</SubmitButton>
      </form>
    </Card>
  );
}

export function ReviewPanel({ taskId }: { taskId: string }) {
  const [state, action] = useActionState<FormState, FormData>(reviewTask, {});
  const fe = state.fieldErrors ?? {};
  return (
    <Card className="border-amber-300">
      <h2 className="mb-1 font-semibold text-ink">Review submission</h2>
      <p className="mb-3 text-sm text-muted">Approve to mark the task Completed, or reopen it with a reason.</p>
      <form action={action} className="space-y-3" noValidate>
        <input type="hidden" name="task_id" value={taskId} />
        <Messages state={state} />
        <Field label="Review note" name="review-note" error={fe.note} hint="Required when reopening.">
          <Textarea id="review-note" name="note" rows={3} maxLength={2000} invalid={!!fe.note} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <SubmitButton name="decision" value="approve" pendingText="Saving…">Approve</SubmitButton>
          <SubmitButton name="decision" value="reopen" variant="secondary" pendingText="Saving…">Reopen</SubmitButton>
        </div>
      </form>
    </Card>
  );
}

export function ManagePanel({ taskId, people }: { taskId: string; people: { id: string; name: string }[] }) {
  const [reassignState, reassignAction] = useActionState<FormState, FormData>(reassignTask, {});
  const [cancelState, cancelAction] = useActionState<FormState, FormData>(cancelTask, {});
  return (
    <Card>
      <h2 className="mb-3 font-semibold text-ink">Manage task</h2>
      {people.length > 0 ? (
        <details className="mb-3">
          <summary className="cursor-pointer text-sm font-medium text-brand">Reassign</summary>
          <form action={reassignAction} className="mt-3 space-y-3" noValidate>
            <input type="hidden" name="task_id" value={taskId} />
            <Messages state={reassignState} />
            <Field label="New assignee" name="new_assignee" error={reassignState.fieldErrors?.new_assignee}>
              <Select name="new_assignee" defaultValue="">
                <option value="" disabled>Choose a person</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Reason (optional)" name="reassign-reason" error={reassignState.fieldErrors?.reason}>
              <Input id="reassign-reason" name="reason" maxLength={2000} />
            </Field>
            <SubmitButton variant="secondary" className="w-full" pendingText="Saving…">Reassign task</SubmitButton>
          </form>
        </details>
      ) : null}
      <details>
        <summary className="cursor-pointer text-sm font-medium text-red-700">Cancel task</summary>
        <form action={cancelAction} className="mt-3 space-y-3" noValidate>
          <input type="hidden" name="task_id" value={taskId} />
          <Messages state={cancelState} />
          <Field label="Reason" name="cancel-reason" error={cancelState.fieldErrors?.reason} required>
            <Input id="cancel-reason" name="reason" maxLength={2000} />
          </Field>
          <SubmitButton variant="danger" className="w-full" pendingText="Saving…">Cancel this task</SubmitButton>
        </form>
      </details>
    </Card>
  );
}
