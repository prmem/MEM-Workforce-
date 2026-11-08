"use client";

import { useActionState } from "react";
import { signIn, type FormState } from "@/app/actions/auth";
import { Alert, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState<FormState, FormData>(signIn, {});
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      {state.error ? <Alert>{state.error}</Alert> : null}
      <Field label="Work email" name="email" error={state.fieldErrors?.email}>
        <Input name="email" type="email" autoComplete="username" inputMode="email" required invalid={!!state.fieldErrors?.email} />
      </Field>
      <Field label="Password" name="password" error={state.fieldErrors?.password}>
        <Input name="password" type="password" autoComplete="current-password" required invalid={!!state.fieldErrors?.password} />
      </Field>
      <SubmitButton className="w-full" pendingText="Signing in…">
        Sign in
      </SubmitButton>
    </form>
  );
}
