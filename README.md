# MEM Workforce

Internal employee and task app for **Maheshwari Electrical Manufacturing Pvt. Ltd. (MEM)**.

**Status: Phase 1 (Foundation).** Not deployed. Do not deploy to production without the owner's approval.

| Phase 1 includes | Not yet built (later phases) |
|---|---|
| Email + password login, admin invitations, password reset | Attendance, check-in/out, GPS (Phase 2) |
| Roles: Admin, Manager, Employee (enforced in the database) | Task attachments, comments, recurring tasks, notifications (Phase 3) |
| Employee directory, add / edit / deactivate employees | Leave, performance reports, CSV exports (Phase 4) |
| Department management | Production hardening and deployment (Phase 5) |
| Task assignment, progress updates, submit → approve / reopen, reassign, cancel, history | |
| Dashboard with employee and task counts | |

Documentation:
- [docs/SPEC.md](docs/SPEC.md): the full specification (source of truth)
- [docs/DECISIONS.md](docs/DECISIONS.md): decisions confirmed by the owner
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): how the app is built
- [docs/DATABASE.md](docs/DATABASE.md): tables, security rules, sources of truth
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md): Supabase cloud and Vercel setup (for when approved)
- [docs/PREVIEW_SETUP.md](docs/PREVIEW_SETUP.md): click-through online preview with fictional data
- [docs/ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md) and [docs/EMPLOYEE_GUIDE.md](docs/EMPLOYEE_GUIDE.md): user guides
- [docs/PRIVACY_NOTES.md](docs/PRIVACY_NOTES.md): privacy and compliance items needing review
- [docs/KNOWN_LIMITATIONS.md](docs/KNOWN_LIMITATIONS.md)

## Requirements

- Node.js 22 or newer, and npm
- Docker (runs the local Supabase stack)
- No cloud accounts are needed for local development. See [Deployment](docs/DEPLOYMENT.md) for the accounts production needs.

## Local setup

```bash
npm install
npm run db:start          # starts local Supabase in Docker and prints local URLs and keys
cp .env.example .env.local
# Fill .env.local:
#   NEXT_PUBLIC_SUPABASE_URL       -> API_URL from `npx supabase status`
#   NEXT_PUBLIC_SUPABASE_ANON_KEY  -> ANON_KEY
#   SUPABASE_SERVICE_ROLE_KEY      -> SERVICE_ROLE_KEY   (server only)
#   SEED_USER_PASSWORD             -> any local password with letters and numbers (8+)
npm run db:reset          # applies migrations and loads fictional demo data
npm run dev               # http://localhost:3000
```

> If Docker cannot pull images from `public.ecr.aws`, run Supabase CLI commands with
> `SUPABASE_INTERNAL_IMAGE_REGISTRY=docker.io` set.

### Demo accounts (fictional, local only)

All demo accounts use the password in `SEED_USER_PASSWORD`.

| Email | Role | Notes |
|---|---|---|
| admin@example.com | Admin | Anita Demo |
| manager.production@example.com | Manager | Team: Vikram, Kavita, Arjun |
| manager.sales@example.com | Manager | Team: Meena, Rahul |
| vikram@example.com, kavita@example.com, arjun@example.com, meena@example.com, rahul@example.com, pooja@example.com | Employee | |
| former@example.com | Employee (deactivated) | Cannot sign in |

Emails sent by the local stack (invites, password resets) are caught by Mailpit at http://127.0.0.1:54324.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / run |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript (strict) |
| `npm test` | Vitest unit tests + integration tests against the local Supabase API (needs `db:start` + `db:reset`) |
| `npm run test:db` | pgTAP tests run **directly in Postgres**: RLS, role escalation, team limits, task workflow, privileges |
| `npm run test:e2e` | Playwright end-to-end tests, desktop + mobile (needs `db:reset`, `npm run build`; starts `npm start` if nothing is on port 3000) |
| `npm run db:start` / `db:stop` | Start / stop local Supabase |
| `npm run db:reset` | Recreate the local database from migrations, then seed fictional data |
| `npm run db:types` | Regenerate `src/lib/database.types.ts` from the local schema |
| `npm run seed` | Seed fictional data (local only; refuses non-local URLs) |
| `npm run db:bundle` | Print all migrations as one SQL file, for the Supabase SQL Editor (see PREVIEW_SETUP.md) |

Recommended full check, run from a clean state:

```bash
npm run db:reset && npm run lint && npm run typecheck && npm run test:db && npm test && npm run build && npm run test:e2e
```

## Environment variables

| Name | Where used | Secret? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + server | No |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + server (all access limited by RLS) | No (public by design) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only**: sending invites, blocking sign-in of deactivated staff | **Yes, never expose** |
| `NEXT_PUBLIC_SITE_URL` | Invite / reset link target | No |
| `SEED_USER_PASSWORD` | Local seed and tests only | Local only |

Never commit `.env.local`. `.env.example` contains placeholders only.

## Migrations

SQL migrations live in `supabase/migrations/` and are version-controlled.
- Locally: `npm run db:reset` applies all of them.
- Cloud: see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) (`supabase db push`).

Never edit a migration that has already been applied to a shared or cloud database. Add a new one instead.
