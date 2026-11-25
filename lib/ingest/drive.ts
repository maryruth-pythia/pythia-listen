/**
 * Google Drive reader — service-account, zero-dependency.
 *
 * Reads specific Drive folders the operator has shared with a Google service
 * account (a "robot" Google identity). No interactive OAuth flow to build:
 * the operator shares each folder with the service account's email, and the
 * app authenticates server-to-server with the account's key.
 *
 * We sign the service-account JWT with Node's crypto and call the Drive REST
 * API with fetch, so this adds NO npm dependencies (no googleapis package).
 *
 * Config (env vars):
 *   PYTHIA_GOOGLE_SA_KEY   — the service-account JSON key (raw JSON or base64).
 *   PYTHIA_DRIVE_CHANNELS  — JSON: [{ "channel":"email", "label":"Email",
 *                             "folderId":"<drive folder id>" }, ...]
 *   (or individual: PYTHIA_DRIVE_FOLDER_EMAIL / _WHATSAPP / _DRIVE)
 */

import { createSign } from 'node:crypto';
import type { SignalSource } from '../types';

export interface ChannelConfig {
  channel: string; // 'email' | 'whatsapp' | 'drive' | 'desk' | ...
  label: string;
  folderId: string;
  /** Which signal bucket this folder feeds. Community channels → 'pythia'
   * (direct listening); internal research/reports → 'desk'. Default 'pythia'. */
  source: SignalSource;
}

export interface RawChannelItem {
  channel: string;
  channelLabel: string;
  fileId: string;
  fileName: string;
  text: string;
  webViewLink?: string;
  modifiedTime?: string;
  /** Signal bucket carried from the channel config. */
  source: SignalSource;
}

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DRIVE_FILES = 'https://www.googleapis.com/drive/v3/files';
const SCOPE = 'https://www.googleapis.com/auth/drive.readonly';
const MAX_TEXT = 4000;

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function loadServiceAccount(): ServiceAccount | null {
  const raw = process.env.PYTHIA_GOOGLE_SA_KEY;
  if (!raw) return null;
  let json = raw.trim();
  // Accept base64-encoded JSON too (avoids newline issues in some env UIs).
  if (!json.startsWith('{')) {
    try {
      json = Buffer.from(json, 'base64').toString('utf8');
    } catch {
      /* fall through */
    }
  }
  try {
    const parsed = JSON.parse(json) as Partial<ServiceAccount>;
    if (parsed.client_email && parsed.private_key) {
      return {
        client_email: parsed.client_email,
        // Some env UIs escape newlines; normalize them back.
        private_key: parsed.private_key.replace(/\\n/g, '\n'),
      };
    }
  } catch {
    /* invalid */
  }
  return null;
}

/** Load channel folder config from env. */
export function loadChannelConfig(): ChannelConfig[] {
  const out: ChannelConfig[] = [];
  const jsonEnv = process.env.PYTHIA_DRIVE_CHANNELS;
  if (jsonEnv) {
    try {
      const arr = JSON.parse(jsonEnv) as (ChannelConfig & { source?: SignalSource })[];
      for (const c of arr) {
        if (c?.channel && c?.folderId) {
          out.push({
            channel: c.channel,
            label: c.label ?? c.channel,
            folderId: c.folderId,
            source: c.source ?? 'pythia',
          });
        }
      }
    } catch {
      /* ignore malformed */
    }
  }
  const individual: Array<[string, string, string | undefined, SignalSource]> = [
    ['email', 'Email', process.env.PYTHIA_DRIVE_FOLDER_EMAIL, 'pythia'],
    ['whatsapp', 'WhatsApp', process.env.PYTHIA_DRIVE_FOLDER_WHATSAPP, 'pythia'],
    ['drive', 'Drive docs', process.env.PYTHIA_DRIVE_FOLDER_DRIVE, 'pythia'],
    ['desk', 'Desk research', process.env.PYTHIA_DRIVE_FOLDER_DESK, 'desk'],
  ];
  for (const [channel, label, folderId, source] of individual) {
    if (folderId && !out.some((c) => c.channel === channel)) {
      out.push({ channel, label, folderId, source });
    }
  }
  return out;
}

export function driveConfigured(): boolean {
  return !!loadServiceAccount() && loadChannelConfig().length > 0;
}

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = base64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    })
  );
  const signingInput = `${header}.${claim}`;
  const signer = createSign('RSA-SHA256');
  signer.update(signingInput);
  const signature = base64url(signer.sign(sa.private_key));
  const jwt = `${signingInput}.${signature}`;

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google token exchange failed (${res.status}): ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error('No access_token from Google.');
  return data.access_token;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  webViewLink?: string;
}

const FOLDER_MIME = 'application/vnd.google-apps.folder';

/** List the DIRECT children of a folder, following pagination so folders with
 * more than one page (100) of items aren't silently truncated. */
async function listFolder(folderId: string, token: string): Promise<DriveFile[]> {
  const all: DriveFile[] = [];
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'nextPageToken, files(id,name,mimeType,modifiedTime,webViewLink)',
      pageSize: '100',
      orderBy: 'modifiedTime desc',
      // Include files that live in Shared Drives (not just "My Drive"). Without
      // these three, the Drive API silently returns only My-Drive items.
      includeItemsFromAllDrives: 'true',
      supportsAllDrives: 'true',
      corpora: 'allDrives',
    });
    if (pageToken) params.set('pageToken', pageToken);
    const res = await fetch(`${DRIVE_FILES}?${params}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Drive list failed (${res.status}): ${body.slice(0, 200)}`);
    }
    const data = (await res.json()) as {
      files?: DriveFile[];
      nextPageToken?: string;
    };
    if (data.files) all.push(...data.files);
    pageToken = data.nextPageToken;
  } while (pageToken);
  return all;
}

/** Walk a folder AND all its subfolders, returning every non-folder file.
 * Depth-capped and cycle-guarded so a deep or looping tree can't run away. */
async function listFolderTree(
  folderId: string,
  token: string,
  depth = 0,
  seen: Set<string> = new Set()
): Promise<DriveFile[]> {
  if (depth > 8 || seen.has(folderId)) return [];
  seen.add(folderId);
  const children = await listFolder(folderId, token);
  const files: DriveFile[] = [];
  const subfolders: DriveFile[] = [];
  for (const f of children) {
    if (f.mimeType === FOLDER_MIME) subfolders.push(f);
    else files.push(f);
  }
  for (const sf of subfolders) {
    files.push(...(await listFolderTree(sf.id, token, depth + 1, seen)));
  }
  return files;
}

async function readFileText(file: DriveFile, token: string): Promise<string> {
  // Google-native docs must be exported; everything else downloaded raw.
  let url: string;
  if (file.mimeType.startsWith('application/vnd.google-apps')) {
    if (
      file.mimeType === 'application/vnd.google-apps.spreadsheet' ||
      file.mimeType === 'application/vnd.google-apps.presentation'
    ) {
      // Skip binary-ish exports for now; treat as empty.
      return '';
    }
    url = `${DRIVE_FILES}/${file.id}/export?mimeType=text/plain&supportsAllDrives=true`;
  } else if (
    file.mimeType.startsWith('text/') ||
    file.mimeType === 'application/json' ||
    file.mimeType === 'message/rfc822'
  ) {
    url = `${DRIVE_FILES}/${file.id}?alt=media&supportsAllDrives=true`;
  } else {
    return ''; // unsupported binary type
  }
  const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  if (!res.ok) return '';
  const text = await res.text();
  return text.slice(0, MAX_TEXT);
}

export interface CollectResult {
  items: RawChannelItem[];
  /** Total files found across all folders (listing only). */
  totalFiles: number;
  /** How many were skipped because they're already ingested. */
  skipped: number;
}

/**
 * Read configured channel folders. Listing is cheap (one call per folder);
 * reading file content is the slow part, so we only read up to `opts.limit`
 * files that aren't already ingested (`opts.skipFileIds`). This keeps a single
 * request well under the serverless time limit; the caller loops until done.
 */
export async function collectChannels(opts?: {
  limit?: number;
  skipFileIds?: Set<string>;
}): Promise<CollectResult> {
  const sa = loadServiceAccount();
  const channels = loadChannelConfig();
  if (!sa || channels.length === 0)
    return { items: [], totalFiles: 0, skipped: 0 };

  const token = await getAccessToken(sa);
  const limit = opts?.limit ?? Infinity;
  const skip = opts?.skipFileIds ?? new Set<string>();

  // 1) List every folder (fast).
  const metas: { ch: ChannelConfig; file: DriveFile }[] = [];
  for (const ch of channels) {
    try {
      const files = await listFolderTree(ch.folderId, token);
      for (const file of files) metas.push({ ch, file });
    } catch {
      continue; // a bad folder id shouldn't kill the whole run
    }
  }
  const totalFiles = metas.length;

  // 2) Pick unprocessed files, capped at `limit`.
  const selected: { ch: ChannelConfig; file: DriveFile }[] = [];
  let skipped = 0;
  for (const m of metas) {
    if (skip.has(m.file.id)) {
      skipped++;
      continue;
    }
    if (selected.length < limit) selected.push(m);
  }

  // 3) Read content only for the selected files — in parallel to stay fast.
  const read = await Promise.all(
    selected.map(async ({ ch, file }) => ({
      ch,
      file,
      text: (await readFileText(file, token)).trim(),
    }))
  );
  const items: RawChannelItem[] = [];
  for (const { ch, file, text } of read) {
    if (!text) continue;
    items.push({
      channel: ch.channel,
      channelLabel: ch.label,
      fileId: file.id,
      fileName: file.name,
      text,
      webViewLink: file.webViewLink,
      modifiedTime: file.modifiedTime,
      source: ch.source,
    });
  }
  return { items, totalFiles, skipped };
}

export interface ChannelDiagnostic {
  configured: boolean;
  serviceAccountEmail: string | null;
  error?: string;
  channels: Array<{
    channel: string;
    label: string;
    folderId: string;
    ok: boolean;
    fileCount?: number;
    sampleNames?: string[];
    error?: string;
  }>;
}

/**
 * Read-only diagnostic: what can the service account actually see? Surfaces
 * auth failures, empty folders, and bad folder ids that the main ingestion
 * flow swallows. Does no extraction, so it returns fast.
 */
export async function diagnose(): Promise<ChannelDiagnostic> {
  const sa = loadServiceAccount();
  const channels = loadChannelConfig();
  const out: ChannelDiagnostic = {
    configured: !!sa && channels.length > 0,
    serviceAccountEmail: sa?.client_email ?? null,
    channels: [],
  };
  if (!sa) {
    out.error =
      'PYTHIA_GOOGLE_SA_KEY is missing or could not be parsed as a service-account JSON key.';
    return out;
  }
  if (channels.length === 0) {
    out.error =
      'No channel folders configured (set PYTHIA_DRIVE_FOLDER_EMAIL / _WHATSAPP / _DRIVE).';
    return out;
  }
  let token: string;
  try {
    token = await getAccessToken(sa);
  } catch (e) {
    out.error = `Google auth failed: ${e instanceof Error ? e.message : String(e)}`;
    return out;
  }
  for (const ch of channels) {
    try {
      const files = await listFolderTree(ch.folderId, token);
      out.channels.push({
        channel: ch.channel,
        label: ch.label,
        folderId: ch.folderId,
        ok: true,
        fileCount: files.length,
        sampleNames: files.slice(0, 5).map((f) => f.name),
      });
    } catch (e) {
      out.channels.push({
        channel: ch.channel,
        label: ch.label,
        folderId: ch.folderId,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
  return out;
}
