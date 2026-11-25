/**
 * Run a campaign's watch: check every source, merge with what we saw before (so first-seen
 * dates and status changes are kept), and store the result. Stored under `watch:<campaignId>`
 * in the cache table (outside the `analysis:` prefix, so busting analyses never wipes it).
 */
import { getCache, setCache } from '@/lib/db';
import type { WatchConfig } from './config';
import type { Lead, SourceCheck, WatchState } from './types';
import { collectPjm } from './collectors/pjm';
import { collectDeq } from './collectors/deq';
import { collectTownhall } from './collectors/townhall';
import { collectAgendas } from './collectors/agendas';
import { linkLeads } from './link';

const key = (campaignId: string) => `watch:${campaignId}`;
/** v2 (2026-11-18): PDF reader fixed for Vercel; v1 may have "read" documents as empty. */
const READER_VERSION = 2;

export async function loadWatch(campaignId: string): Promise<WatchState | null> {
  const row = await getCache(key(campaignId)).catch(() => null);
  return row ? (row.value as WatchState) : null;
}

export async function saveWatch(state: WatchState): Promise<void> {
  await setCache(key(state.campaignId), state);
}

export async function runWatch(campaignId: string, cfg: WatchConfig): Promise<WatchState> {
  const prev = await loadWatch(campaignId);
  const now = new Date().toISOString();
  const first = !prev || prev.runs === 0;
  const scanned = prev?.readerVersion === READER_VERSION ? { ...(prev?.scanned ?? {}) } : {};

  const [pjm, deq, th, ag] = await Promise.all([
    collectPjm(cfg),
    collectDeq(cfg),
    collectTownhall(cfg),
    collectAgendas(cfg, scanned),
  ]);
  for (const u of ag.scannedNow) scanned[u] = now;

  const checks: SourceCheck[] = [pjm.check, deq.check, th.check, ...ag.checks].map((c) => ({ ...c, checkedAt: now }));
  // A source that failed this run keeps its previous leads (one bad night shouldn't erase them).
  const failed = new Set(checks.filter((c) => !c.ok && c.url).map((c) => c.source));
  const fresh = [...pjm.leads, ...deq.leads, ...th.leads, ...ag.leads];

  const before = new Map((prev?.leads ?? []).map((l) => [l.id, l]));
  const merged = new Map<string, Lead>();
  for (const f of fresh) {
    const old = before.get(f.id);
    const statusChanged = old && old.status && f.status && old.status !== f.status;
    merged.set(f.id, {
      ...f,
      firstSeen: old?.firstSeen ?? now,
      lastSeen: now,
      baseline: old ? old.baseline : first,
      ...(statusChanged
        ? { changedAt: now, prevStatus: old!.status }
        : old?.changedAt
          ? { changedAt: old.changedAt, prevStatus: old.prevStatus }
          : {}),
    });
  }
  for (const old of prev?.leads ?? []) {
    if (merged.has(old.id)) continue;
    // Agenda hits are documents we read once: keep them. Others: keep only if their source failed.
    if (old.source === 'agenda' || failed.has(old.source)) merged.set(old.id, old);
  }

  const state: WatchState = {
    campaignId,
    leads: linkLeads([...merged.values()], cfg.counties.map((c) => c.name)),
    checks,
    scanned,
    runs: (prev?.runs ?? 0) + 1,
    readerVersion: READER_VERSION,
    updatedAt: now,
    lastDigestAt: prev?.lastDigestAt,
    follows: prev?.follows,
  };
  await saveWatch(state);
  return state;
}

/** Leads that are new (or changed) since a date, excluding the first-run baseline. */
export function newSince(state: WatchState, sinceIso: string | undefined): { added: Lead[]; changed: Lead[] } {
  const since = sinceIso ? Date.parse(sinceIso) : 0;
  const added = state.leads.filter((l) => !l.baseline && Date.parse(l.firstSeen) > since);
  const changed = state.leads.filter(
    (l) => l.changedAt && Date.parse(l.changedAt) > since && !added.includes(l)
  );
  return { added, changed };
}
