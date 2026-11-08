import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Alert } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/safe-redirect";
import { LoginForm } from "./login-form";
import { InactiveNotice } from "./inactive-notice";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNextPath(params.next);

  if (await getCurrentUser()) redirect(next);

  // Signed in to Auth but no active profile (deactivated / not set up).
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) return <InactiveNotice />;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-ink">Sign in</h1>
      {params.error === "link" ? (
        <Alert>This link is invalid or has expired. Ask your admin for a new invite, or reset your password.</Alert>
      ) : null}
      {params.signedOut ? <Alert tone="success">You have signed out.</Alert> : null}
      <LoginForm next={next} />
      <p className="text-center text-sm">
        <Link href="/forgot-password" className="font-medium text-brand hover:underline">
          Forgot your password?
        </Link>
      </p>
    </div>
  );
}
