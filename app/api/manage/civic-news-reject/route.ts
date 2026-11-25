/**
 * Permanently reject news items from the dashboard popup — they never surface
 * again for this project. Stores the normalized URLs in a per-campaign rejected
 * set and prunes them from the cached popup payload immediately.
 *
 * Operator-only (under /api/manage/*).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getCache, setCache } from '@/lib/db';
import { canAccessCampaign } from '@/lib/scope';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const host = (u: string) => {
  try { return new URL(u).hostname.replace(/^www\./, '') + new URL(u).pathname.replace(/\/$/, ''); }
  catch { return u; }
};

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid JSON' }, { status: 400 }); }
  const b = (body ?? {}) as { campaignId?: unknown; urls?: unknown };
  const campaignId = typeof b.campaignId === 'string' ? b.campaignId : '';
  const urls = (Array.isArray(b.urls) ? b.urls : []).filter((u): u is string => typeof u === 'string');
  if (!campaignId || urls.length === 0) return NextResponse.json({ error: 'campaignId and urls required' }, { status: 400 });
  if (!(await canAccessCampaign(campaignId))) { return NextResponse.json({ error: 'not found' }, { status: 404 }); }

  const hosts = urls.map(host);
  const rejKey = `civicnews:rejected:${campaignId}`;
  const rejHit = await getCache(rejKey);
  const rejected = new Set(Array.isArray(rejHit?.value) ? (rejHit!.value as string[]) : []);
  for (const h of hosts) rejected.add(h);
  await setCache(rejKey, Array.from(rejected).slice(-500));

  // Prune from the cached popup payload so it disappears on this load too.
  const cacheKey = `civicnews:${campaignId}`;
  const hit = await getCache(cacheKey);
  if (hit && hit.value && typeof hit.value === 'object') {
    const c = hit.value as { checkedAt?: string; newItems?: { url: string }[] };
    if (Array.isArray(c.newItems)) {
      c.newItems = c.newItems.filter((it) => !hosts.includes(host(it.url)));
      await setCache(cacheKey, c);
    }
  }
  return NextResponse.json({ ok: true, rejected: hosts.length });
}
