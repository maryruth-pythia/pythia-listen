/**
 * Add specific news items (surfaced by the dashboard popup) into the civic
 * record. Unlike a generic civic refresh, this ingests EXACTLY the items the
 * operator saw and approved, so they reliably enter the record and the popup
 * stops re-surfacing them. One cheap LLM pass classifies stance + themes.
 *
 * After adding, it busts the analysis cache (so sections recompute) AND marks
 * the civic-news cache handled (empty), so a reload shows no stale popup and
 * costs no new search.
 *
 * Operator-only (under /api/manage/*).
 */
import { NextRequest, NextResponse } from 'next/server';
import { complete } from '@/lib/claude';
import { upsertSignal, setCache } from '@/lib/db';
import { bustAnalysisCache } from '@/lib/cache';
import type { Signal, SignalStance } from '@/lib/types';
import { createHash } from 'crypto';
import { canAccessCampaign } from '@/lib/scope';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const STANCES: SignalStance[] = ['opposition', 'concern', 'mixed', 'support', 'neutral'];
const asStr = (v: unknown, m = 400) => (typeof v === 'string' ? v.trim().slice(0, m) : '');

function isoFrom(date: string): string | undefined {
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return `${date}T12:00:00.000Z`;
  if (/^\d{4}-\d{2}$/.test(date)) return `${date}-01T12:00:00.000Z`;
  if (/^\d{4}$/.test(date)) return `${date}-01-01T12:00:00.000Z`;
  return undefined;
}

function parseArr(raw: string): unknown[] {
  let t = raw.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const a = t.indexOf('['), b = t.lastIndexOf(']');
  if (a !== -1 && b > a) { try { const v = JSON.parse(t.slice(a, b + 1)); if (Array.isArray(v)) return v; } catch { /* noop */ } }
  return [];
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid JSON' }, { status: 400 }); }
  const b = (body ?? {}) as { campaignId?: unknown; items?: unknown };
  const campaignId = typeof b.campaignId === 'string' ? b.campaignId : '';
  if (!campaignId) return NextResponse.json({ error: 'campaignId required' }, { status: 400 });
  if (!(await canAccessCampaign(campaignId))) { return NextResponse.json({ error: 'not found' }, { status: 404 }); }
  const items = (Array.isArray(b.items) ? b.items : [])
    .map((x) => {
      const o = (x ?? {}) as Record<string, unknown>;
      return { title: asStr(o.title, 200), url: asStr(o.url, 500), date: asStr(o.date, 40), summary: asStr(o.summary, 400) };
    })
    .filter((it) => it.title && it.url)
    .slice(0, 8);
  if (items.length === 0) return NextResponse.json({ error: 'no items' }, { status: 400 });

  // One classification pass for stance + themes.
  let classes: { stance: SignalStance; themes: string[] }[] = [];
  try {
    const prompt =
      `Classify each news item's stance toward the project and its key themes.\n` +
      `Items:\n${items.map((it, i) => `${i + 1}. ${it.title} — ${it.summary}`).join('\n')}\n\n` +
      `Return ONLY a JSON array, one object per item in order:\n` +
      `[{ "stance": "opposition"|"concern"|"mixed"|"support"|"neutral", "themes": ["short theme", ...] }]`;
    const text = await complete({ messages: [{ role: 'user', content: prompt }], maxTokens: 700, temperature: 0.2 });
    classes = parseArr(text).map((x) => {
      const o = (x ?? {}) as Record<string, unknown>;
      const stance = STANCES.includes(o.stance as SignalStance) ? (o.stance as SignalStance) : 'neutral';
      const themes = (Array.isArray(o.themes) ? o.themes : []).map((t) => asStr(t, 60)).filter(Boolean).slice(0, 4);
      return { stance, themes };
    });
  } catch { classes = []; }

  const now = new Date().toISOString();
  let added = 0;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const cls = classes[i] ?? { stance: 'neutral' as SignalStance, themes: [] };
    const hash = createHash('sha1').update(it.url).digest('hex').slice(0, 12);
    const when = (it.date && isoFrom(it.date)) || now;
    const signal: Signal = {
      id: `civic-news-${hash}`,
      campaignId,
      source: 'civic',
      sourceType: 'news',
      title: it.title,
      summary: it.summary || it.title,
      stance: cls.stance,
      themes: cls.themes,
      citations: [{ url: it.url, title: it.title, publishedAt: isoFrom(it.date) }],
      salience: 55,
      confidence: 0.8,
      observedAt: when,
      ingestedAt: now,
      dedupeKey: `civic-news:${hash}`,
      origin: 'web_search',
    };
    try { await upsertSignal(signal); added++; } catch { /* skip */ }
  }

  await bustAnalysisCache(campaignId);
  // Mark the popup handled so a reload doesn't re-surface these (and no re-search).
  await setCache(`civicnews:${campaignId}`, { checkedAt: now, newItems: [] });

  return NextResponse.json({ ok: true, added });
}
