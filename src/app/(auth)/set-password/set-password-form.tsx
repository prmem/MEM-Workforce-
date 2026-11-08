"use client";

import { useActionState } from "react";
import { setNewPassword, type FormState } from "@/app/actions/auth";
import { Alert, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export function SetPasswordForm() {
  const [state, action] = useActionState<FormState, FormData>(setNewPassword, {});
  return (
    <form action={action} className="space-y-4" noValidate>
      {state.error ? <Alert>{state.error}</Alert> : null}
      <Field label="New password" name="password" error={state.fieldErrors?.password}>
        <Input name="password" type="password" autoComplete="new-password" required invalid={!!state.fieldErrors?.password} />
      </Field>
      <Field label="Confirm new password" name="confirm" error={state.fieldErrors?.confirm}>
        <Input name="confirm" type="password" autoComplete="new-password" required invalid={!!state.fieldErrors?.confirm} />
      </Field>
      <SubmitButton className="w-full" pendingText="Saving…">
        Save password
      </SubmitButton>
    </form>
  );
}
