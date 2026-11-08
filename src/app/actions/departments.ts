"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createActionSupabase } from "@/lib/supabase/server";
import { userForAction } from "@/lib/auth";
import { friendlyDbError } from "@/lib/errors";
import { fieldErrors } from "@/lib/validation";
import type { FormState } from "@/app/actions/auth";

const departmentSchema = z.object({
  name: z.string().trim().min(1, "Enter a department name.").max(80, "Name is too long."),
  description: z
    .string()
    .trim()
    .max(500, "Description is too long.")
    .transform((v) => (v === "" ? null : v)),
  sort_order: z.coerce.number().int("Use a whole number.").min(0).max(10000),
});

function parse(formData: FormData) {
  return departmentSchema.safeParse({
    name: formData.get("name") ?? "",
    description: formData.get("description") ?? "",
    sort_order: formData.get("sort_order") || 0,
  });
}

export async function createDepartment(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await userForAction(["admin"]))) return { error: "You are not allowed to do this." };
  const parsed = parse(formData);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createActionSupabase();
  const { error } = await supabase.from("departments").insert(parsed.data);
  if (error) return { error: friendlyDbError(error, "createDepartment") };
  revalidatePath("/departments");
  return { message: `Department "${parsed.data.name}" added.` };
}

export async function updateDepartment(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await userForAction(["admin"]))) return { error: "You are not allowed to do this." };
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return { error: "Department not found." };
  const parsed = parse(formData);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createActionSupabase();
  const { data, error } = await supabase.from("departments").update(parsed.data).eq("id", id.data).select("id");
  if (error) return { error: friendlyDbError(error, "updateDepartment") };
  if (!data?.length) return { error: "Department not found." };
  revalidatePath("/departments");
  return { message: "Department saved." };
}

export async function setDepartmentActive(formData: FormData): Promise<void> {
  if (!(await userForAction(["admin"]))) throw new Error("You are not allowed to do this.");
  const id = z.uuid().parse(formData.get("id"));
  const active = formData.get("active") === "true";

  const supabase = await createActionSupabase();
  const { error } = await supabase.from("departments").update({ is_active: active }).eq("id", id);
  if (error) throw new Error(friendlyDbError(error, "setDepartmentActive"));
  revalidatePath("/departments");
}
