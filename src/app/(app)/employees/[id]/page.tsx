import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { formatDate, formatDateTime } from "@/lib/format";
import { EMPLOYMENT_STATUS_LABELS, OPEN_TASK_STATUSES, ROLE_LABELS, isOverdue } from "@/lib/labels";
import { Alert, Badge, Card, DetailRow, LinkButton, PageHeader } from "@/components/ui";
import { EmployeeAdminActions } from "./admin-actions";

export const metadata: Metadata = { title: "Employee details" };

export default async function EmployeeDetailsPage({ params, searchParams }: PageProps<"/employees/[id]">) {
  const me = await requireRole(["admin", "manager"]);
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createServerSupabase();
  // RLS: a manager only gets a row for their own direct reports.
  const { data: e, error } = await supabase
    .from("profiles")
    .select(
      "id, user_id, employee_code, full_name, work_email, phone, designation, joining_date, employment_status, role, reporting_manager_id, departments(name)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Could not load employee: ${error.message}`);
  if (!e || (me.role === "manager" && e.id === me.profileId)) notFound();

  const [{ data: tasks, error: tErr }, { data: names, error: nErr }] = await Promise.all([
    supabase.from("tasks").select("status, due_at").eq("assigned_to", e.id),
    supabase.rpc("colleague_names"),
  ]);
  if (tErr) throw new Error(`Could not load tasks: ${tErr.message}`);
  if (nErr) throw new Error(`Could not load names: ${nErr.message}`);

  const managerName = e.reporting_manager_id
    ? (names.find((n) => n.id === e.reporting_manager_id)?.full_name ?? "Former employee")
    : "—";
  const open = tasks.filter((t) => OPEN_TASK_STATUSES.includes(t.status)).length;
  const overdue = tasks.filter((t) => isOverdue(t.due_at, t.status)).length;
  const review = tasks.filter((t) => t.status === "submitted_for_review").length;
  const completed = tasks.filter((t) => t.status === "completed").length;

  // Account status (admin only; uses the service role after the admin check above).
  let account: { label: string; lastSignIn: string | null } | null = null;
  if (me.role === "admin") {
    if (!e.user_id) {
      account = { label: "No account yet — send an invite", lastSignIn: null };
    } else {
      const { data: authUser, error: aErr } = await createAdminSupabase().auth.admin.getUserById(e.user_id);
      if (aErr) {
        console.error("[employees] getUserById failed", aErr.message);
        account = { label: "Could not load account status", lastSignIn: null };
      } else {
        const signedIn = authUser.user.last_sign_in_at;
        account = { label: signedIn ? "Active account" : "Invite sent — password not set yet", lastSignIn: signedIn ?? null };
      }
    }
  }

  return (
    <>
      <PageHeader
        title={e.full_name}
        description={`${e.employee_code}${e.designation ? ` · ${e.designation}` : ""}`}
        actions={
          <>
            <LinkButton href={`/tasks?assignee=${e.id}`} variant="secondary">View tasks</LinkButton>
            {me.role === "admin" ? <LinkButton href={`/employees/${e.id}/edit`}>Edit</LinkButton> : null}
          </>
        }
      />

      <div className="space-y-3">
        {sp.created ? <Alert tone="success">Employee added.</Alert> : null}
        {sp.saved ? <Alert tone="success">Changes saved.</Alert> : null}
        {typeof sp.inviteError === "string" ? <Alert>{sp.inviteError}</Alert> : null}
        {sp.created && !sp.inviteError ? <Alert tone="info">An invite email has been sent to {e.work_email}.</Alert> : null}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-2 font-semibold text-ink">Profile</h2>
          <dl className="divide-y divide-line">
            <DetailRow label="Status">
              <Badge tone={e.employment_status === "active" ? "green" : "gray"}>{EMPLOYMENT_STATUS_LABELS[e.employment_status]}</Badge>
            </DetailRow>
            <DetailRow label="App role">{ROLE_LABELS[e.role]}</DetailRow>
            <DetailRow label="Department">{e.departments?.name ?? "—"}</DetailRow>
            <DetailRow label="Reporting manager">{managerName}</DetailRow>
            <DetailRow label="Work email">{e.work_email}</DetailRow>
            <DetailRow label="Phone">{e.phone ?? "—"}</DetailRow>
            <DetailRow label="Joining date">{formatDate(e.joining_date)}</DetailRow>
            {account ? <DetailRow label="Account">{account.label}</DetailRow> : null}
            {account?.lastSignIn ? <DetailRow label="Last sign-in">{formatDateTime(account.lastSignIn)}</DetailRow> : null}
          </dl>
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold text-ink">Tasks</h2>
          <dl className="grid grid-cols-2 gap-3 text-center">
            {[
              ["Open", open],
              ["Overdue", overdue],
              ["For review", review],
              ["Completed", completed],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg bg-surface p-3">
                <dt className="text-xs text-muted">{label}</dt>
                <dd className={`text-2xl font-bold ${label === "Overdue" && Number(value) > 0 ? "text-brand" : "text-ink"}`}>{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-muted">Attendance summary will be added in Phase 2.</p>
        </Card>
      </div>

      {me.role === "admin" ? (
        <EmployeeAdminActions
          id={e.id}
          status={e.employment_status}
          isSelf={e.id === me.profileId}
          canInvite={e.employment_status === "active" && (!account?.lastSignIn)}
        />
      ) : null}
    </>
  );
}
