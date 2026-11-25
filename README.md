# Pythia Listen

Listen-phase conversational AI demo for Pythia — independent infrastructure for community voice in clean energy and energy-transition projects.

## What this is

Two surfaces in one app:

- **Community surface** — a thoughtful AI conversation about a proposed clean-energy project, governed by the Community Voices First Engagement Guide. Discloses it's an AI from turn one, gets explicit consent, listens with story-frame questions, and ends with recap → consent on sharing → a community-facing advocacy summary.
- **Operator surface** — Pythia team dashboard. Manage projects, browse conversations, run cross-conversation synthesis, generate Tier 1 Independent Signal Reports for client delivery, audit consent.

**Not the Pythia product.** A demo for fellowship reviewers and pilot conversations.

---

## Stack

| | |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| AI | Anthropic SDK (Claude Sonnet 4.5 for conversation, Opus 4.5 for synthesis) |
| Storage | File-backed JSON (local) → Postgres / Supabase (production) |
| Languages | English + Spanish |
| Deploy target | Vercel |

---

## Setup (first time)

```bash
# 1. Install
npm install

# 2. Add your Anthropic key + a shared password
cp .env.local.example .env.local
# Edit .env.local:
#   ANTHROPIC_API_KEY (from console.anthropic.com/settings/keys)
#   PYTHIA_PASSWORD   (any phrase; the team uses it to log in)

# 3. Seed the demo project
npm run db:init

# 4. Verify the API key works end-to-end
npm run health

# 5. Run the dev server
npm run dev
```

Open `http://localhost:3000`. You'll be redirected to `/login` — enter the password you set in `.env.local`. After that, everything is open.

`npm run health` should print `✅ API key valid, model reachable, end-to-end OK.` If it doesn't, see Troubleshooting below.

---

## The three surfaces

### 1. Homepage `/`

Role picker. Community card → community surface. Operator card → operator dashboard.

### 2. Community surface

| URL | What it does |
|---|---|
| `/start` | Language picker (EN/ES), FPIC introduction, "Begin conversation" |
| `/chat/[sessionId]` | Streaming chat with Pythia. Includes "I'd like to wrap up" button. Recap → consent gate → advocacy summary on close. |

### 3. Operator surface

| URL | What it does |
|---|---|
| `/operator` | Dashboard: stats, recent conversations, dev "Reset data" button |
| `/operator/projects` | All projects |
| `/operator/projects/new` | Create a new engagement (paste docket info, public comments, brief) |
| `/operator/projects/[id]` | Project detail: brief, sampled concerns, sessions, synthesis runs |
| `/operator/conversations` | All conversations across projects |
| `/operator/conversations/[id]` | Transcript viewer with stage tags + consent record + advocacy summary |
| `/operator/synthesis` | Run synthesis per project; list past runs |
| `/operator/synthesis/[id]` | Synthesis output + button to generate Tier 1 report |
| `/operator/reports/tier1/[id]` | Print-friendly Tier 1 Independent Signal Report. `Cmd+P` produces a clean PDF. |
| `/operator/consent` | Consent ledger across all sessions |

---

## How the AI is governed

The Community Voices First Engagement Guide is encoded as **TypeScript constants** in `lib/principles.ts`. Every community-facing prompt assembles principles + project context + public-comments-to-listen-for + language directive + stage guidance.

To change how the AI behaves, edit `lib/principles.ts`. To change the conversation arc per stage, edit `lib/prompts/system.community.ts`. The recap and advocacy prompts live in `lib/prompts/recap.ts` and `lib/prompts/advocacy.ts`. The synthesis and Tier 1 prompts live in `lib/prompts/synthesis.ts` and `lib/prompts/tier1.ts`.

**Editing prompts is policy work, not code work.** Anything that changes how the AI talks to a community member should be reviewed against the Engagement Guide.

---

## Adding a new project

Two ways:

### Via the UI

`/operator/projects/new`. Paste a name, location, brief in markdown, public comments (one per line), and tick which languages are supported. Saved immediately.

### Via seed data

Edit `data/seed/project-context.md` and `data/seed/docket-2022-0250-comments.json`, then run `npm run db:init` — it's idempotent and updates the existing seeded project.

---

## Consent enforcement

The synthesis pipeline filters conversations by `consent.mayShareWithDeveloper === true`. If a participant doesn't tick that box during the consent gate, their conversation is excluded from any Tier 1 deliverable. This is by design and aligns with the engagement guide — sharing without explicit per-person consent is a violation.

The consent ledger at `/operator/consent` is the authoritative record.

---

## Architecture notes

### Storage backends

`lib/db.ts` is a thin switcher. It picks a backend at boot:

- **`POSTGRES_URL` set** → `lib/db/postgres.ts` (Vercel Postgres or any Postgres). Used in production.
- **`POSTGRES_URL` unset** → `lib/db/json.ts` (file-backed JSON under `data/runtime/`). Used in local dev.

Both backends export the same function signatures. To add a new backend (Supabase client, Turso, etc.) implement `lib/db/<name>.ts` and add a switch case in `lib/db.ts`. No other file needs to change.

For production deploys, run `npm run db:migrate` once after provisioning Postgres to create the tables.

### Prompt structure

System prompts are assembled from blocks. Read `lib/prompts/system.community.ts` for the pattern: identity → project → public-comments-to-listen-for → language → stage guidance → final reminder. Each block is independently testable.

---

## Deploying to Vercel

See [DEPLOY.md](./DEPLOY.md) for the full guide. Short version:

1. Push to a GitHub repo.
2. Import to Vercel.
3. Provision Vercel Postgres from the Vercel dashboard (auto-injects `POSTGRES_URL`).
4. Set env vars in Vercel: `ANTHROPIC_API_KEY`, `PYTHIA_PASSWORD`.
5. Deploy.
6. Run `npm run db:migrate` once to create tables, then `npm run db:init` to seed the demo project.

---

## Troubleshooting

**`npm run health` returns Unauthorized.**
The key is invalid, revoked, or the account has no credit. Check `console.anthropic.com/settings/billing` (need a positive balance) and `console.anthropic.com/settings/keys` (key must be Active). Generate a fresh key, paste into `.env.local`, retry.

**`npm install` errors with "Invalid Version" or platform-specific failures.**
You probably have a stale `node_modules` and `package-lock.json` from a different platform (Linux vs. macOS). Run `rm -rf node_modules package-lock.json && npm install`.

**Type errors after editing.**
Run `npx tsc --noEmit`. Page files in Next.js can only export specific names (default, metadata, generateStaticParams, etc.); don't add other exports to a `page.tsx`. Put shared helpers in `components/`.

**Streaming chat freezes on first turn.**
The opening message can take 5–10s to compose. If it never appears, check the browser console — most likely an Anthropic error returned via the SSE `error` payload. The Chat component renders these inline.

**Synthesis says "No consented conversations available".**
The synthesis pipeline filters by `mayShareWithDeveloper === true`. Run a conversation through to the consent gate and tick that box.

**StrictMode in dev fires effects twice.**
Already handled. If you see two opening messages, you're on an old build of `components/Chat.tsx` — pull the bootstrap-guard fix.

**Wipe everything.**
`/operator` page → "Reset data" button (dev only). Or delete `data/runtime/` and re-seed.

---

## Project structure

```
middleware.ts                             Password gate (runs before every route)

app/
├── layout.tsx                            Root layout
├── page.tsx                              Homepage (role picker)
├── globals.css                           Tailwind + brand vars
├── login/page.tsx                        Password entry
├── start/page.tsx                        Community: language picker + FPIC intro
├── chat/[sessionId]/page.tsx             Community: chat
├── operator/                             Operator surface (full tree)
└── api/
    ├── health/route.ts                   Anthropic key + reachability check
    ├── login/route.ts                    POST: verify password, set cookie
    ├── logout/route.ts                   POST: clear cookie
    ├── sessions/...
    ├── conversation/...
    ├── projects/...
    ├── synthesis/...
    └── dev/wipe/route.ts                 POST (dev only): wipe runtime data

components/
├── Chat.tsx                              Community chat UI (client)
├── Markdown.tsx                          Tiny markdown renderer
├── OperatorNav.tsx                       Operator top nav
└── operator/
    ├── Shared.tsx                        StatusPill, fmtDate
    └── WipeButton.tsx                    Dev reset button

lib/
├── db.ts                                 Backend switcher (JSON vs Postgres)
├── db/
│   ├── json.ts                           File-backed JSON (local dev)
│   └── postgres.ts                       Vercel Postgres (production)
├── claude.ts                             Anthropic SDK wrapper
├── principles.ts                         Engagement Guide as code
├── seed.ts                               Loads seed data
├── types.ts                              Shared types
├── i18n/{en,es,index}.ts                 UI copy
└── prompts/
    ├── system.community.ts
    ├── recap.ts
    ├── advocacy.ts
    ├── synthesis.ts
    └── tier1.ts

data/
├── seed/                                 Source of truth (versioned)
└── runtime/                              Local JSON store (gitignored)

scripts/
├── health-check.ts                       CLI version of /api/health
└── migrate.ts                            Postgres schema migration

DEPLOY.md                                 Vercel deploy guide
BACKLOG.md                                Improvements identified, not started
README.md                                 This file
```

---

## License

Proprietary. © Pythia.
