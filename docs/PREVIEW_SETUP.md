# Preview Setup (click-through, no keys shared)

This creates an online **preview** of MEM Workforce with **fictional demo data only**. It's in a separate Supabase project, so your future real system starts clean.

Time needed: about 20–30 minutes. You only use the Supabase and Vercel websites.

You need two files:
- `1-supabase-setup.sql`: the database structure and security rules. Generate it with `npm run db:bundle > 1-supabase-setup.sql`, or use the copy Claude sent you.
- `2-preview-demo-data.sql`: fictional people and tasks (`supabase/preview-demo-data.sql`). **Preview only.**

Menu names on both websites change from time to time. If a label differs slightly, look for the closest match.

---

## Part A: Supabase (database and sign-in)

1. **Create the project.** At supabase.com, sign in, then choose **New project**.
   - Name: `mem-workforce-preview`
   - Region: **Mumbai (South Asia)**
   - Database password: press **Generate** and save it in a password manager. You won't need it for these steps.
   - Wait until the project finishes setting up.
2. **Set up the database.** Open **SQL Editor → New query**. Paste the whole of `1-supabase-setup.sql` and press **Run**. It should finish with "Success. No rows returned".
3. **Load demo data.** Open a **new** query, paste the whole of `2-preview-demo-data.sql`, and press **Run**. The result should say `Demo data loaded: 10 people, 12 tasks.`
4. **Create the three demo logins.** Go to **Authentication → Users → Add user → Create new user**, three times:
   - `admin@example.com`
   - `manager.production@example.com`
   - `vikram@example.com`

   Give each a password of your choice (8+ characters, letters and numbers) and tick **Auto Confirm User**. Each login connects to its demo profile automatically.
5. **Turn off public sign-up.** Under **Authentication → Sign In / Providers**, switch **off** "Allow new users to sign up". Under **Email**, set the minimum password length to **8**, with **letters and digits** required, if offered.
6. **Copy three values** from **Project Settings → API Keys**. Paste them into Vercel only, never into chat:
   - **Project URL**, for example `https://abcd....supabase.co`. It's also shown under Project Settings → Data API.
   - **Publishable key** (`sb_publishable_...`), or the legacy **anon** key.
   - **Secret key** (`sb_secret_...`), or the legacy **service_role** key. This one is private.

## Part B: Vercel (the website)

7. At vercel.com, choose **Add New → Project → Import Git Repository** and pick **prmem/MEM-Workforce-**. If it isn't listed, allow Vercel to access that GitHub repository when asked.
8. Leave the framework as **Next.js**. Open **Environment Variables** and add:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL from step 6 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable (or anon) key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Secret (or service_role) key |
   | `NEXT_PUBLIC_SITE_URL` | `https://example.com` for now (fixed in step 10) |

9. Press **Deploy** and wait about 2 minutes. Copy your site address, for example `https://mem-workforce-xyz.vercel.app`.
10. **Point everything at the real address:**
    - In Vercel, go to **Settings → Environment Variables**, set `NEXT_PUBLIC_SITE_URL` to your site address, then **Deployments → ⋯ → Redeploy**.
    - In Supabase, go to **Authentication → URL Configuration**. Set **Site URL** to your site address and add `https://<your-site>/**` to **Redirect URLs**.

## Part C: Email templates (needed for invites and password reset)

11. In Supabase, go to **Authentication → Emails → Templates**:
    - **Invite user:** subject `You have been invited to MEM Workforce`. Replace the body with the contents of `supabase/templates/invite.html`.
    - **Reset password:** subject `Reset your MEM Workforce password`. Replace the body with `supabase/templates/recovery.html`.

    Supabase's built-in email sends only a few emails per hour. That's enough to try one invite in a preview, but production needs a proper email service.

## Check it

12. Open your site and sign in as each demo login:
    - `admin@example.com` sees the company dashboard.
    - `manager.production@example.com` sees "My Team" (Vikram, Kavita, Arjun).
    - `vikram@example.com` sees only his own tasks.

## Notes
- **Everything in this preview is fictional.** When you're ready for real use, create a **new** Supabase project for production. Don't load the demo data there; create the first admin with `scripts/create-first-admin.mjs` (see `DEPLOYMENT.md`).
- **Updates:** every new commit to the repository's main branch redeploys the site automatically.
