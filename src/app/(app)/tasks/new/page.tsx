import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { TaskForm } from "../task-form";
import { assignablePeople } from "../data";

export const metadata: Metadata = { title: "New task" };

export default async function NewTaskPage() {
  const me = await requireRole(["admin", "manager"]);
  const people = await assignablePeople(me);
  return (
    <>
      <PageHeader
        title="New task"
        description={me.role === "manager" ? "You can assign tasks to people who report to you." : "Assign a task to any active employee."}
      />
      {people.length === 0 ? (
        <EmptyState title="No one to assign to">
          {me.role === "manager" ? "No active employees report to you yet. Ask an admin to set you as their reporting manager." : "Add employees first."}
        </EmptyState>
      ) : (
        <Card>
          <TaskForm people={people} />
        </Card>
      )}
    </>
  );
}
