/**
 * Report narrative writer. Turns the brief's structured section data into
 * report-style prose: for each section, a 1-2 sentence synthesis lead, a short
 * narrative summarising the data, and optional bullets. Tuned by audience and
 * the operator's case — but never fabricated (it only uses the data the client
 * passes in; no web search).
 *
 * On-demand + cached by the exact inputs, so re-opening the same brief is free.
 * Operator-only (under /api/manage/*).
 */
import { NextRequest, NextResponse } from 'next/server';
import { complete } from '@/lib/claude';
import { getCache, setCache } from '@/lib/db';
import { createHash } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export interface SectionNarrative {
  synthesis: string;
  paragraphs: string[];
  bullets: string[];
}

function parseObj(raw: string): Record<string, unknown> | null {
  let t = raw.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  try { const v = JSON.parse(t); if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>; } catch { /* scan */ }
  const start = t.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < t.length; i++) {
    if (t[i] === '{') depth++;
    else if (t[i] === '}') { depth--; if (depth === 0) { try { return JSON.parse(t.slice(start, i + 1)); } catch { return null; } } }
  }
  return null;
}
const asStr = (v: unknown, max = 600) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const asStrArr = (v: unknown, n: number, max: number) =>
  (Array.isArray(v) ? v : []).map((x) => asStr(x, max)).filter(Boolean).slice(0, n);

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid JSON' }, { status: 400 }); }
  const b = (body ?? {}) as {
    audience?: unknown; caseText?: unknown; campaignName?: unknown; density?: unknown;
    sections?: unknown;
  };
  const audience = b.audience === 'developer' ? 'developer' : 'community';
  const caseText = typeof b.caseText === 'string' ? b.caseText.trim().slice(0, 600) : '';
  const campaignName = typeof b.campaignName === 'string' ? b.campaignName.slice(0, 160) : 'this project';
  const density = b.density === 'skimmable' || b.density === 'detailed' ? b.density : 'balanced';
  const sections = Array.isArray(b.sections)
    ? (b.sections as unknown[]).map((x) => {
        const o = (x ?? {}) as Record<string, unknown>;
        return { id: asStr(o.id, 40), label: asStr(o.label, 120), context: o.context };
      }).filter((s) => s.id)
    : [];
  if (sections.length === 0) return NextResponse.json({ error: 'no sections' }, { status: 400 });

  const key = 'reportnarr:' + createHash('sha1')
    .update(JSON.stringify({ audience, caseText, density, sections }))
    .digest('hex').slice(0, 24);
  const hit = await getCache(key);
  if (hit && hit.value) return NextResponse.json({ ok: true, cached: true, narrative: hit.value });

  const lengthHint =
    density === 'skimmable' ? 'Keep each section to ONE tight paragraph.' :
    density === 'detailed' ? 'Up to three paragraphs per section where the data supports it.' :
    'One or two short paragraphs per section.';
  const angle = audience === 'developer'
    ? 'Audience: the DEVELOPER / a business case. Frame findings as the risks, the durable-agreement opportunities, and what listening buys them — measured and credible, not adversarial.'
    : 'Audience: COMMUNITY advocacy. Frame findings to help residents and their allies make the case — clear, plain, and mobilising, without overstating.';

  const system = [
    'You write the narrative body of a community "signal" brief for a specific infrastructure/energy project.',
    'You are given, per section, the section\'s STRUCTURED DATA. Write prose that summarises ONLY that data.',
    'HARD RULE: never invent facts, numbers, names, or events. If the data is thin, say less. No greenwashing, no spin beyond honest framing.',
    'TERMINOLOGY: say "community sentiment" (or just "sentiment"), NOT "social licence". If you must use the term social licence, put it in parentheses as a gloss, e.g. "community sentiment (its social licence)".',
    angle,
    caseText ? `The organiser\'s case (position the framing to support it, without distorting the data): "${caseText}"` : '',
    lengthHint,
    'For EACH section id you are given, return:',
    '- "synthesis": a 1-2 sentence lead that states what this section shows.',
    '- "paragraphs": array of short narrative paragraphs summarising the data.',
    '- "bullets": array (0-6) of short bullet items lifted from the data (e.g. the actual agreement/tension items, the camps, the questions). Use bullets when the data is itemised.',
    'Return ONLY JSON, keyed by section id:',
    '{ "<id>": { "synthesis": "...", "paragraphs": ["..."], "bullets": ["..."] }, ... }',
  ].filter(Boolean).join('\n');

  const user = `Project: ${campaignName}\n\nSECTIONS:\n${JSON.stringify(sections, null, 1)}`;

  try {
    const text = await complete({
      system,
      messages: [{ role: 'user', content: user }],
      maxTokens: 2600,
      temperature: 0.4,
    });
    const obj = parseObj(text) ?? {};
    const narrative: Record<string, SectionNarrative> = {};
    for (const sec of sections) {
      const o = (obj[sec.id] ?? {}) as Record<string, unknown>;
      const synthesis = asStr(o.synthesis, 400);
      const paragraphs = asStrArr(o.paragraphs, 3, 900);
      const bullets = asStrArr(o.bullets, 6, 240);
      if (synthesis || paragraphs.length || bullets.length) {
        narrative[sec.id] = { synthesis, paragraphs, bullets };
      }
    }
    if (Object.keys(narrative).length > 0) await setCache(key, narrative);
    return NextResponse.json({ ok: true, cached: false, narrative });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
