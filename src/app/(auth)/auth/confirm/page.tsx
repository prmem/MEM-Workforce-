import type { Metadata } from "next";
import { confirmEmailLink } from "@/app/actions/auth";
import { Alert } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export const metadata: Metadata = { title: "Confirm" };

// The one-time token is verified only when the person presses the button (POST),
// so email link scanners that open links automatically cannot use it up.
export default async function ConfirmPage({ searchParams }: PageProps<"/auth/confirm">) {
  const params = await searchParams;
  const tokenHash = typeof params.token_hash === "string" ? params.token_hash : "";
  const type = params.type === "invite" || params.type === "recovery" ? params.type : null;

  if (!tokenHash || !type) {
    return <Alert>This link is invalid. Ask your admin for a new invite, or reset your password.</Alert>;
  }

  return (
    <form action={confirmEmailLink} className="space-y-4">
      <h1 className="text-xl font-bold text-ink">{type === "invite" ? "Welcome to MEM Workforce" : "Reset your password"}</h1>
      <p className="text-sm text-muted">Press continue to choose your password.</p>
      <input type="hidden" name="token_hash" value={tokenHash} />
      <input type="hidden" name="type" value={type} />
      <SubmitButton className="w-full" pendingText="Checking link…">
        Continue
      </SubmitButton>
    </form>
  );
}
