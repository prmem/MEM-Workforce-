# Architecture

## Overview

```
Browser (phone / desktop, installable PWA)
   │  HTTPS, session in secure cookies
   ▼
Next.js 16 App Router (one app, Vercel-compatible)
   ├─ src/proxy.ts            refreshes the Supabase session; signed-out → /login; private pages = no-store
   ├─ Server Components       read data with the user's own session (RLS applies)
   ├─ Server Actions          validate input (zod) → call Postgres as the user
   └─ src/lib/supabase/admin  service role, server only: invites + sign-in blocking, after an admin check
   │
   ▼
Supabase
   ├─ Auth      email + password, invite-only (public sign-up disabled)
   └─ Postgres  Row Level Security on every table + permission-checking functions
```

## Security model (defence in depth)

1. **The database is the gatekeeper.**
   - Every table has RLS enabled. Clients get least-privilege grants: no DELETE anywhere, and no direct writes to tasks, history or audit logs.
   - Task changes are only possible through `SECURITY DEFINER` functions that check who you are and which status moves are allowed.
2. **The server checks again.** Each Server Action confirms the signed-in user and their role, read from the database and never sent by the browser, and validates input before calling Postgres.
3. **The UI only hides things.** Hidden buttons are a convenience, not a security boundary. Blocked pages render "Page not found".
4. **Roles come from `profiles.role`.** Only admins can change them, nobody can change their own, and at least one active admin must always exist (enforced by a trigger).
5. **Deactivation:**
   - The profile becomes `inactive`, so every helper function returns nothing and the person sees no data immediately.
   - Their Supabase Auth user is also banned, so they cannot sign in again.
6. **No caching of private pages.** Next.js `cacheComponents` is off. Private responses are sent with `Cache-Control: private, no-store`, which matters on shared factory devices.
7. **Email links:** invite and reset links open a page with a **Continue** button. The one-time token is verified only on that POST, so email scanners cannot use it up.

## Code layout

```
src/
  proxy.ts                     session refresh + login redirect
  app/(auth)/                  login, forgot-password, auth/confirm, set-password
  app/(app)/                   signed-in area: dashboard, tasks, employees, departments, profile
  app/actions/                 Server Actions (auth, employees, departments, tasks)
  components/                  UI building blocks, navigation, badges
  lib/auth.ts                  data access layer: current user and role checks
  lib/supabase/{server,admin,proxy}.ts
  lib/format.ts                Asia/Kolkata, DD/MM/YYYY, 12-hour time (only place for display formatting)
  lib/labels.ts                status, priority and role labels; overdue rule
supabase/
  migrations/                  schema, RLS, functions (source of truth for permissions)
  tests/                       pgTAP tests run directly in Postgres
  templates/                   invite and password reset email templates
tests/integration/             Vitest against the local Supabase API
tests/e2e/                     Playwright (desktop + mobile)
scripts/                       seed.mjs (local only), create-first-admin.mjs (one-time production setup)
```

## Time handling

- All timestamps are stored as `timestamptz` (UTC).
- They are displayed in Asia/Kolkata as DD/MM/YYYY with 12-hour AM/PM.
- Due date and time typed into a form are interpreted as IST and converted to UTC (`istInputToUtcIso`). India has no daylight saving, so the offset is always +05:30.
