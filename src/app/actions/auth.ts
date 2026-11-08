"use server";

import { redirect } from "next/navigation";
import { createActionSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { safeNextPath } from "@/lib/safe-redirect";
import { emailSchema, fieldErrors, loginSchema, newPasswordSchema, passwordSchema } from "@/lib/validation";

export type FormState = { error?: string; message?: string; fieldErrors?: Record<string, string> };

const NOT_ACTIVE = "Your account is not active. Please contact your admin.";
const RATE_LIMITED = "Too many attempts. Please wait a few minutes and try again.";

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: "Enter your work email and password.", fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createActionSupabase();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    if (error?.status === 429) return { error: RATE_LIMITED };
    if (error?.code === "user_banned") return { error: NOT_ACTIVE };
    if (error && error.code !== "invalid_credentials") {
      console.error("[auth] sign-in failed", { code: error.code, status: error.status });
    }
    // Same message for unknown email and wrong password (no account enumeration).
    return { error: "Incorrect email or password." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", data.user.id)
    .eq("employment_status", "active")
    .maybeSingle();
  if (profileError) {
    console.error("[auth] profile lookup failed", profileError.message);
    await supabase.auth.signOut();
    return { error: "We could not load your profile. Please try again." };
  }
  if (!profile) {
    await supabase.auth.signOut();
    return { error: NOT_ACTIVE };
  }

  redirect(safeNextPath(formData.get("next")));
}

export async function signOut(): Promise<void> {
  const supabase = await createActionSupabase();
  const { error } = await supabase.auth.signOut();
  if (error) console.error("[auth] sign-out failed", error.message);
  redirect("/login?signedOut=1");
}

export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { fieldErrors: { email: parsed.error.issues[0]?.message ?? "Enter a valid email." } };

  const supabase = await createActionSupabase();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data);
  if (error) {
    if (error.status === 429) return { error: RATE_LIMITED };
    console.error("[auth] reset request failed", { code: error.code, status: error.status });
  }
  // Same response whether or not the account exists.
  return { message: "If an account exists for this email, we have sent a link to reset your password." };
}

/** Invite / recovery link: verify the one-time token (POST from the confirm page). */
export async function confirmEmailLink(formData: FormData): Promise<void> {
  const tokenHash = formData.get("token_hash");
  const type = formData.get("type");
  if (typeof tokenHash !== "string" || !tokenHash || (type !== "invite" && type !== "recovery")) {
    redirect("/login?error=link");
  }
  const supabase = await createActionSupabase();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) {
    console.error("[auth] link verification failed", { code: error.code, status: error.status });
    redirect("/login?error=link");
  }
  redirect("/set-password");
}

export async function setNewPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Your link has expired. Please ask for a new one." };

  const parsed = newPasswordSchema.safeParse({ password: formData.get("password"), confirm: formData.get("confirm") });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createActionSupabase();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") return { fieldErrors: { password: "Choose a password you have not used before." } };
    if (error.code === "weak_password") return { fieldErrors: { password: "This password is too weak. Use letters and numbers." } };
    console.error("[auth] set password failed", { code: error.code, status: error.status });
    return { error: "We could not save your password. Please try again." };
  }
  redirect("/dashboard?passwordSet=1");
}

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in again." };

  const current = formData.get("current");
  if (typeof current !== "string" || current.length === 0) return { fieldErrors: { current: "Enter your current password." } };
  const parsed = newPasswordSchema.safeParse({ password: formData.get("password"), confirm: formData.get("confirm") });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  if (!passwordSchema.safeParse(parsed.data.password).success) return { fieldErrors: { password: "Invalid password." } };

  const supabase = await createActionSupabase();
  // Re-check the current password before allowing a change.
  const { error: verifyError } = await supabase.auth.signInWithPassword({ email: user.email, password: current });
  if (verifyError) {
    if (verifyError.status === 429) return { error: RATE_LIMITED };
    return { fieldErrors: { current: "Current password is incorrect." } };
  }
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") return { fieldErrors: { password: "Choose a different password from your current one." } };
    console.error("[auth] change password failed", { code: error.code, status: error.status });
    return { error: "We could not change your password. Please try again." };
  }
  return { message: "Your password has been changed." };
}
