import type { Metadata } from "next";
import Link from "next/link";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-ink">Reset your password</h1>
      <p className="text-sm text-muted">Enter your work email. We will send you a link to choose a new password.</p>
      <ForgotForm />
      <p className="text-center text-sm">
        <Link href="/login" className="font-medium text-brand hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
