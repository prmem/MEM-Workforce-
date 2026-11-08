# MEM Workforce — Permanent Rules

Source of truth for requirements: `docs/SPEC.md`. Current scope: **Phase 1 only** (see `docs/SPEC.md` §18).
Next.js in this repo is v16 with breaking changes — read `node_modules/next/dist/docs/` before using an API (see @AGENTS.md).

## Stack
- Next.js App Router, TypeScript strict, Tailwind CSS, Supabase (Postgres, Auth, Storage), PWA, Vercel-compatible.
- One monolithic app. No microservices.

## Security
- RLS enabled on **every** table. Default deny; add explicit policies.
- Server-side authorization in every Server Action / route handler, **and** in the database (RLS / permission-checking functions).
- No service-role key in browser code. It may only be imported from `src/lib/supabase/admin.ts` (`server-only`).
- Never trust a role, user id, or ownership sent by the client. Derive identity from the session; read roles from the database.
- No hardcoded secrets or passwords. Provide `.env.example` only; real values live in untracked `.env.local` or the host's secret store.

## Privacy
- GPS is collected **only** at check-in / check-out, **never** continuously, with **no geofencing**. Never change this policy.
- Phone and email are visible only to the employee, their direct manager, and admins.

## Design
- Mobile-first, light background, MEM red accent (`#ED2126`), simple English UI for non-technical staff.
- Use the official MEM logo only (extracted from the supplied artwork). Never redraw or approximate it.
- Timezone Asia/Kolkata, dates DD/MM/YYYY, 12-hour time with AM/PM. Timestamps stored in UTC (`timestamptz`).
- All display formatting goes through `src/lib/format.ts`.

## Data
- Fictional seed data only (`@example.com` addresses). Never real employee data.
- Do not invent company policy (shifts, leave, retention, team structure). Use configurable placeholders and ask.

## Working rules
- Keep it simple. No extra features. Do not build later phases early.
- Never silence errors: no empty `catch`, no ignored Supabase `error` values.
- Never claim something is tested, secure or complete unless the check was actually run. Report failures honestly.
- After each step run: `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:db`, `npm run build`.
- Never deploy to production without the owner's explicit approval.

## Commands
- `npm run db:start` — start local Supabase (Docker). `npm run db:reset` — re-apply migrations + seed.
- `npm run test:db` — pgTAP RLS tests run directly in Postgres.
- `npm test` — Vitest unit + integration (integration needs local Supabase running).
- `npm run test:e2e` — Playwright (needs local Supabase + seed).
