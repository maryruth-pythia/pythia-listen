/**
 * Seed the combined Hawaiʻi community-priorities board (hi-community-resilience):
 * every HSEO 2022 statewide signal + the Vibrant Hawaiʻi 2026 Puna and Kaʻū signals
 * (lib/ingest/seed-vibrant.ts). Operator-only (under /api/manage/*), idempotent, and it
 * prunes seeded signals on this board that are no longer in the dataset.
 */
import { NextResponse } from 'next/server';
import { ensureSeed, seedSignalId } from '@/lib/ingest/civic';
import { bustAnalysisCache } from '@/lib/cache';
import { listSignals, deleteSignalsByIds } from '@/lib/db';
import { hiCommunitySeedGroups, HI_COMMUNITY_CAMPAIGN_ID } from '@/lib/ingest/seed-vibrant';
const PR_CAMPAIGN_IDS = [HI_COMMUNITY_CAMPAIGN_ID] as const;
import { loadLensedSignals } from '@/lib/dashboard/signals';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const CHUNK = 25;

async function seed() {
  const groups = hiCommunitySeedGroups();

  // 1) Prune stale seeded signals (only on the public-record boards).
  const expected = new Map<string, Set<string>>();
  for (const g of groups) {
    const set = expected.get(g.campaignId) ?? new Set<string>();
    for (const s of g.signals) set.add(seedSignalId(s, g.campaignId, g.source));
    expected.set(g.campaignId, set);
  }
  const pruned: Record<string, number> = {};
  for (const id of PR_CAMPAIGN_IDS) {
    const keep = expected.get(id) ?? new Set<string>();
    const existing = await listSignals(id);
    const stale = existing.filter((s) => s.origin === 'seed' && !keep.has(s.id)).map((s) => s.id);
    pruned[id] = await deleteSignalsByIds(stale);
  }

  // 2) Insert anything missing, in parallel chunks (ids are deterministic).
  const tasks: Array<{ campaignId: string; source: Parameters<typeof ensureSeed>[2]; signals: Parameters<typeof ensureSeed>[1] }> = [];
  for (const g of groups) {
    for (let i = 0; i < g.signals.length; i += CHUNK) {
      tasks.push({ campaignId: g.campaignId, source: g.source, signals: g.signals.slice(i, i + CHUNK) });
    }
  }
  const counts = await Promise.all(tasks.map((t) => ensureSeed(t.campaignId, t.signals, t.source)));
  const inserted: Record<string, number> = {};
  tasks.forEach((t, i) => {
    inserted[t.campaignId] = (inserted[t.campaignId] ?? 0) + counts[i];
  });

  // 3) Fresh analyses on any board that changed, and start sorting the new
  //    signals right away (it runs in the background and keeps going on its
  //    own until done — no need to open each dashboard).
  for (const id of PR_CAMPAIGN_IDS) {
    if ((inserted[id] ?? 0) + (pruned[id] ?? 0) > 0) {
      await bustAnalysisCache(id);
      await loadLensedSignals(id, { trigger: 'new data' }).catch(() => null);
    }
  }
  return NextResponse.json({ ok: true, inserted, pruned });
}

export async function GET() {
  try {
    return await seed();
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export const POST = GET;
