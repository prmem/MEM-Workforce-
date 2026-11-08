# MASTER PROJECT SPECIFICATION

# MEM WORKFORCE — VERSION 1.0

> Saved verbatim from the owner's specification. This file is the source of truth for requirements.
> Owner-confirmed Phase 1 decisions are recorded in `docs/DECISIONS.md`.

## 1. PROJECT IDENTITY

Company: Maheshwari Electrical Manufacturing Pvt. Ltd. (MEM)

Application Name: MEM Workforce

Application Type: Private employee management, attendance, task tracking, and performance monitoring system.

Business Context: MEM is an Indian manufacturing company specializing in cable management products and solutions.

Primary Objective: Build a simple, reliable, secure, and mobile-friendly internal application that helps management monitor employee attendance, assigned work, task progress, deadlines, and performance.

The application should provide the most useful capabilities of systems such as Zoho People, combined with straightforward task management, without unnecessary enterprise-level complexity.

The app must be suitable for employees who are not technically experienced.

Initial Capacity: Approximately 11–30 employees, with architecture that can support future growth.

Target Devices:

- Android smartphones
- iPhones
- Desktop and laptop browsers
- Shared office or factory devices

Initial Departments (configurable):

- Production
- Quality Control
- Dispatch
- Sales
- Purchase
- Accounts
- Administration

These are proposed departments. Administrators must be able to add, edit, deactivate, and reorganize departments.

---

## 2. DESIGN REQUIREMENTS

Create a clean, professional, modern application.

Visual requirements:

- White or light neutral background.
- MEM red as the primary accent color.
- Simple cards and dashboards.
- Clear typography and readable text.
- Minimal clutter.
- Consistent spacing.
- Responsive mobile-first design.
- Easy navigation.
- Accessible forms and buttons.
- Loading indicators, empty states, and helpful error messages.
- Desktop sidebar navigation.
- Mobile bottom navigation or another intuitive mobile navigation pattern.

Use the official MEM logo when supplied. Never recreate or approximate the logo inaccurately.

The design should look like professional business software, not a marketing website.

Application language: English initially.

Timezone: Asia/Kolkata.

Default date format: DD/MM/YYYY.

Default time display: 12-hour format with AM/PM, configurable later.

Store timestamps in UTC and convert them to the appropriate timezone for display and business calculations.

---

## 3. TECHNOLOGY STACK

Use:

- Next.js with App Router
- TypeScript with strict typing
- Tailwind CSS
- Supabase PostgreSQL
- Supabase Authentication
- Supabase Storage
- Progressive Web App architecture
- Browser Geolocation API
- Vercel-compatible deployment
- Git for version control

Prefer a simple monolithic application architecture rather than unnecessary microservices.

Use established, actively maintained dependencies.

Use server-side authorization and PostgreSQL Row Level Security.

Do not expose privileged database credentials in browser code.

Do not use fake backend responses for production features.

Use fictional demonstration data only during development.

---

## 4. USER ROLES

Implement three roles.

### ADMIN / OWNER

Can:

- View company-wide dashboards.
- Create and manage employees.
- Manage departments.
- Assign and review tasks.
- View company-wide attendance.
- Review authorized GPS records.
- Correct attendance with audit history.
- Approve or reject leave.
- View performance reports.
- Export authorized reports.
- Configure shifts, holidays, and settings.
- Manage role assignments.

### MANAGER / SUPERVISOR

Can:

- View employees assigned to their team.
- Assign tasks to authorized employees.
- Review progress.
- Approve or reopen completed tasks.
- Review attendance and location exceptions for their team.
- Approve permitted leave and attendance requests.
- View team performance reports.

### EMPLOYEE

Can:

- View their own dashboard.
- Check in and check out.
- View their own attendance history.
- View assigned tasks.
- Update task progress.
- Submit completed work.
- Upload permitted attachments.
- Request leave.
- Request attendance corrections.
- View their own performance summaries.

Employees must not be able to access another employee's private records.

Managers must not automatically receive access to employees outside their authorized teams.

All permissions must be validated on the server and in the database.

---

## 5. EMPLOYEE MANAGEMENT MODULE

Create employee profiles containing:

- Internal employee ID
- Full name
- Work email, if available
- Phone number, if required
- Department
- Job designation
- Reporting manager
- Joining date
- Employment status
- Assigned shift
- Application role
- Optional profile photograph

Support:

- Adding employees.
- Editing employee profiles.
- Deactivating employees.
- Reassigning departments.
- Changing reporting managers.
- Searching and filtering employees.
- Viewing employee task and attendance summaries.

Do not permanently delete historical employee records during normal deactivation.

Employee IDs must be unique.

Authentication identities must be securely linked to employee profiles.

Do not make personal phone numbers or email addresses visible to everyone by default.

---

## 6. GPS ATTENDANCE — FINALIZED POLICY

This policy is mandatory.

Employees must be able to check in and check out from anywhere, with GPS location recorded for authorized management review when permission and device capabilities allow.

No geofencing restrictions.

No automatic rejection based on location.

No continuous background location tracking.

### Check-in Process

1. Employee signs in.
2. Employee opens Attendance.
3. Employee selects Check In.
4. The application requests location permission when needed.
5. The browser attempts to obtain current GPS coordinates.
6. The application records the check-in time using a trusted server timestamp.
7. If GPS is available, save latitude, longitude, accuracy, and location capture timestamp.
8. Show the employee a clear confirmation.
9. Display attendance and GPS verification status separately.

### Check-out Process

Repeat the location capture process.

Record:

- Employee ID
- Attendance record ID
- Server check-in timestamp
- Server check-out timestamp
- Check-in latitude and longitude, if available
- Check-out latitude and longitude, if available
- GPS accuracy in meters
- Location capture timestamps
- Location permission or availability status
- Attendance source
- Optional employee remarks
- Review status

### Important GPS Rules

- Never collect location continuously.
- Never collect location secretly.
- Never collect GPS coordinates while the employee is simply browsing the application.
- Never automatically mark an employee absent solely because GPS is unavailable.
- Never fabricate coordinates.
- Never treat GPS coordinates as conclusive proof of an employee's physical presence.
- Display GPS accuracy where relevant.
- Handle indoor GPS inaccuracies.
- Handle location permission denial.
- Handle device location services being disabled.
- Handle GPS timeouts.
- Handle unreliable connectivity.
- Use HTTPS for browser geolocation.
- Show a clear privacy notice before location collection.
- Provide an attendance exception process when GPS cannot be obtained.

### Attendance Without GPS

If location is denied or unavailable, allow the employee to submit a timestamped attendance request flagged as "Location Unavailable — Review Required."

The authorized manager can approve, reject, or request clarification.

The system must preserve the original submission and review history.

### Location Review

Authorized managers should be able to:

- Open an employee attendance record.
- View the captured check-in/check-out location on a map.
- See the timestamp and accuracy.
- Review location-unavailable records.
- Add review remarks.

Use a suitable map provider with a documented integration. Do not expose location records publicly.

Location data access must be restricted and audited.

Make location data retention configurable, subject to applicable legal and company policy requirements.

---

## 7. ATTENDANCE MANAGEMENT

Support:

- Daily check-in.
- Daily check-out.
- Attendance history.
- Working-hour calculation.
- Shift assignment.
- Late arrival identification.
- Early departure identification.
- Missing check-out identification.
- Attendance correction requests.
- Manager approval workflow.
- Monthly attendance reports.

### Attendance Statuses

Use clearly defined statuses:

- Present
- Absent
- On Approved Leave
- Holiday
- Weekly Off
- Pending Review
- Incomplete Attendance

Late arrival and early departure should be separate flags, not necessarily separate attendance statuses.

### Shift Configuration

Administrators must be able to configure:

- Shift start time
- Shift end time
- Break policy
- Grace period
- Weekly off days
- Holidays
- Overnight shifts, if required

Do not hardcode a 9 AM to 6 PM workday.

Do not automatically convert attendance records into payroll deductions.

Use server-side validation to prevent duplicate open attendance sessions and inconsistent check-in/check-out sequences.

Support overnight shifts and daylight/timezone-safe timestamp handling.

### Shared Device Attendance

Provide a secure supervisor-assisted attendance workflow for employees without personal smartphones.

Requirements:

- Supervisor must authenticate.
- Supervisor must select an authorized employee.
- The record must identify the supervisor who submitted it.
- Distinguish supervisor-recorded attendance from employee self-check-in.
- Record the reason when required.
- Prevent supervisors from impersonating employees.
- Maintain audit history.

Do not allow a shared device to expose previous users' private information.

---

## 8. TASK MANAGEMENT MODULE

This is one of the most important features.

Managers and administrators must be able to assign tasks to employees.

### Task Fields

- Task ID
- Task title
- Description
- Assigned employee
- Created by
- Department
- Priority
- Start date
- Due date and time
- Status
- Optional target quantity
- Optional completed quantity
- Optional unit of measurement
- Attachments
- Progress updates
- Completion notes
- Reviewer
- Approval status
- Created timestamp
- Updated timestamp
- Completed timestamp

### Task Priorities

- Low
- Medium
- High
- Urgent

### Task Statuses

- To Do
- In Progress
- Blocked
- Submitted for Review
- Completed
- Reopened
- Cancelled

"Completed" must represent accepted completion when manager review is required.

### Task Workflow

1. Manager creates a task.
2. Manager assigns it to an employee.
3. Employee receives an in-app notification.
4. Employee views task details.
5. Employee starts work.
6. Employee updates progress.
7. Employee submits completion notes and evidence.
8. Manager reviews the submission.
9. Manager approves completion or reopens the task.
10. The system stores the history.

### Manufacturing Examples

Production:

- Complete cable tray production batch.
- Update actual production quantity.

Quality Control:

- Inspect finished cable trays.
- Record inspection quantity and defects.

Dispatch:

- Prepare dispatch documentation.
- Confirm order dispatch.

Sales:

- Follow up with distributors.
- Record quotation or customer response.

Purchase:

- Follow up on raw material deliveries.

Accounts:

- Complete payment reconciliation.

These examples must remain configurable.

### Additional Task Rules

- Support recurring daily, weekly, and monthly tasks.
- Support task comments.
- Support attachments with file validation.
- Support due-date reminders.
- Show overdue tasks.
- Keep a history of status changes.
- Prevent unauthorized task edits.
- Allow reassignment with audit history.
- Support tasks without quantity targets.
- Prevent invalid negative quantities.
- Do not assume progress percentage equals work quality.

---

## 9. PERFORMANCE MONITORING

Create transparent performance dashboards.

Track:

- Tasks assigned.
- Tasks completed.
- Tasks pending.
- Tasks overdue.
- On-time completion rate.
- Completion trends.
- Manager quality feedback.
- Attendance summaries.
- Department-specific metrics.

### Performance Principles

Do not rank employees purely by task count.

Different departments perform different kinds of work.

Do not treat attendance as a direct measure of productivity.

Approved leave must not automatically reduce an employee's performance score.

Do not automatically penalize employees for tasks delayed by factors outside their control.

Do not use opaque AI-generated performance ratings.

### Department-Specific Metrics

Production:

- Output against assigned target.
- Rework, when reliably recorded.
- Quality review.

Quality Control:

- Inspections completed.
- Inspection accuracy or quality feedback.

Dispatch:

- Dispatch tasks completed.
- On-time dispatch performance.

Sales:

- Follow-ups completed.
- Quotations submitted.
- Conversion metrics when data is available.

Accounts:

- Assigned work completed.
- Deadline adherence.
- Review quality.

### Optional Performance Score

Do not enable a single overall score by default.

If enabled later, allow administrators to configure weights and display the exact calculation.

Keep underlying metrics visible.

Managers must be able to add contextual comments.

Employee performance reports must be reviewable and correctable.

---

## 10. LEAVE MANAGEMENT

Support:

- Leave requests.
- Start and end dates.
- Leave type.
- Optional reason.
- Approval status.
- Manager remarks.
- Leave balances.
- Leave calendar.

Possible leave types:

- Casual Leave
- Sick Leave
- Earned Leave
- Unpaid Leave
- Other

Leave entitlements and approval policies must be configurable.

Do not invent MEM's actual leave policy.

Do not automatically deduct leave balances until the relevant rules are configured and approved.

---

## 11. ADMIN DASHBOARD

Create a central dashboard showing:

- Total active employees.
- Present today.
- Absent today.
- On leave.
- Pending attendance reviews.
- Total open tasks.
- Overdue tasks.
- Tasks submitted for approval.
- Department summaries.
- Recent activity.

Include filters for:

- Date
- Department
- Employee
- Manager
- Task status

All dashboard metrics must come from authorized database queries.

Do not use fictional statistics once production data is connected.

Use meaningful empty states when no data exists.

---

## 12. REPORTS AND EXPORTS

Provide:

- Daily attendance report.
- Monthly attendance report.
- Employee task report.
- Overdue task report.
- Department task report.
- Performance summary.
- Leave report.
- Attendance exception report.

Support CSV export compatible with Excel.

Exports must respect role-based permissions and selected filters.

Protect exports against spreadsheet formula injection.

Do not include precise GPS coordinates in general reports by default.

Location exports must require separate authorization.

---

## 13. DATABASE ARCHITECTURE

Design a normalized PostgreSQL schema.

Suggested tables:

- profiles
- departments
- employee_roles
- manager_assignments
- shifts
- shift_assignments
- holidays
- attendance_records
- attendance_locations
- attendance_corrections
- attendance_reviews
- tasks
- task_updates
- task_comments
- task_attachments
- task_reviews
- recurring_task_rules
- leave_types
- leave_balances
- leave_requests
- notifications
- audit_logs
- app_settings

Use appropriate:

- Primary keys
- Foreign keys
- Unique constraints
- Check constraints
- Indexes
- Created and updated timestamps
- Secure database functions
- Row Level Security policies

Do not create unnecessary tables or duplicate sources of truth.

Use database migrations under version control.

Define and document the source of truth for attendance statuses, task statuses, and performance calculations.

---

## 14. SECURITY REQUIREMENTS

Security is mandatory because the application stores employee information and location records.

Implement:

- Secure authentication.
- Admin-controlled invitations.
- Role-based authorization.
- Database Row Level Security.
- Server-side input validation.
- Secure session management.
- Protected server routes.
- Secure file uploads.
- File type and size restrictions.
- Audit logging.
- Appropriate rate limiting.
- Secure environment variable handling.
- No hardcoded passwords.
- No publicly exposed service-role keys.
- Protection against unauthorized direct database access.
- Least-privilege permissions.

Do not use insecure demo authentication in production.

Do not trust role information supplied by the browser.

Prevent employees from changing their own authorization level.

Ensure managers can access only authorized team records.

Protect precise GPS data with additional access restrictions.

Do not store passwords in custom database tables.

---

## 15. PRIVACY AND EMPLOYEE DATA

Implement privacy-conscious defaults.

Requirements:

- Clear attendance location notice.
- Explicit location permission request.
- No continuous tracking.
- No covert monitoring.
- Role-restricted access.
- Configurable retention periods.
- Audit logs for sensitive administrative actions.
- Data correction workflows.
- Secure employee deactivation.
- Secure backup and restoration procedures.

Document any compliance decisions requiring review under applicable Indian privacy, employment, and data protection requirements.

Do not assume the application is legally compliant merely because it uses a particular technology.

Do not use real employee data during development without explicit approval.

---

## 16. NOTIFICATIONS

Implement simple in-app notifications for:

- New task assigned.
- Task deadline approaching.
- Task overdue.
- Task submitted for approval.
- Task approved or reopened.
- Attendance correction reviewed.
- Leave request approved or rejected.

Avoid complicated notification infrastructure in the first version.

Email or WhatsApp notifications may be added later with approval.

---

## 17. APPLICATION SCREENS

### Admin

1. Login
2. Dashboard
3. Employees
4. Employee Details
5. Departments
6. Attendance
7. Attendance Location Review
8. Tasks
9. Task Details
10. Task Creation
11. Task Approval
12. Performance
13. Leave Requests
14. Reports
15. Settings

### Employee

1. Login
2. My Dashboard
3. Check In / Check Out
4. My Attendance
5. My Tasks
6. Task Details
7. Task Progress Update
8. My Leave
9. My Performance
10. My Profile

### Manager

Use the relevant admin-style screens, restricted to the manager's authorized team.

All screens must work on mobile and desktop.

---

## 18. DEVELOPMENT PHASES

Do not attempt to build every module simultaneously.

### PHASE 1 — FOUNDATION

Build:

- Project structure.
- Database migrations.
- Authentication.
- Roles and authorization.
- Employee directory.
- Department management.
- Admin dashboard.
- Basic task assignment.
- Employee task dashboard.
- Task updates.
- Fictional seed data.

Deliver a working, testable application.

### PHASE 2 — ATTENDANCE AND GPS

Build:

- Check-in/out.
- GPS permission handling.
- Check-in anywhere.
- Location review.
- Attendance history.
- Shared-device attendance.
- Attendance correction workflow.
- Shift configuration.
- GPS failure handling.

### PHASE 3 — TASK WORKFLOWS

Build:

- Task approvals.
- Recurring tasks.
- Attachments.
- Comments.
- Notifications.
- Advanced task filters.
- Department-specific task fields.

### PHASE 4 — REPORTS AND LEAVE

Build:

- Leave management.
- Performance reporting.
- Attendance reports.
- CSV exports.
- Department analytics.
- Privacy and retention controls.

### PHASE 5 — PRODUCTION READINESS

Complete:

- Security review.
- Authorization testing.
- End-to-end testing.
- Mobile testing.
- GPS testing.
- Backup and restore testing.
- Accessibility review.
- Performance review.
- Deployment documentation.

Do not deploy to production without my approval.

---

## 19. TESTING REQUIREMENTS

Create automated tests for critical functionality.

Test:

- Employee login.
- Invalid login.
- Unauthorized access.
- Role escalation attempts.
- Employee data isolation.
- Manager team restrictions.
- Task creation.
- Task assignment.
- Task status changes.
- Task approval.
- Duplicate attendance submissions.
- Check-out without check-in.
- Overnight shifts.
- GPS permission denial.
- GPS unavailable.
- GPS timeout.
- Attendance correction.
- Supervisor-assisted attendance.
- Leave approval.
- Report authorization.
- File upload validation.

Test mobile and desktop layouts.

Verify database Row Level Security independently of the interface.

Do not claim a feature is tested unless the relevant tests were actually executed.

Report failing tests clearly.

---

## 20. DOCUMENTATION

Provide:

- README.md
- Architecture overview
- Database schema explanation
- Environment variable documentation
- Local installation instructions
- Supabase setup instructions
- Migration instructions
- Seed data instructions
- Test commands
- Deployment instructions
- Admin user guide
- Employee user guide
- Known limitations

Provide an ".env.example" without real secrets.

Document every required external account or service.

---

## 21. IMPLEMENTATION WORKFLOW FOR CODEX

Before writing substantial code:

1. Inspect the existing repository.
2. Identify the current project state.
3. Review this specification.
4. Identify missing business decisions.
5. Propose a concise architecture.
6. Propose the database schema.
7. Explain the Phase 1 implementation plan.
8. Ask for approval before irreversible or security-sensitive decisions.

Then implement Phase 1.

After implementation:

- Run applicable tests.
- Fix identified issues.
- Explain what works.
- Explain what remains incomplete.
- Provide preview instructions.
- List any configuration needed from me.

Do not implement future phases prematurely.

Do not make unauthorized changes to production systems.

Do not use real employee data for testing.

Do not silently change the agreed GPS policy.

---

## 22. FINAL ACCEPTANCE CRITERIA

The project is ready for an initial pilot only when:

- Authorized users can log in securely.
- Employee roles are enforced.
- Employees can view their own information.
- Managers can manage authorized teams.
- Tasks can be created, assigned, updated, and reviewed.
- Dashboard data reflects the database.
- Attendance can be recorded reliably.
- Employees can check in from anywhere.
- GPS is collected only during permitted attendance actions.
- GPS failures have a documented review workflow.
- No continuous tracking exists.
- Sensitive employee data is protected.
- Critical tests pass.
- Known limitations are documented.
- The application works on supported mobile and desktop browsers.

Features belonging to later phases must not be represented as completed before they are implemented.

---

## 23. CRITICAL INSTRUCTIONS TO CODEX

Read the entire specification before implementation.

Do not guess company policies that have not been provided.

Do not invent employee information.

Do not fabricate GPS locations.

Do not introduce unnecessary features.

Do not substitute visual mockups for working backend functionality.

Do not weaken security to make development easier.

Do not silently ignore errors.

Do not make unsupported claims about application correctness, legal compliance, or test coverage.

If any requirement is unclear, explain the ambiguity and ask for clarification.

Prioritize correctness, maintainability, security, and simplicity over speed.

Build the application incrementally, verify each completed module, and keep the code understandable.

START WITH PHASE 1 ONLY. FIRST PRESENT THE ARCHITECTURE, DATABASE DESIGN, AND IMPLEMENTATION PLAN FOR MY APPROVAL. DO NOT BEGIN PRODUCTION DEPLOYMENT.
