/**
 * Signal Scout check-in. POST { campaignId? } → { report }. Gated by cookie.
 */

import { NextRequest, NextResponse } from 'next/server';
import { runSignalScout } from '@/lib/agents/signal-scout';
import { canAccessCampaign } from '@/lib/scope';
import { FRASIER_CAMPAIGN_ID } from '@/lib/ingest/seed-frasier';
import { cached, ANALYSIS_TTL_MS } from '@/lib/cache';
import { setCache, getCache, clearCache } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    /* body optional */
  }
  const b = (body ?? {}) as { campaignId?: unknown; force?: unknown; note?: unknown; aligns?: unknown };
  const campaignId =
    typeof b.campaignId === 'string' && b.campaignId
      ? b.campaignId
      : FRASIER_CAMPAIGN_ID;

  if (!(await canAccessCampaign(campaignId))) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  const force = b.force === true;
  const key = `analysis:${campaignId}:scout`;

  // Operator gut-check submission (Yes/No + optional note). Persist it to the
  // campaign's ground-truth log and clear the cached report so the note informs
  // the next check-in. This is a write, not a recompute.
  const isFeedback =
    typeof b.note === 'string' || b.aligns === 'match' || b.aligns === 'off';
  if (isFeedback) {
    try {
      const fkey = `scout:feedback:${campaignId}`;
      const prev = ((await getCache(fkey)) as Array<Record<string, unknown>> | null) ?? [];
      const entry = {
        at: new Date().toISOString(),
        aligns: b.aligns === 'match' || b.aligns === 'off' ? b.aligns : null,
        note: typeof b.note === 'string' ? b.note.slice(0, 1000) : '',
      };
      const next = [...prev, entry].slice(-20);
      await setCache(fkey, next);
      await clearCache(key);
      return NextResponse.json({ ok: true, stored: next.length });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: `scout feedback error: ${message}` }, { status: 500 });
    }
  }

  try {
    // On explicit "Re-run", recompute and overwrite the cache; otherwise reuse
    // a recent report so a normal page load doesn't spend a Claude call.
    const report = force
      ? await runSignalScout(campaignId).then(async (r) => {
          try { await setCache(key, r); } catch { /* non-fatal */ }
          return r;
        })
      : await cached(key, ANALYSIS_TTL_MS, () => runSignalScout(campaignId), (r) => typeof r === 'string' && r.length > 0);
    return NextResponse.json({ report });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `scout error: ${message}` }, { status: 500 });
  }
}
