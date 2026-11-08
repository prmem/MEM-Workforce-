"use client";

import { useActionState } from "react";
import { createEmployee, updateEmployee } from "@/app/actions/employees";
import type { FormState } from "@/app/actions/auth";
import { Alert, Field, Input, Select } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

type Option = { id: string; name: string };
export type EmployeeFormValues = {
  id: string;
  employee_code: string;
  full_name: string;
  work_email: string;
  phone: string | null;
  department_id: string | null;
  designation: string | null;
  reporting_manager_id: string | null;
  joining_date: string | null;
  role: "admin" | "manager" | "employee";
  account_linked: boolean;
};

export function EmployeeForm({
  departments,
  managers,
  employee,
}: {
  departments: Option[];
  managers: Option[];
  employee?: EmployeeFormValues;
}) {
  const [state, action] = useActionState<FormState, FormData>(employee ? updateEmployee : createEmployee, {});
  const fe = state.fieldErrors ?? {};
  const emailLocked = !!employee?.account_linked;

  return (
    <form action={action} className="space-y-4" noValidate>
      {employee ? <input type="hidden" name="id" value={employee.id} /> : null}
      {state.error ? <Alert>{state.error}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Employee ID" name="employee_code" error={fe.employee_code} hint="Must be unique. Letters, numbers, hyphens." required>
          <Input name="employee_code" defaultValue={employee?.employee_code} required maxLength={20} invalid={!!fe.employee_code} />
        </Field>
        <Field label="Full name" name="full_name" error={fe.full_name} required>
          <Input name="full_name" defaultValue={employee?.full_name} required maxLength={120} invalid={!!fe.full_name} />
        </Field>
        <Field
          label="Work email"
          name="work_email"
          error={fe.work_email}
          hint={emailLocked ? "Cannot be changed after the account has been created." : "Used to sign in. An invite will be sent here."}
          required
        >
          {emailLocked ? (
            <Input name="work_email_display" id="work_email" value={employee?.work_email} disabled readOnly />
          ) : (
            <Input name="work_email" type="email" inputMode="email" defaultValue={employee?.work_email} required invalid={!!fe.work_email} />
          )}
        </Field>
        <Field label="Phone" name="phone" error={fe.phone} hint="Visible only to this person, their manager and admins.">
          <Input name="phone" type="tel" inputMode="tel" defaultValue={employee?.phone ?? ""} maxLength={20} invalid={!!fe.phone} />
        </Field>
        <Field label="Department" name="department_id" error={fe.department_id}>
          <Select name="department_id" defaultValue={employee?.department_id ?? ""}>
            <option value="">No department</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Designation" name="designation" error={fe.designation}>
          <Input name="designation" defaultValue={employee?.designation ?? ""} maxLength={80} />
        </Field>
        <Field label="Reporting manager" name="reporting_manager_id" error={fe.reporting_manager_id} hint="Only active managers and admins are listed.">
          <Select name="reporting_manager_id" defaultValue={employee?.reporting_manager_id ?? ""}>
            <option value="">No reporting manager</option>
            {managers
              .filter((m) => m.id !== employee?.id)
              .map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
          </Select>
        </Field>
        <Field label="Joining date" name="joining_date" error={fe.joining_date}>
          <Input name="joining_date" type="date" defaultValue={employee?.joining_date ?? ""} invalid={!!fe.joining_date} />
        </Field>
        <Field label="App role" name="role" error={fe.role} hint="Managers can assign tasks to people who report to them." required>
          <Select name="role" defaultValue={employee?.role ?? "employee"} required>
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </Select>
        </Field>
      </div>

      <SubmitButton pendingText="Saving…">{employee ? "Save changes" : "Add employee and send invite"}</SubmitButton>
    </form>
  );
}
