"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createActionSupabase } from "@/lib/supabase/server";
import { userForAction } from "@/lib/auth";
import { friendlyDbError } from "@/lib/errors";
import { istInputToUtcIso } from "@/lib/format";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/labels";
import { fieldErrors } from "@/lib/validation";
import type { FormState } from "@/app/actions/auth";

const NOT_ALLOWED: FormState = { error: "You are not allowed to do this." };

const emptyToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);
const optionalDate = z.preprocess(emptyToNull, z.iso.date("Enter a valid date.").nullable());
const optionalTime = z.preprocess(emptyToNull, z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a valid time.").nullable());
const optionalText = (max: number, msg: string) => z.preprocess(emptyToNull, z.string().trim().max(max, msg).nullable());
const optionalQuantity = (msg: string) =>
  z.preprocess(emptyToNull, z.coerce.number(msg).finite(msg).nullable());

const taskFieldsSchema = z
  .object({
    title: z.string().trim().min(1, "Enter a task title.").max(200, "Title is too long."),
    description: optionalText(5000, "Description is too long."),
    priority: z.enum(TASK_PRIORITIES as [string, ...string[]], "Choose a priority."),
    start_date: optionalDate,
    due_date: optionalDate,
    due_time: optionalTime,
    target_quantity: optionalQuantity("Enter a number.").refine((v) => v === null || v > 0, "Target must be more than 0."),
    unit: optionalText(30, "Unit is too long."),
  })
  .refine((v) => !(v.due_time && !v.due_date), { message: "Choose a due date for this time.", path: ["due_date"] })
  .refine((v) => !(v.start_date && v.due_date && v.due_date < v.start_date), {
    message: "Due date cannot be before the start date.",
    path: ["due_date"],
  });

function taskFields(formData: FormData) {
  const g = (k: string) => formData.get(k) ?? "";
  return taskFieldsSchema.safeParse({
    title: g("title"),
    description: g("description"),
    priority: g("priority"),
    start_date: g("start_date"),
    due_date: g("due_date"),
    due_time: g("due_time"),
    target_quantity: g("target_quantity"),
    unit: g("unit"),
  });
}

// No time given -> due by the end of that day (11:59 PM IST).
function dueAt(date: string | null, time: string | null): string | null {
  return date ? istInputToUtcIso(date, time ?? "23:59") : null;
}

const uuid = z.uuid();

export async function createTask(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await userForAction(["admin", "manager"]))) return NOT_ALLOWED;
  const fields = taskFields(formData);
  const assignee = uuid.safeParse(formData.get("assigned_to"));
  if (!fields.success || !assignee.success) {
    const errs = fields.success ? {} : fieldErrors(fields.error);
    if (!assignee.success) errs.assigned_to = "Choose who should do this task.";
    return { fieldErrors: errs };
  }
  const f = fields.data;

  const supabase = await createActionSupabase();
  // The database checks that the assignee is in the caller's team (or caller is admin).
  const { data: id, error } = await supabase.rpc("create_task", {
    p_title: f.title,
    p_assigned_to: assignee.data,
    p_description: f.description ?? undefined,
    p_priority: f.priority as (typeof TASK_PRIORITIES)[number],
    p_start_date: f.start_date ?? undefined,
    p_due_at: dueAt(f.due_date, f.due_time) ?? undefined,
    p_target_quantity: f.target_quantity ?? undefined,
    p_unit: f.unit ?? undefined,
  });
  if (error) return { error: friendlyDbError(error, "createTask") };

  revalidatePath("/tasks");
  redirect(`/tasks/${id}?created=1`);
}

export async function editTask(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await userForAction(["admin", "manager"]))) return NOT_ALLOWED;
  const id = uuid.safeParse(formData.get("task_id"));
  if (!id.success) return { error: "Task not found." };
  const fields = taskFields(formData);
  if (!fields.success) return { fieldErrors: fieldErrors(fields.error) };
  const f = fields.data;

  const supabase = await createActionSupabase();
  // edit_task replaces every field; null clears an optional field. The generated types mark
  // these arguments non-null because the SQL function has no defaults, but SQL accepts null.
  const { error } = await supabase.rpc("edit_task", {
    p_task_id: id.data,
    p_title: f.title,
    p_description: f.description as string,
    p_priority: f.priority as (typeof TASK_PRIORITIES)[number],
    p_start_date: f.start_date as string,
    p_due_at: dueAt(f.due_date, f.due_time) as string,
    p_target_quantity: f.target_quantity as number,
    p_unit: f.unit as string,
  });
  if (error) return { error: friendlyDbError(error, "editTask") };

  revalidatePath(`/tasks/${id.data}`);
  redirect(`/tasks/${id.data}?saved=1`);
}

const progressSchema = z.object({
  task_id: uuid,
  new_status: z.preprocess(emptyToNull, z.enum(TASK_STATUSES as [string, ...string[]]).nullable()),
  note: optionalText(2000, "Note is too long."),
  completed_quantity: optionalQuantity("Enter a number.").refine((v) => v === null || v >= 0, "Quantity cannot be negative."),
});

export async function updateTaskProgress(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await userForAction())) return NOT_ALLOWED;
  const parsed = progressSchema.safeParse({
    task_id: formData.get("task_id"),
    new_status: formData.get("new_status") ?? "",
    note: formData.get("note") ?? "",
    completed_quantity: formData.get("completed_quantity") ?? "",
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const p = parsed.data;

  const supabase = await createActionSupabase();
  // The database checks the caller is the assignee and the status move is allowed.
  const { error } = await supabase.rpc("update_task_progress", {
    p_task_id: p.task_id,
    p_new_status: (p.new_status ?? undefined) as (typeof TASK_STATUSES)[number] | undefined,
    p_note: p.note ?? undefined,
    p_completed_quantity: p.completed_quantity ?? undefined,
  });
  if (error) return { error: friendlyDbError(error, "updateTaskProgress") };

  revalidatePath(`/tasks/${p.task_id}`);
  revalidatePath("/tasks");
  return { message: p.new_status === "submitted_for_review" ? "Submitted for review." : "Update saved." };
}

const reviewSchema = z.object({
  task_id: uuid,
  decision: z.enum(["approve", "reopen"]),
  note: optionalText(2000, "Note is too long."),
});

export async function reviewTask(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await userForAction(["admin", "manager"]))) return NOT_ALLOWED;
  const parsed = reviewSchema.safeParse({
    task_id: formData.get("task_id"),
    decision: formData.get("decision"),
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const r = parsed.data;
  if (r.decision === "reopen" && !r.note) return { fieldErrors: { note: "Please give a reason for reopening the task." } };

  const supabase = await createActionSupabase();
  const { error } = await supabase.rpc("review_task", {
    p_task_id: r.task_id,
    p_decision: r.decision,
    p_note: r.note ?? undefined,
  });
  if (error) return { error: friendlyDbError(error, "reviewTask") };

  revalidatePath(`/tasks/${r.task_id}`);
  revalidatePath("/tasks");
  return { message: r.decision === "approve" ? "Task approved and marked Completed." : "Task reopened." };
}

export async function cancelTask(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await userForAction(["admin", "manager"]))) return NOT_ALLOWED;
  const id = uuid.safeParse(formData.get("task_id"));
  const reason = z.string().trim().min(1, "Please give a reason for cancelling.").max(2000).safeParse(formData.get("reason") ?? "");
  if (!id.success) return { error: "Task not found." };
  if (!reason.success) return { fieldErrors: { reason: reason.error.issues[0]?.message ?? "Enter a reason." } };

  const supabase = await createActionSupabase();
  const { error } = await supabase.rpc("cancel_task", { p_task_id: id.data, p_reason: reason.data });
  if (error) return { error: friendlyDbError(error, "cancelTask") };

  revalidatePath(`/tasks/${id.data}`);
  revalidatePath("/tasks");
  return { message: "Task cancelled." };
}

export async function reassignTask(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await userForAction(["admin", "manager"]))) return NOT_ALLOWED;
  const id = uuid.safeParse(formData.get("task_id"));
  const assignee = uuid.safeParse(formData.get("new_assignee"));
  const reason = z.string().trim().max(2000).safeParse(formData.get("reason") ?? "");
  if (!id.success) return { error: "Task not found." };
  if (!assignee.success) return { fieldErrors: { new_assignee: "Choose a person." } };
  if (!reason.success) return { fieldErrors: { reason: "Reason is too long." } };

  const supabase = await createActionSupabase();
  const { error } = await supabase.rpc("reassign_task", {
    p_task_id: id.data,
    p_new_assignee: assignee.data,
    p_reason: reason.data || undefined,
  });
  if (error) return { error: friendlyDbError(error, "reassignTask") };

  revalidatePath(`/tasks/${id.data}`);
  revalidatePath("/tasks");
  return { message: "Task reassigned." };
}
