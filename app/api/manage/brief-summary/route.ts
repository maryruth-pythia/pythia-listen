/**
 * Draft the brief's "Summary & context" paragraph from what's actually on the
 * page — the enabled sections' data + the operator's case — so they get a
 * grounded starting draft they can edit. No web search; uses only the provided
 * data (no fabrication). Cached by the exact inputs.
 *
 * Operator-only (under /api/manage/*).
 */
import { NextRequest, NextResponse } from 'next/server';
import { complete } from '@/lib/claude';
import { getCache, setCache } from '@/lib/db';
import { createHash } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const asStr = (v: unknown, m = 200) => (typeof v === 'string' ? v.trim().slice(0, m) : '');

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid JSON' }, { status: 400 }); }
  const b = (body ?? {}) as { campaignName?: unknown; audience?: unknown; caseText?: unknown; sections?: unknown };
  const campaignName = asStr(b.campaignName, 160) || 'this project';
  const audience = b.audience === 'developer' ? 'developer' : 'community';
  const caseText = asStr(b.caseText, 600);
  const sections = Array.isArray(b.sections)
    ? (b.sections as unknown[]).map((x) => {
        const o = (x ?? {}) as Record<string, unknown>;
        return { id: asStr(o.id, 40), label: asStr(o.label, 120), context: o.context };
      }).filter((s) => s.id && s.context)
    : [];
  if (sections.length === 0) return NextResponse.json({ error: 'no section data to summarise yet' }, { status: 400 });

  const key = 'briefsummary:' + createHash('sha1')
    .update(JSON.stringify({ audience, caseText, sections })).digest('hex').slice(0, 24);
  const hit = await getCache(key);
  if (hit && typeof hit.value === 'string') return NextResponse.json({ ok: true, cached: true, summary: hit.value });

  const angle = audience === 'developer'
    ? 'Audience: the developer / a business case — measured and credible.'
    : 'Audience: community advocacy — plain and mobilising, without overstating.';
  const system = [
    'Write the opening "Summary & context" paragraph for a community brief about a specific infrastructure/energy project.',
    '2–4 sentences. Set the scene and state the headline of what the data shows.',
    'Use ONLY the section data provided — never invent facts, numbers, or names.',
    angle,
    caseText ? `Support the operator\'s case without distorting the data: "${caseText}"` : '',
    'Say "community sentiment", not "social licence".',
    'Return ONLY the paragraph text — no heading, no JSON, no quotes around it.',
  ].filter(Boolean).join('\n');
  const user = `Project: ${campaignName}\n\nSECTION DATA:\n${JSON.stringify(sections, null, 1)}`;

  try {
    const text = await complete({ system, messages: [{ role: 'user', content: user }], maxTokens: 500, temperature: 0.4 });
    const summary = text.replace(/^["'\s]+|["'\s]+$/g, '').slice(0, 1200);
    if (summary) await setCache(key, summary);
    return NextResponse.json({ ok: true, cached: false, summary });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
