import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import { Card, PageHeader } from "@/components/ui";
import { EmployeeForm } from "../../employee-form";
import { employeeFormOptions } from "../../form-options";

export const metadata: Metadata = { title: "Edit employee" };

export default async function EditEmployeePage({ params }: PageProps<"/employees/[id]/edit">) {
  await requireRole(["admin"]);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createServerSupabase();
  const { data: e, error } = await supabase
    .from("profiles")
    .select("id, employee_code, full_name, work_email, phone, department_id, designation, reporting_manager_id, joining_date, role, user_id")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Could not load employee: ${error.message}`);
  if (!e) notFound();

  const { departments, managers } = await employeeFormOptions(e.department_id);
  return (
    <>
      <PageHeader title={`Edit ${e.full_name}`} />
      <Card>
        <EmployeeForm
          departments={departments}
          managers={managers}
          employee={{ ...e, account_linked: e.user_id !== null }}
        />
      </Card>
    </>
  );
}
