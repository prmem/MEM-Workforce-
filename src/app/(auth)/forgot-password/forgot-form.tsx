"use client";

import { useActionState } from "react";
import { requestPasswordReset, type FormState } from "@/app/actions/auth";
import { Alert, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export function ForgotForm() {
  const [state, action] = useActionState<FormState, FormData>(requestPasswordReset, {});
  if (state.message) return <Alert tone="success">{state.message}</Alert>;
  return (
    <form action={action} className="space-y-4" noValidate>
      {state.error ? <Alert>{state.error}</Alert> : null}
      <Field label="Work email" name="email" error={state.fieldErrors?.email}>
        <Input name="email" type="email" autoComplete="username" inputMode="email" required invalid={!!state.fieldErrors?.email} />
      </Field>
      <SubmitButton className="w-full" pendingText="Sending…">
        Send reset link
      </SubmitButton>
    </form>
  );
}
