import { Badge } from "@/components/ui";
import { PRIORITY_LABELS, TASK_STATUS_LABELS, type TaskPriority, type TaskStatus } from "@/lib/labels";

const STATUS_TONE: Record<TaskStatus, "gray" | "red" | "amber" | "green" | "blue"> = {
  to_do: "gray",
  in_progress: "blue",
  blocked: "amber",
  submitted_for_review: "amber",
  completed: "green",
  reopened: "red",
  cancelled: "gray",
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{TASK_STATUS_LABELS[status]}</Badge>;
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const tone = priority === "urgent" ? "red" : priority === "high" ? "amber" : "gray";
  return <Badge tone={tone}>{PRIORITY_LABELS[priority]}</Badge>;
}

export function OverdueBadge() {
  return <Badge tone="red">Overdue</Badge>;
}
