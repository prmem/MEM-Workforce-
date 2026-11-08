import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { Card, PageHeader } from "@/components/ui";
import { EmployeeForm } from "../employee-form";
import { employeeFormOptions } from "../form-options";

export const metadata: Metadata = { title: "Add employee" };

export default async function NewEmployeePage() {
  await requireRole(["admin"]);
  const { departments, managers } = await employeeFormOptions();
  return (
    <>
      <PageHeader title="Add employee" description="The employee will receive an email to set their own password." />
      <Card>
        <EmployeeForm departments={departments} managers={managers} />
      </Card>
    </>
  );
}
