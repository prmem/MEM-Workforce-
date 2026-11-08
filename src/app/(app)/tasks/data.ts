import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import type { CurrentUser } from "@/lib/auth";

/** People the current user may assign tasks to. Admin: all active staff. Manager: active direct reports. */
export async function assignablePeople(me: CurrentUser): Promise<{ id: string; name: string }[]> {
  if (me.role === "employee") return [];
  const supabase = await createServerSupabase();
  let query = supabase
    .from("profiles")
    .select("id, full_name, employee_code")
    .eq("employment_status", "active")
    .order("full_name");
  if (me.role === "manager") query = query.eq("reporting_manager_id", me.profileId);
  const { data, error } = await query;
  if (error) throw new Error(`Could not load people: ${error.message}`);
  return data.map((p) => ({ id: p.id, name: `${p.full_name} (${p.employee_code})` }));
}

/** id -> name for active colleagues (names, designation and department only). */
export async function colleagueNameMap(): Promise<Map<string, string>> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("colleague_names");
  if (error) throw new Error(`Could not load names: ${error.message}`);
  return new Map(data.map((c) => [c.id, c.full_name]));
}
