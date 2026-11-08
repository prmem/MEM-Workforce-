import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";

/** Active departments and active managers/admins for the employee form (admin only). */
export async function employeeFormOptions(currentDepartmentId?: string | null) {
  const supabase = await createServerSupabase();
  const [deps, mgrs] = await Promise.all([
    supabase.from("departments").select("id, name, is_active").order("sort_order").order("name"),
    supabase
      .from("profiles")
      .select("id, full_name, employee_code")
      .in("role", ["manager", "admin"])
      .eq("employment_status", "active")
      .order("full_name"),
  ]);
  if (deps.error) throw new Error(`Could not load departments: ${deps.error.message}`);
  if (mgrs.error) throw new Error(`Could not load managers: ${mgrs.error.message}`);
  return {
    // Keep the current (possibly inactive) department selectable when editing.
    departments: deps.data
      .filter((d) => d.is_active || d.id === currentDepartmentId)
      .map((d) => ({ id: d.id, name: d.is_active ? d.name : `${d.name} (inactive)` })),
    managers: mgrs.data.map((m) => ({ id: m.id, name: `${m.full_name} (${m.employee_code})` })),
  };
}
