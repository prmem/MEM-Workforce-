# Privacy and Compliance Notes

> These are engineering notes, **not legal advice**. Using Supabase or Vercel does not by itself make the application legally compliant. MEM should have these items reviewed under applicable Indian law, including the Digital Personal Data Protection Act, 2023 and its rules, and employment law.

## What Phase 1 stores
- Employee name, employee ID, work email, phone (optional), department, designation, reporting manager, joining date, role, employment status.
- Tasks, task history, and an audit log of administrative changes.
- **No location data.** GPS arrives in Phase 2, under the fixed policy in `docs/SPEC.md` §6: only at check-in/check-out, never continuous, no geofencing.

## Privacy defaults implemented
- Phone and email are visible only to the person, their direct manager, and admins.
- Other staff see only colleagues' name, designation and department (owner-approved).
- Deactivation keeps records but removes all access immediately.
- Administrative changes (roles, managers, departments, deactivation, task reassignment) are audit-logged.
- Private pages are never cached by shared caches, for shared devices.
- Development uses fictional data only.

## Items needing a decision or review
1. **Notice and consent:** an employee privacy notice explaining what is collected and why (needed before Phase 2 GPS).
2. **Retention periods** for former employees' records, audit logs and (Phase 2) location data. Not defined, so not assumed.
3. **Data location:** choose the Supabase region (for example Mumbai) and confirm it is acceptable.
4. **Access to audit logs:** currently admins only.
5. **Correction requests:** currently handled by an admin editing the profile on the employee's request.
6. **Backups and restore procedure:** to be tested in Phase 5.
7. **Email provider:** invite and reset emails pass through the chosen SMTP provider.
