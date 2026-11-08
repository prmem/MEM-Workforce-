import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { setDepartmentActive } from "@/app/actions/departments";
import { DepartmentForm } from "./department-form";

export const metadata: Metadata = { title: "Departments" };

export default async function DepartmentsPage() {
  await requireRole(["admin"]);
  const supabase = await createServerSupabase();
  const { data: departments, error } = await supabase
    .from("departments")
    .select("id, name, description, is_active, sort_order")
    .order("is_active", { ascending: false })
    .order("sort_order")
    .order("name");
  if (error) throw new Error(`Could not load departments: ${error.message}`);

  return (
    <>
      <PageHeader title="Departments" description="Add, rename, reorder or deactivate departments. Departments are never deleted." />

      <Card className="mb-6">
        <h2 className="mb-3 font-semibold text-ink">Add a department</h2>
        <DepartmentForm />
      </Card>

      {departments.length === 0 ? (
        <EmptyState title="No departments yet">Add your first department above.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {departments.map((d) => (
            <li key={d.id}>
              <Card>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ink">
                      {d.name} {d.is_active ? null : <Badge>Inactive</Badge>}
                    </p>
                    {d.description ? <p className="text-sm text-muted">{d.description}</p> : null}
                  </div>
                  <form action={setDepartmentActive}>
                    <input type="hidden" name="id" value={d.id} />
                    <input type="hidden" name="active" value={d.is_active ? "false" : "true"} />
                    <button type="submit" className="min-h-11 rounded-lg px-3 text-sm font-medium text-muted hover:bg-gray-100 hover:text-ink">
                      {d.is_active ? "Deactivate" : "Reactivate"}
                    </button>
                  </form>
                </div>
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm font-medium text-brand">Edit</summary>
                  <div className="mt-3">
                    <DepartmentForm department={d} />
                  </div>
                </details>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
