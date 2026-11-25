# Connecting channel folders (Email / WhatsApp / Drive) via a service account

The **Listening inbox** (`/operator/channels`) reads Google Drive folders you
share with a Google *service account* — one folder per channel. Drop files
(dummy or real) into those folders and they show up as direct-listening signal.
No interactive Google login flow: the app authenticates server-to-server.

This uses **no extra npm packages** — the app signs the service-account request
with Node's crypto and calls the Drive REST API directly.

## One-time setup (~15 min)

### 1. Create a service account + key
1. Go to <https://console.cloud.google.com/> and pick (or create) a project.
2. **APIs & Services → Library →** enable **Google Drive API**.
3. **APIs & Services → Credentials → Create credentials → Service account.**
   Name it e.g. `pythia-drive-reader`. Skip the optional roles.
4. Open the new service account → **Keys → Add key → Create new key → JSON.**
   A `.json` file downloads. Keep it safe — it's a secret.
5. Note the service account's **email** (looks like
   `pythia-drive-reader@your-project.iam.gserviceaccount.com`).

### 2. Give the key to the app (Vercel env var)
In Vercel → your project → **Settings → Environment Variables**, add:

- `PYTHIA_GOOGLE_SA_KEY` = the **entire contents** of that JSON file
  (paste the whole `{ ... }`). Base64 is also accepted if pasting raw JSON is
  awkward in the UI.

### 3. Create the channel folders + share them
1. In Google Drive, create three folders, e.g. **Pythia – Email**,
   **Pythia – WhatsApp**, **Pythia – Drive docs**.
2. Share **each** folder with the service account's email as **Viewer**
   (the same email from step 1.5).
3. Open each folder and copy its **folder id** from the URL —
   `https://drive.google.com/drive/folders/<THIS_PART_IS_THE_ID>`.

### 4. Tell the app the folder ids (Vercel env vars)
Add these (any you want to use):

- `PYTHIA_DRIVE_FOLDER_EMAIL` = the Email folder id
- `PYTHIA_DRIVE_FOLDER_WHATSAPP` = the WhatsApp folder id
- `PYTHIA_DRIVE_FOLDER_DRIVE` = the Drive-docs folder id

(Advanced: instead of the three vars you can set `PYTHIA_DRIVE_CHANNELS` to a
JSON array `[{"channel":"email","label":"Email","folderId":"…"}, …]`.)

Optional: `PYTHIA_CHANNELS_CAMPAIGN` sets which campaign these signals attach to
(defaults to the Frasier pilot so they sit alongside the civic record).

### 5. Redeploy, then refresh
Redeploy (env-var changes need a new deploy). Open **Listening inbox** and
click **Refresh channels**.

## What files work
- Plain text / Markdown (`.txt`, `.md`), `.json`, and `.eml` email files:
  read directly.
- Google Docs: exported as plain text automatically.
- Sheets, Slides, images, and other binaries are skipped for now.

## The live-demo loop
1. Drop a new file into one of the shared folders (e.g. a fake WhatsApp message
   in the WhatsApp folder).
2. Click **Refresh channels**.
3. The new message is read, turned into a signal (stance + themes + summary),
   and appears in that channel column — and feeds the dashboard's direct-
   listening bucket and meta-synthesis.

## Notes
- Only aggregate/role descriptions are surfaced; the extractor is instructed
  never to publish a private individual's real name.
- Nothing is written to your Drive — read-only (`drive.readonly` scope).
- A daily refresh can be automated later with a cron hitting
  `/api/ingest/channels` with the `PYTHIA_CRON_SECRET` bearer token.
