"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createActionSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { userForAction } from "@/lib/auth";
import { friendlyDbError } from "@/lib/errors";
import { emailSchema, fieldErrors } from "@/lib/validation";
import { siteUrl } from "@/lib/env";
import type { FormState } from "@/app/actions/auth";

const optionalText = (max: number, msg: string) =>
  z
    .string()
    .trim()
    .max(max, msg)
    .transform((v) => (v === "" ? null : v));

const optionalUuid = z
  .string()
  .transform((v) => (v === "" ? null : v))
  .pipe(z.uuid("Invalid selection.").nullable());

const employeeSchema = z.object({
  employee_code: z
    .string()
    .trim()
    .min(1, "Enter an employee ID.")
    .max(20, "Employee ID is too long.")
    .regex(/^[A-Za-z0-9-]+$/, "Use letters, numbers and hyphens only.")
    .transform((v) => v.toUpperCase()),
  full_name: z.string().trim().min(1, "Enter the full name.").max(120, "Name is too long."),
  phone: optionalText(20, "Phone number is too long.").refine(
    (v) => v === null || /^\+?[0-9][0-9 -]{6,19}$/.test(v),
    "Enter a valid phone number (digits, spaces, hyphens, optional +).",
  ),
  department_id: optionalUuid,
  designation: optionalText(80, "Designation is too long."),
  reporting_manager_id: optionalUuid,
  joining_date: z
    .string()
    .transform((v) => (v === "" ? null : v))
    .pipe(z.iso.date("Enter a valid date.").nullable()),
  role: z.enum(["admin", "manager", "employee"], "Choose a role."),
});

function formValues(formData: FormData) {
  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v : "";
  };
  return {
    employee_code: get("employee_code"),
    full_name: get("full_name"),
    phone: get("phone"),
    department_id: get("department_id"),
    designation: get("designation"),
    reporting_manager_id: get("reporting_manager_id"),
    joining_date: get("joining_date"),
    role: get("role"),
  };
}

async function sendInvite(email: string): Promise<string | null> {
  const admin = createAdminSupabase();
  const { error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: `${siteUrl()}/auth/confirm` });
  if (!error) return null;
  if (error.code === "email_exists" || error.status === 422) {
    return "An account with this email already exists. If they have already set a password, ask them to use “Forgot password”.";
  }
  if (error.status === 429) return "Too many emails sent recently. Please wait and try again.";
  console.error("[employees] invite failed", { code: error.code, status: error.status, message: error.message });
  return "The invite email could not be sent. Check the email settings and use “Resend invite”.";
}

export async function createEmployee(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await userForAction(["admin"]))) return { error: "You are not allowed to do this." };

  const email = emailSchema.safeParse(formData.get("work_email"));
  const parsed = employeeSchema.safeParse(formValues(formData));
  if (!parsed.success || !email.success) {
    const errs = parsed.success ? {} : fieldErrors(parsed.error);
    if (!email.success) errs.work_email = email.error.issues[0]?.message ?? "Enter a valid email address.";
    return { fieldErrors: errs };
  }

  // Insert with the admin's own session: RLS confirms they are an admin.
  const supabase = await createActionSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .insert({ ...parsed.data, work_email: email.data })
    .select("id")
    .single();
  if (error) return { error: friendlyDbError(error, "createEmployee") };

  // The auth user created by the invite is linked to this profile by a database trigger.
  const inviteError = await sendInvite(email.data);
  revalidatePath("/employees");
  redirect(`/employees/${data.id}?created=1${inviteError ? `&inviteError=${encodeURIComponent(inviteError)}` : ""}`);
}

export async function updateEmployee(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await userForAction(["admin"]))) return { error: "You are not allowed to do this." };
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return { error: "Employee not found." };

  const parsed = employeeSchema.safeParse(formValues(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const update: typeof parsed.data & { work_email?: string } = { ...parsed.data };
  const emailRaw = formData.get("work_email");
  if (typeof emailRaw === "string") {
    const email = emailSchema.safeParse(emailRaw);
    if (!email.success) return { fieldErrors: { work_email: email.error.issues[0]?.message ?? "Enter a valid email." } };
    update.work_email = email.data;
  }

  const supabase = await createActionSupabase();
  const { data, error } = await supabase.from("profiles").update(update).eq("id", id.data).select("id");
  if (error) return { error: friendlyDbError(error, "updateEmployee") };
  if (!data?.length) return { error: "Employee not found." };

  revalidatePath("/employees");
  redirect(`/employees/${id.data}?saved=1`);
}

/** Deactivate / reactivate. The database change is authoritative (RLS blocks inactive users
 *  immediately); sign-in is also blocked in Supabase Auth so they cannot get new sessions. */
export async function setEmployeeStatus(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await userForAction(["admin"]);
  if (!me) return { error: "You are not allowed to do this." };
  const id = z.uuid().safeParse(formData.get("id"));
  const status = z.enum(["active", "inactive"]).safeParse(formData.get("status"));
  if (!id.success || !status.success) return { error: "Invalid request." };

  const supabase = await createActionSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .update({ employment_status: status.data })
    .eq("id", id.data)
    .select("user_id");
  if (error) return { error: friendlyDbError(error, "setEmployeeStatus") };
  if (!data?.length) return { error: "Employee not found." };

  revalidatePath("/employees");
  revalidatePath(`/employees/${id.data}`);

  const userId = data[0].user_id;
  if (userId) {
    const admin = createAdminSupabase();
    const { error: banError } = await admin.auth.admin.updateUserById(userId, {
      ban_duration: status.data === "inactive" ? "876000h" : "none",
    });
    if (banError) {
      console.error("[employees] auth ban update failed", { code: banError.code, message: banError.message });
      return {
        error:
          status.data === "inactive"
            ? "Employee deactivated and can no longer see any data, but blocking their sign-in failed. Please try again."
            : "Employee reactivated, but unblocking their sign-in failed. Please try again.",
      };
    }
  }
  return { message: status.data === "inactive" ? "Employee deactivated." : "Employee reactivated." };
}

export async function resendInvite(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await userForAction(["admin"]))) return { error: "You are not allowed to do this." };
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return { error: "Employee not found." };

  // Read with the admin's session (RLS) to confirm the profile exists and is active.
  const supabase = await createActionSupabase();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("work_email, employment_status")
    .eq("id", id.data)
    .maybeSingle();
  if (error) return { error: friendlyDbError(error, "resendInvite") };
  if (!profile) return { error: "Employee not found." };
  if (profile.employment_status !== "active") return { error: "Reactivate the employee before sending an invite." };

  const inviteError = await sendInvite(profile.work_email);
  if (inviteError) return { error: inviteError };
  return { message: `Invite sent to ${profile.work_email}.` };
}
