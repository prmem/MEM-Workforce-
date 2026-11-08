"use client";

import { useActionState } from "react";
import { createDepartment, updateDepartment } from "@/app/actions/departments";
import type { FormState } from "@/app/actions/auth";
import { Alert, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

type Department = { id: string; name: string; description: string | null; sort_order: number };

export function DepartmentForm({ department }: { department?: Department }) {
  const [state, action] = useActionState<FormState, FormData>(department ? updateDepartment : createDepartment, {});
  const fe = state.fieldErrors ?? {};
  const prefix = department ? `d-${department.id}-` : "new-";
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_1fr_7rem_auto] sm:items-end" noValidate>
      {department ? <input type="hidden" name="id" value={department.id} /> : null}
      <div className="sm:col-span-4">
        {state.error ? <Alert>{state.error}</Alert> : null}
        {state.message ? <Alert tone="success">{state.message}</Alert> : null}
      </div>
      <Field label="Name" name={`${prefix}name`} error={fe.name} required>
        <Input id={`${prefix}name`} name="name" defaultValue={department?.name} required maxLength={80} invalid={!!fe.name} />
      </Field>
      <Field label="Description" name={`${prefix}description`} error={fe.description}>
        <Input id={`${prefix}description`} name="description" defaultValue={department?.description ?? ""} maxLength={500} />
      </Field>
      <Field label="Order" name={`${prefix}sort_order`} error={fe.sort_order}>
        <Input id={`${prefix}sort_order`} name="sort_order" type="number" min={0} max={10000} defaultValue={department?.sort_order ?? 100} />
      </Field>
      <SubmitButton pendingText="Saving…">{department ? "Save" : "Add"}</SubmitButton>
    </form>
  );
}
