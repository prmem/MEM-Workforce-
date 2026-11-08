import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/labels";
import { signOut } from "@/app/actions/auth";
import { Button, Card, DetailRow, PageHeader } from "@/components/ui";
import { colleagueNameMap } from "../tasks/data";
import { ChangePasswordForm } from "./change-password-form";

export const metadata: Metadata = { title: "My profile" };

export default async function ProfilePage() {
  const me = await requireUser();
  const supabase = await createServerSupabase();
  const { data: p, error } = await supabase
    .from("profiles")
    .select("employee_code, full_name, work_email, phone, designation, joining_date, reporting_manager_id, departments(name)")
    .eq("id", me.profileId)
    .single();
  if (error) throw new Error(`Could not load your profile: ${error.message}`);
  const names = await colleagueNameMap();

  return (
    <>
      <PageHeader title="My profile" description="To correct any details, please contact your admin." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <dl className="divide-y divide-line">
            <DetailRow label="Name">{p.full_name}</DetailRow>
            <DetailRow label="Employee ID">{p.employee_code}</DetailRow>
            <DetailRow label="App role">{ROLE_LABELS[me.role]}</DetailRow>
            <DetailRow label="Department">{p.departments?.name ?? "—"}</DetailRow>
            <DetailRow label="Designation">{p.designation ?? "—"}</DetailRow>
            <DetailRow label="Reporting manager">
              {p.reporting_manager_id ? (names.get(p.reporting_manager_id) ?? "—") : "—"}
            </DetailRow>
            <DetailRow label="Work email">{p.work_email}</DetailRow>
            <DetailRow label="Phone">{p.phone ?? "—"}</DetailRow>
            <DetailRow label="Joining date">{formatDate(p.joining_date)}</DetailRow>
          </dl>
        </Card>
        <div className="space-y-4">
          <Card>
            <h2 className="mb-3 font-semibold text-ink">Change password</h2>
            <ChangePasswordForm />
          </Card>
          <Card>
            <h2 className="mb-1 font-semibold text-ink">Sign out</h2>
            <p className="mb-3 text-sm text-muted">Always sign out when using a shared device.</p>
            <form action={signOut}>
              <Button type="submit" variant="secondary" className="w-full">Sign out</Button>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
