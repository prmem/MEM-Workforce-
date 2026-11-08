# Known Limitations (Phase 1)

## Not built yet (by design: later phases)
- Attendance, check-in/out, GPS, shifts, holidays, supervisor-assisted attendance (Phase 2).
- Task attachments, comments, recurring tasks, in-app notifications, due-date reminders, department-specific task fields, advanced filters (Phase 3). New tasks appear on the employee's dashboard and task list, but there is no notification yet.
- Leave, performance reports, CSV exports, retention controls (Phase 4).
- Security review, backup/restore test, accessibility audit, deployment (Phase 5).
- Profile photos (optional in the spec; needs Supabase Storage). Assigned shift on the profile (Phase 2).

## Current behaviour to be aware of
- **Status code on blocked pages:** when a signed-in user opens a page their role cannot use, the app shows "Page not found" with no data. Because pages stream (to show a loading indicator), the HTTP status is 200 rather than 404. This is not a security issue: the data is never sent. But tools that check status codes will see 200.
- **Self-review is blocked:** nobody can approve their own task. An admin's own tasks must be reviewed by another admin or by the admin's reporting manager.
- **Task list** shows at most 200 tasks per filter. Use the filters to narrow it.
- **Former employees** appear as "Former employee" in task history and "Created by", because colleague names are limited to active staff.
- **Work email** cannot be changed after the account is created (it is the login). To change it, deactivate the old profile and add a new one.
- **Rate limiting** relies on Supabase Auth. Sign-in requests come from the app server, so Supabase's per-IP sign-in limit effectively applies to the whole app. Review it in the Supabase dashboard (see DEPLOYMENT.md). Adding CAPTCHA or app-level throttling is a Phase 5 item.
- **Deactivation order:** the profile is deactivated first (access removed immediately), then sign-in is blocked in Supabase Auth. If the second step fails, the admin sees an error and should retry. Data access is already blocked either way.
- **Tested environments:** automated browser tests ran on Chromium at desktop (1280×800) and Pixel 7 sizes only. Safari/iPhone and real Android devices have **not** been tested yet (Phase 5).
- **The "preview image"** mentioned in the brief was not received. The UI follows the written Phase 1 scope.
