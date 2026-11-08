# Deployment (for when the owner approves)

> **Nothing has been deployed.** These steps are for a future preview or production setup and require the owner's approval.

## Accounts and services needed

| Service | Why | Notes |
|---|---|---|
| **Supabase** project | Postgres database + Auth | Choose a region close to India (for example Mumbai, `ap-south-1`) |
| **SMTP email provider** | Invite and password reset emails | For example the company mail server, Resend or Brevo. Supabase's built-in mailer is limited to a few emails per hour and is for testing only. |
| **Vercel** (or any Node host) | Runs the Next.js app over HTTPS | HTTPS is required (and for GPS in Phase 2) |

## 1. Supabase project

1. Create the project and keep the database password safe.
2. Apply migrations from this repo:
   ```bash
   npx supabase login
   npx supabase link --project-ref <project-ref>
   npx supabase db push
   ```
3. **Authentication → Sign In / Providers:**
   - Turn **off** "Allow new users to sign up".
   - Email provider on.
   - Minimum password length 8, with letters and digits.
4. **Authentication → URL Configuration:** Site URL = the app URL (for example `https://workforce.example.com`). Add `https://<app-url>/**` to Redirect URLs.
5. **Authentication → Emails → Templates:** paste `supabase/templates/invite.html` into **Invite user** and `supabase/templates/recovery.html` into **Reset password**. Both link to `{{ .SiteURL }}/auth/confirm?token_hash=...`.
6. **Authentication → Emails → SMTP:** configure the SMTP provider.
7. **Authentication → Rate limits:** review the sign-in limit. All staff on one factory Wi-Fi share one public IP, and at shift start many people may sign in together.
8. **Do not** run `scripts/seed.mjs` (fictional data, local only; it refuses non-local URLs anyway).

## 2. First admin

Public sign-up is off, so create the first admin once:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
NEXT_PUBLIC_SITE_URL=https://<app-url> \
node scripts/create-first-admin.mjs --email <owner-email> --code ADM-001 --name "<Full Name>" --confirm
```

The script refuses to run if an admin already exists. The admin then adds everyone else in the app.

## 3. Vercel

1. Import the repository and use the defaults (Next.js).
2. Set environment variables (Production and Preview):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (**not** prefixed with `NEXT_PUBLIC_`)
   - `NEXT_PUBLIC_SITE_URL`
3. Deploy, then sign in as the first admin and check the dashboard.

## Backups

- Supabase provides daily backups on paid plans. Point-in-time recovery is an add-on.
- A backup and restore test is scheduled for Phase 5 and has **not** been done yet.
