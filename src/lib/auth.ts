import "server-only";
import { cache } from "react";
import { redirect, notFound } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/labels";

export type CurrentUser = {
  userId: string;
  profileId: string;
  fullName: string;
  employeeCode: string;
  email: string;
  role: AppRole;
};

/**
 * The signed-in user's active profile, or null.
 * Role comes ONLY from the database (RLS returns no row for inactive employees).
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createServerSupabase();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    if (userError && userError.name !== "AuthSessionMissingError") {
      console.error("[auth] getUser failed", userError.message);
    }
    return null;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, full_name, employee_code, work_email, role")
    .eq("user_id", user.id)
    .eq("employment_status", "active")
    .maybeSingle();
  if (error) {
    throw new Error(`Could not load your profile: ${error.message}`);
  }
  if (!profile) return null;

  return {
    userId: user.id,
    profileId: profile.id,
    fullName: profile.full_name,
    employeeCode: profile.employee_code,
    email: profile.work_email,
    role: profile.role,
  };
});

/** For pages: signed-in active user or redirect to login. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** For pages: user must have one of the roles, otherwise 404 (do not reveal the page exists). */
export async function requireRole(roles: AppRole[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) notFound();
  return user;
}

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** For Server Actions: returns the user if they hold one of the roles, else null. */
export async function userForAction(roles?: AppRole[]): Promise<CurrentUser | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  if (roles && !roles.includes(user.role)) return null;
  return user;
}

export const NOT_ALLOWED: ActionResult = { ok: false, error: "You are not allowed to do this." };
