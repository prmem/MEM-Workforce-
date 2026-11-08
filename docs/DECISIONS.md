# Owner Decisions (Phase 1)

Confirmed by the owner on 08/11/2026, before implementation began.

| Topic | Decision |
|---|---|
| Login | Work email + password (Supabase Auth). |
| Account creation | Admin adds the employee; the system emails an invite link so the employee sets their own password. Production needs an SMTP provider. |
| Manager's team | Direct reports only (`profiles.reporting_manager_id`). |
| Task completion | Employee moves the task to "Submitted for Review"; the assignee's manager (or an admin) marks it "Completed" or "Reopened". |
| Logo | Extracted exactly from the supplied vector artwork (business-card PDF). Never redrawn. |
| Company name | "Maheshwari Electrical Manufacturing Pvt. Ltd." (as in the spec). |
| Editing employee profiles | Admins only. |
| Phone / email visibility | The employee, their direct manager, and admins. |
| Colleague names | All active staff can see colleagues' name, designation and department only (no contact details, joining date or role). Approved with the Phase 1 plan. |
| `cacheComponents` (Next.js) | Off. Every page shows private per-user data and renders per request. |

## Open items (need owner input later)
- The "preview image" referred to in the brief was not attached.
- Production: Supabase cloud project, SMTP provider for invite / reset emails, Vercel account.
- Shifts, leave policy, retention periods: Phase 2+ and not yet defined. Not assumed.
