"use client";

import { useActionState } from "react";
import { changePassword, type FormState } from "@/app/actions/auth";
import { Alert, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export function ChangePasswordForm() {
  const [state, action] = useActionState<FormState, FormData>(changePassword, {});
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-3" noValidate>
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.message ? <Alert tone="success">{state.message}</Alert> : null}
      <Field label="Current password" name="current" error={fe.current}>
        <Input name="current" type="password" autoComplete="current-password" invalid={!!fe.current} />
      </Field>
      <Field label="New password" name="password" error={fe.password} hint="At least 8 characters, with letters and numbers.">
        <Input name="password" type="password" autoComplete="new-password" invalid={!!fe.password} />
      </Field>
      <Field label="Confirm new password" name="confirm" error={fe.confirm}>
        <Input name="confirm" type="password" autoComplete="new-password" invalid={!!fe.confirm} />
      </Field>
      <SubmitButton pendingText="Saving…">Change password</SubmitButton>
    </form>
  );
}
