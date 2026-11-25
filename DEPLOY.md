# Deploying Pythia Listen

This guide gets the demo onto a public URL so your team and pilot clients can use it. Default target: **Vercel** + **Vercel Postgres** + **password gate**.

The codebase already supports this — no further code changes needed before you deploy. JSON file storage is used locally; Postgres is used automatically when `POSTGRES_URL` is set on the deployed environment.

---

## Step-by-step

### 1. Push to GitHub

```bash
cd path/to/pythia-listen

# initialise + commit
git init
git add .
git commit -m "Initial Pythia Listen"

# create the repo on github.com (any name, set to private)
# then connect and push:
git remote add origin https://github.com/YOUR_USERNAME/pythia-listen.git
git branch -M main
git push -u origin main
```

> `.env.local` is gitignored. Your API key and password do NOT go to GitHub.

### 2. Connect Vercel

1. Sign in to vercel.com (with GitHub for the smoothest flow).
2. Click **Add New… → Project**.
3. Pick the `pythia-listen` repo. Vercel auto-detects Next.js.
4. **Don't deploy yet.** Click **Environment Variables** first.

### 3. Provision Vercel Postgres

While the project is still in "configure" mode (or right after first deploy):

1. In your Vercel project, go to **Storage → Create Database → Postgres**.
2. Pick a region (closest to you / your team).
3. Vercel automatically adds `POSTGRES_URL` (and a few related vars) to the project's env vars. You don't have to copy/paste anything.

### 4. Set the rest of the env vars

In Vercel project → **Settings → Environment Variables**, add:

| Name | Value | Scope |
|---|---|---|
| `ANTHROPIC_API_KEY` | `sk-ant-api03-…` (from console.anthropic.com) | Production, Preview, Development |
| `PYTHIA_PASSWORD` | your shared team password | Production, Preview, Development |

(`POSTGRES_URL` is already there from step 3.)

### 5. Deploy

Click **Deploy**. Wait ~60 seconds. Vercel gives you a URL like `pythia-listen.vercel.app`.

### 6. Run the migration

Tables haven't been created yet — Vercel Postgres provisioned the database, but it's empty. From your laptop:

```bash
# pull the production env vars locally so you can run the migration script
vercel env pull .env.production.local

# run the migration against production Postgres
POSTGRES_URL=$(grep ^POSTGRES_URL .env.production.local | cut -d= -f2-) npm run db:migrate
```

You should see `✅ Schema ready.`

### 7. Seed the demo project

```bash
POSTGRES_URL=$(grep ^POSTGRES_URL .env.production.local | cut -d= -f2-) npm run db:init
```

You should see `✅ Seeded Honua Solar & Storage (demo)`.

### 8. Test it

Open the Vercel URL. You'll be redirected to `/login`. Enter your `PYTHIA_PASSWORD`. The homepage loads. Click Community → Begin conversation → confirm a conversation works end-to-end.

### 9. Share it

Send the URL + password to your team via Slack:

```
Pythia is live for testing: https://pythia-listen.vercel.app

Password: [your password]

What we want feedback on:
- Does the AI feel honest and respectful?
- Anything that feels survey-y or pushy?
- Try it in Spanish too, if you can
- Drop observations into the Slack thread

Don't share this link or password outside the team yet.
```

---

## Updating the deployed app

After step 9, every change you push to GitHub auto-deploys to Vercel:

```bash
# edit code locally
git add -A
git commit -m "describe what changed"
git push
```

Vercel detects the push and redeploys in ~60 seconds.

To rotate the password: change `PYTHIA_PASSWORD` in Vercel Settings → Environment Variables, and re-deploy (Settings → Deployments → "..." on latest → Redeploy). All existing logged-in users get bounced to /login.

To rotate the Anthropic key: same flow with `ANTHROPIC_API_KEY`.

---

## Workflow note: pull request vs. push to main

The setup above pushes directly to `main`, which auto-deploys to production. That's fine for a small team.

For a pilot client environment, consider:
1. Protect `main` branch in GitHub (require PRs).
2. Use Vercel preview deploys: every PR gets its own URL automatically. Test there before merging.

---

## Cost monitoring

Two costs:

- **Anthropic API**: pay-as-you-go from your `console.anthropic.com` balance. Set the monthly cap at console.anthropic.com/settings/limits — ~$50–100 is plenty for team testing.
- **Vercel + Vercel Postgres**: Hobby (free) tier covers up to ~100GB-hours of compute and 60h Postgres compute. Plenty for a team of 10. Pro tier is $20/mo if you need more.

Watch the Anthropic spend page weekly during pilot testing. Each conversation costs $0.05–0.20; synthesis adds ~$0.10; Tier 1 ~$0.05.

---

## Troubleshooting

**"Pythia is misconfigured: PYTHIA_PASSWORD env var is not set."**
You forgot step 4 (or set the var only in Production scope and you're hitting a Preview deploy). Check Vercel Settings → Environment Variables.

**`/login` accepts the password but every page sends me back to /login.**
Cookie is being set but rejected. Most common cause: middleware running on the wrong host (e.g., custom domain mismatch). Check the cookie is `httpOnly + samesite=lax` in DevTools → Application → Cookies, and that the host matches.

**Conversations exist locally but not on the deployed site.**
Right — local uses JSON files (`data/runtime/`), production uses Postgres. They don't sync. If you want to migrate local conversations into production, write a one-off script that reads from `data/runtime/*.json` and inserts into Postgres via `lib/db/postgres.ts`.

**Synthesis returns 500 in production.**
Most likely an Anthropic rate-limit or no-credits issue. Check `console.anthropic.com/settings/billing`. Vercel logs (project → Deployments → latest → Runtime Logs) show the exact error from the API response.

**"Build failed" on Vercel.**
Run `npm run build` locally first; type errors that don't show in `npm run dev` will surface during build. Fix locally, push, redeploy.

---

## Rolling back

To revert: Vercel project → **Deployments** → click the previous good deployment → **Promote to Production**. Two clicks. Data is unaffected.
