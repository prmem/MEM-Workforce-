import type { Database } from "@/lib/database.types";

export type AppRole = Database["public"]["Enums"]["app_role"];
export type TaskStatus = Database["public"]["Enums"]["task_status"];
export type TaskPriority = Database["public"]["Enums"]["task_priority"];
export type EmploymentStatus = Database["public"]["Enums"]["employment_status"];

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Admin",
  manager: "Manager",
  employee: "Employee",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  to_do: "To Do",
  in_progress: "In Progress",
  blocked: "Blocked",
  submitted_for_review: "Submitted for Review",
  completed: "Completed",
  reopened: "Reopened",
  cancelled: "Cancelled",
};

export const TASK_STATUSES = Object.keys(TASK_STATUS_LABELS) as TaskStatus[];
export const OPEN_TASK_STATUSES: TaskStatus[] = ["to_do", "in_progress", "blocked", "submitted_for_review", "reopened"];
export const CLOSED_TASK_STATUSES: TaskStatus[] = ["completed", "cancelled"];

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};
export const TASK_PRIORITIES = Object.keys(PRIORITY_LABELS) as TaskPriority[];

export const EMPLOYMENT_STATUS_LABELS: Record<EmploymentStatus, string> = {
  active: "Active",
  inactive: "Inactive",
};

/** Overdue is computed, never stored: due date passed and task not closed. */
export function isOverdue(dueAt: string | null, status: TaskStatus, now: Date = new Date()): boolean {
  if (!dueAt || CLOSED_TASK_STATUSES.includes(status)) return false;
  return new Date(dueAt).getTime() < now.getTime();
}

/** Status moves the assignee may make (mirrors update_task_progress in the database). */
export function nextStatusesForAssignee(status: TaskStatus): TaskStatus[] {
  switch (status) {
    case "to_do":
      return ["in_progress"];
    case "in_progress":
      return ["blocked", "submitted_for_review"];
    case "blocked":
    case "reopened":
      return ["in_progress"];
    default:
      return [];
  }
}
