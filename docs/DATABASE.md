# Database

Migrations: `supabase/migrations/`. Tests: `supabase/tests/` (`npm run test:db`).

## Tables (Phase 1)

| Table | Purpose | Client access |
|---|---|---|
| `departments` | Configurable departments. Seeded with the 7 proposed in the spec. | Read: any active user. Insert/update: admins. No delete. |
| `profiles` | One row per employee. `user_id` links to Supabase Auth (set automatically by a trigger when the invited user is created, matched by email). | Read: self, direct reports (managers), all (admins). Insert/update: admins only, and only listed columns (never `user_id`). No delete. |
| `tasks` | Task records | **Read only** (assignee, assignee's direct manager, admins). Writes only through the functions below. |
| `task_updates` | Append-only history of every status change, progress update, review, edit, reassignment and cancellation | Read only, same visibility as the task. Never edited or deleted. |
| `audit_logs` | Who changed what: profile, department and task reassignment changes, with before/after JSON | Admins read. Written only by triggers. |

Tables from the spec's suggested list that belong to later phases (attendance, shifts, leave, notifications, attachments, comments, recurring rules, settings) are **not** created yet. `employee_roles` and `manager_assignments` are not needed: there is one role per person (`profiles.role`), and the owner chose direct reports as the team definition (`profiles.reporting_manager_id`).

## Profile rules (trigger `profiles_enforce_rules`)

- The reporting manager must be an active manager or admin. No loops in the reporting chain.
- The department must be active when it is assigned.
- The work email (the login identity) cannot change once the account exists.
- Nobody can change their own role or employment status.
- A manager with active direct reports cannot be demoted or deactivated until those reports are moved.
- At least one active admin must always exist.

## Helper functions (used by RLS)

`current_profile_id()`, `current_app_role()`, `is_admin()`, `is_manager_of(profile)`, `can_manage_assignee(profile)`.
- An inactive person resolves to nothing, so they have no access.
- `colleague_names()` returns only id, name, designation and department of active staff (owner-approved). It is used to show "Created by" and similar names without exposing contact details.

## Task functions (the only way to change tasks)

| Function | Who | Rules |
|---|---|---|
| `create_task` | Admin: anyone. Manager: active direct reports only. | Department copied from the assignee. Quantities ≥ 0 (target > 0). Due date not before start date. |
| `update_task_progress` | Assignee only | To Do → In Progress; In Progress ⇄ Blocked (reason required); In Progress → Submitted for Review; Reopened → In Progress. Locked while under review. Not allowed on closed tasks. |
| `review_task` | Assignee's manager or an admin, never the assignee | Submitted for Review → Completed (records reviewer + time) or → Reopened (reason required). |
| `edit_task`, `reassign_task`, `cancel_task` | Assignee's manager or an admin, never the assignee | Only open tasks. Reassignment stays within the caller's team and is also audit-logged. Cancelling needs a reason. |

## Sources of truth

- **Task status:** `tasks.status`. "Completed" always means a manager or admin accepted the work.
- **Task history:** `task_updates` (append-only).
- **Overdue:** computed, never stored: `due_at < now()` and status is not Completed or Cancelled. Implemented in `isOverdue()` (`src/lib/labels.ts`) and the equivalent dashboard query.
- **Dashboard numbers:** live `count` queries under the viewer's RLS (admin: company; manager: active direct reports; employee: own).
- **Attendance status and performance calculations:** not implemented (Phase 2 and Phase 4).
