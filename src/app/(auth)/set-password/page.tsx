import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { SetPasswordForm } from "./set-password-form";

export const metadata: Metadata = { title: "Choose your password" };

export default async function SetPasswordPage() {
  const user = await requireUser();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-ink">Choose your password</h1>
      <p className="text-sm text-muted">
        Signed in as <span className="font-medium text-ink">{user.email}</span>. Use at least 8 characters with letters and numbers.
      </p>
      <SetPasswordForm />
    </div>
  );
}
