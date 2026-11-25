/**
 * Research a comparison project on demand (for the precedent panel's
 * "add a project" button). Uses OpenRouter web search to find how the named
 * project reached — or failed to reach — community agreement.
 *
 * Gated by middleware (operator cookie).
 */

import { NextRequest, NextResponse } from 'next/server';
import { completeWithWebSearch } from '@/lib/claude';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function parseObj(raw: string): Record<string, unknown> | null {
  let t = raw.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  // Whole-string parse handles both a single object and an array of objects
  // (the model sometimes returns several mechanisms as an array).
  try {
    const v = JSON.parse(t);
    if (Array.isArray(v)) {
      const first = v.find((x) => x && typeof x === 'object');
      return (first as Record<string, unknown>) ?? null;
    }
    if (v && typeof v === 'object') return v as Record<string, unknown>;
  } catch {
    /* fall through to balanced-brace scan */
  }
  // Extract the FIRST balanced { ... } object (not first-brace..last-brace,
  // which breaks on arrays and dumps raw JSON into the card).
  const start = t.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < t.length; i++) {
    if (t[i] === '{') depth++;
    else if (t[i] === '}') {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(t.slice(start, i + 1)) as Record<string, unknown>;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

/** Last-resort text with any JSON / code fences stripped, so raw braces never
 *  leak into the UI. */
function cleanText(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\{[\s\S]*\}/g, ' ')
    .replace(/\[[\s\S]*\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
  const b = (body ?? {}) as { name?: unknown; jurisdiction?: unknown };
  const name = typeof b.name === 'string' ? b.name.trim() : '';
  const jurisdiction = typeof b.jurisdiction === 'string' ? b.jurisdiction.trim() : '';
  if (!name) {
    return NextResponse.json({ error: 'A project name is required.' }, { status: 400 });
  }

  const prompt = [
    `Research this infrastructure or energy project to help a community-based`,
    `organisation compare how communities and developers reached — or failed to`,
    `reach — agreement.`,
    `Project: ${name}${jurisdiction ? ` (${jurisdiction})` : ''}`,
    ``,
    `Search the web for its current status and, above all, the MECHANISMS that`,
    `moved it toward agreement or became the sticking points — e.g. enforceable`,
    `permit conditions, benefit-sharing / PILOT, setbacks, decommissioning`,
    `bonds, agrivoltaics, or a change of site.`,
    ``,
    `Return ONLY JSON: { "mechanism": a short phrase naming the key mechanism or`,
    `outcome, "detail": 2-3 sentences on what happened and how agreement was (or`,
    `wasn't) reached, grounded in what you actually found }.`,
  ].join('\n');

  try {
    const { text, sources } = await completeWithWebSearch({
      maxTokens: 1200,
      maxResults: 5,
      messages: [{ role: 'user', content: prompt }],
    });
    const obj = parseObj(text);
    const mechanism =
      obj && typeof obj.mechanism === 'string' && obj.mechanism.trim()
        ? obj.mechanism.trim().slice(0, 120)
        : name;
    const detail =
      obj && typeof obj.detail === 'string' && obj.detail.trim()
        ? obj.detail.trim().slice(0, 700)
        : cleanText(text).slice(0, 700);

    return NextResponse.json({
      ok: true,
      precedent: {
        id: `added-${Date.now()}`,
        name,
        jurisdiction,
        mechanism,
        detail,
        sources: sources.slice(0, 4).map((s) => ({ label: s.title ?? s.url, url: s.url })),
      },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
