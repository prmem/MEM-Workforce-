"use client";

import { useActionState } from "react";
import { resendInvite, setEmployeeStatus } from "@/app/actions/employees";
import type { FormState } from "@/app/actions/auth";
import { Alert, Card } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export function EmployeeAdminActions({
  id,
  status,
  isSelf,
  canInvite,
}: {
  id: string;
  status: "active" | "inactive";
  isSelf: boolean;
  canInvite: boolean;
}) {
  const [statusState, statusAction] = useActionState<FormState, FormData>(setEmployeeStatus, {});
  const [inviteState, inviteAction] = useActionState<FormState, FormData>(resendInvite, {});
  const deactivating = status === "active";

  return (
    <Card className="mt-4">
      <h2 className="mb-3 font-semibold text-ink">Account actions</h2>
      <div className="space-y-3">
        {statusState.error ? <Alert>{statusState.error}</Alert> : null}
        {statusState.message ? <Alert tone="success">{statusState.message}</Alert> : null}
        {inviteState.error ? <Alert>{inviteState.error}</Alert> : null}
        {inviteState.message ? <Alert tone="success">{inviteState.message}</Alert> : null}

        <div className="flex flex-wrap gap-2">
          {canInvite ? (
            <form action={inviteAction}>
              <input type="hidden" name="id" value={id} />
              <SubmitButton variant="secondary" pendingText="Sending…">Resend invite</SubmitButton>
            </form>
          ) : null}
          {isSelf ? (
            <p className="text-sm text-muted">You cannot deactivate your own account.</p>
          ) : (
            <form
              action={statusAction}
              onSubmit={(ev) => {
                if (deactivating && !window.confirm("Deactivate this employee? They will be signed out and lose access. Their history is kept.")) {
                  ev.preventDefault();
                }
              }}
            >
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="status" value={deactivating ? "inactive" : "active"} />
              <SubmitButton variant={deactivating ? "danger" : "secondary"} pendingText="Saving…">
                {deactivating ? "Deactivate employee" : "Reactivate employee"}
              </SubmitButton>
            </form>
          )}
        </div>
        <p className="text-xs text-muted">Employees are never deleted. Deactivation keeps all history and blocks sign-in.</p>
      </div>
    </Card>
  );
}
