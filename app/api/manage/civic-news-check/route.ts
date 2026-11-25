/**
 * Dashboard "what's new in the civic record" check.
 *
 * On dashboard load the client calls this. It does a LIGHT web search for
 * recent news about the project, drops anything already in the civic record,
 * and returns the genuinely-new items for a popup. It does NOT write anything —
 * adding to the record is a separate, explicit operator action (the popup's
 * "Add to civic record" button triggers the real civic ingestion).
 *
 * Cost-aware: the result is cached for 6h, so reloading the dashboard shows the
 * popup instantly without paying for a fresh search every time. `refresh=1`
 * forces a new search.
 *
 * Operator-only (under /api/manage/*).
 */
import { NextRequest, NextResponse } from 'next/server';
import { completeWithWebSearch } from '@/lib/claude';
import { getCache, setCache, listSignals } from '@/lib/db';
import { getProjectCard } from '@/lib/reference/content';
import { getCampaignById } from '@/lib/campaigns';
import { canAccessCampaign } from '@/lib/scope';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const TTL_MS = 1000 * 60 * 60 * 24; // 24h

export interface CivicNewsItem {
  title: string;
  url: string;
  date?: string;
  summary: string;
}
interface Cached {
  checkedAt: string;
  newItems: CivicNewsItem[];
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 80);
const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, '') + new URL(u).pathname.replace(/\/$/, ''); } catch { return u; } };

function parseArr(raw: string): unknown[] {
  let t = raw.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  try { const v = JSON.parse(t); if (Array.isArray(v)) return v; if (v && typeof v === 'object') return [v]; } catch { /* scan */ }
  const start = t.indexOf('[');
  const end = t.lastIndexOf(']');
  if (start !== -1 && end > start) { try { const v = JSON.parse(t.slice(start, end + 1)); if (Array.isArray(v)) return v; } catch { /* noop */ } }
  return [];
}
const asStr = (v: unknown, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export async function GET(req: NextRequest) {
  const campaignId = req.nextUrl.searchParams.get('campaignId') || '';
  const refresh = req.nextUrl.searchParams.get('refresh') === '1';
  if (!campaignId) return NextResponse.json({ error: 'campaignId required' }, { status: 400 });
  if (!(await canAccessCampaign(campaignId))) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const cacheKey = `civicnews:${campaignId}`;
  if (!refresh) {
    const hit = await getCache(cacheKey);
    if (hit && hit.value && Date.now() - new Date(hit.updatedAt).getTime() < TTL_MS) {
      const c = hit.value as Cached;
      return NextResponse.json({ ok: true, cached: true, checkedAt: c.checkedAt, newItems: c.newItems });
    }
  }

  const card = getProjectCard(campaignId);
  const campaign = await getCampaignById(campaignId);
  const name = card?.name || campaign?.name || campaignId;
  const where = card?.where || '';

  // What's already in the civic record — dedup targets.
  let known = new Set<string>();
  try {
    const civic = (await listSignals(campaignId)).filter((s) => s.source === 'civic');
    for (const s of civic) {
      known.add(norm(s.title));
      for (const c of s.citations ?? []) if (c.url) known.add(host(c.url));
    }
  } catch { known = new Set(); }

  const prompt = [
    `Search the web for VERY RECENT news (strictly the last 10 days) about this project:`,
    `Project: ${name}${where ? ` — ${where}` : ''}.`,
    `Focus on developments a community organiser would want in the civic record:`,
    `hearings, permit or docket actions, council/board votes, lawsuits or appeals,`,
    `ordinances, official statements, substantive local news coverage.`,
    `Return ONLY a JSON array (max 6), newest first:`,
    `[{ "title": "headline", "url": "source url", "date": "YYYY-MM-DD if and only if the source clearly shows a real publication date", "summary": "one sentence on what happened" }]`,
    `Only include items you actually found with a real URL. Include "date" ONLY when the source plainly shows a publication date — otherwise OMIT the date field entirely. NEVER guess, infer, or approximate a date. If nothing recent, return [].`,
  ].join('\n');

  try {
    const { text, sources } = await completeWithWebSearch({
      maxTokens: 1200,
      maxResults: 6,
      messages: [{ role: 'user', content: prompt }],
    });
    const rows = parseArr(text);
    const fallbackUrls = sources.map((s) => s.url);
    const items: CivicNewsItem[] = [];
    for (const r of rows) {
      const o = (r ?? {}) as Record<string, unknown>;
      const title = asStr(o.title, 180);
      let url = asStr(o.url, 400);
      if (!url && fallbackUrls.length) url = fallbackUrls.shift() as string;
      if (!title || !url) continue;
      if (known.has(norm(title)) || known.has(host(url))) continue; // already in record
      items.push({ title, url, date: asStr(o.date, 40) || undefined, summary: asStr(o.summary, 300) });
    }
    // "New" and "not rejected": drop anything already surfaced before (seen) or
    // permanently rejected by the operator, so the same items stop reappearing.
    const seenHit = await getCache(`civicnews:seen:${campaignId}`);
    const rejHit = await getCache(`civicnews:rejected:${campaignId}`);
    const seen = new Set(Array.isArray(seenHit?.value) ? (seenHit!.value as string[]) : []);
    const rejected = new Set(Array.isArray(rejHit?.value) ? (rejHit!.value as string[]) : []);
    const fresh = items.filter((it) => {
      const h = host(it.url);
      return !seen.has(h) && !rejected.has(h);
    });
    const newItems = fresh.slice(0, 6);
    // Remember what we're surfacing so it shows once, not on every load.
    for (const it of newItems) seen.add(host(it.url));
    await setCache(`civicnews:seen:${campaignId}`, Array.from(seen).slice(-300));
    const payload: Cached = { checkedAt: new Date().toISOString(), newItems };
    await setCache(cacheKey, payload);
    return NextResponse.json({ ok: true, cached: false, ...payload });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
