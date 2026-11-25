/**
 * Weekly early-warning email (Vercel Cron, Mondays). Sends each watch's new and changed
 * items since its last digest to the addresses in its digest env var. Quiet weeks send
 * nothing. GET ?campaign=<id>&preview=1 (signed-in operator) returns the email without sending.
 */
import { NextRequest, NextResponse } from 'next/server';
import { CAMPAIGNS, getCampaignById } from '@/lib/campaigns';
import { loadWatch, newSince } from '@/lib/watch/run';
import { buildDigest, sendWatchDigest } from '@/lib/watch/digest';
import { isCron, watchAuthorized } from '@/lib/watch/guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function boardUrl(req: NextRequest, id: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
  return `${base.replace(/\/$/, '')}/operator/dashboard?campaign=${encodeURIComponent(id)}`;
}

export async function GET(req: NextRequest) {
  const one = req.nextUrl.searchParams.get('campaign') ?? undefined;
  if (!(await watchAuthorized(req, one))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const targets = one ? [await getCampaignById(one)] : CAMPAIGNS.filter((c) => c.watch);

  // Preview: show what the next email would contain, never send.
  if (req.nextUrl.searchParams.get('preview') && !isCron(req)) {
    const c = targets[0];
    if (!c?.watch) return NextResponse.json({ error: 'no watch on this campaign' }, { status: 404 });
    const state = await loadWatch(c.id);
    if (!state) return NextResponse.json({ error: 'watch has not run yet' }, { status: 404 });
    const { added, changed } = newSince(state, state.lastDigestAt);
    const nearby = new Set(c.watch.counties.filter((k) => k.tier === 'nearby').map((k) => k.name));
    const { html } = buildDigest(c.name, boardUrl(req, c.id), added, changed, nearby);
    return new NextResponse(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
  }

  const results = [];
  for (const c of targets) {
    if (!c?.watch) continue;
    const state = await loadWatch(c.id);
    if (!state) {
      results.push({ campaign: c.id, sent: 0, reason: 'watch has not run yet' });
      continue;
    }
    results.push({ campaign: c.id, ...(await sendWatchDigest({ state, cfg: c.watch, boardName: c.name, boardUrl: boardUrl(req, c.id) })) });
  }
  return NextResponse.json({ ok: true, results });
}
