/**
 * Weekly email: what's new or changed in the watched counties since the last digest.
 * Recipients come from the env var named in the watch config (kept out of the repo).
 * Skips sending when nothing changed, so a quiet week means no email.
 */
import { sendEmail, emailConfigured } from '@/lib/email/resend';
import type { WatchConfig } from './config';
import type { Lead, WatchState } from './types';
import { newSince, saveWatch } from './run';

export const STAGE_LABEL: Record<Lead['stage'], string> = {
  grid: 'Asked to connect to the grid',
  local: 'On a local meeting agenda',
  state: 'State permit filing',
  permitted: 'State permit issued',
  built: 'Under construction or operating',
};

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function digestRecipients(cfg: WatchConfig): string[] {
  const raw = cfg.digestEnv ? process.env[cfg.digestEnv] ?? '' : '';
  return raw.split(',').map((s) => s.trim()).filter((s) => /@/.test(s));
}

export function buildDigest(boardName: string, boardUrl: string, added: Lead[], changed: Lead[], nearby: Set<string> = new Set()) {
  const where = (l: Lead) => `${l.county}${nearby.has(l.county) ? ' (nearby)' : ''}`;
  const line = (l: Lead) =>
    `• ${where(l)}: ${l.title}\n  ${STAGE_LABEL[l.stage]}${l.date ? ` · ${l.date}` : ''}\n  ${l.detail}\n  ${l.url}`;
  const text = [
    `${boardName}: what changed this week`,
    '',
    added.length ? `NEW (${added.length})` : '',
    ...added.map(line),
    changed.length ? `\nSTATUS CHANGES (${changed.length})` : '',
    ...changed.map((l) => `${line(l)}\n  was: ${l.prevStatus ?? '?'}`),
    '',
    `Open the board: ${boardUrl}`,
  ]
    .filter((s) => s !== '')
    .join('\n');
  const item = (l: Lead, extra = '') =>
    `<li style="margin:0 0 12px"><b>${esc(where(l))}</b>: <a href="${esc(l.url)}">${esc(l.title)}</a><br>` +
    `<span style="color:#6A5F74">${esc(STAGE_LABEL[l.stage])}${l.date ? ` · ${esc(l.date)}` : ''}</span><br>${esc(l.detail)}${extra}</li>`;
  const html = [
    `<div style="font-family:system-ui,sans-serif;font-size:14px;color:#1F1330;max-width:640px">`,
    `<h2 style="font-size:18px">${esc(boardName)}: what changed this week</h2>`,
    added.length ? `<h3 style="font-size:15px">New (${added.length})</h3><ul style="padding-left:18px">${added.map((l) => item(l)).join('')}</ul>` : '',
    changed.length
      ? `<h3 style="font-size:15px">Status changes (${changed.length})</h3><ul style="padding-left:18px">${changed
          .map((l) => item(l, `<br><span style="color:#9A8FA6">was: ${esc(l.prevStatus ?? '?')}</span>`))
          .join('')}</ul>`
      : '',
    `<p><a href="${esc(boardUrl)}">Open the board</a></p></div>`,
  ].join('');
  return { text, html };
}

export async function sendWatchDigest(opts: {
  state: WatchState;
  cfg: WatchConfig;
  boardName: string;
  boardUrl: string;
}): Promise<{ sent: number; added: number; changed: number; reason?: string }> {
  const { state, cfg } = opts;
  const { added, changed } = newSince(state, state.lastDigestAt);
  const to = digestRecipients(cfg);
  if (!added.length && !changed.length) return { sent: 0, added: 0, changed: 0, reason: 'nothing new' };
  if (!to.length) return { sent: 0, added: added.length, changed: changed.length, reason: `no recipients (${cfg.digestEnv} not set)` };
  if (!emailConfigured()) return { sent: 0, added: added.length, changed: changed.length, reason: 'email not configured' };
  const nearby = new Set(cfg.counties.filter((c) => c.tier === 'nearby').map((c) => c.name));
  const { text, html } = buildDigest(opts.boardName, opts.boardUrl, added, changed, nearby);
  const subject = `${opts.boardName}: ${added.length} new, ${changed.length} changed`;
  let sent = 0;
  for (const addr of to) if (await sendEmail({ to: addr, subject, text, html })) sent++;
  if (sent) await saveWatch({ ...state, lastDigestAt: new Date().toISOString() });
  return { sent, added: added.length, changed: changed.length };
}
