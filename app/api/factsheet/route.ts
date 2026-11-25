/**
 * Campaign fact-sheet overrides.
 *
 * Lets an operator "shape what the fact sheet says" on the Campaign facts page.
 * Overrides are stored in the app KV (keyed factsheet:<campaignId>, kept OUT of
 * the analysis: namespace so ingestion never clears them) and merged over the
 * built-in ProjectCard when the reference page renders.
 *
 * Gated by middleware (operator cookie).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCache, setCache, clearCache } from '@/lib/db';
import { isKnownCampaign } from '@/lib/campaigns';
import { canAccessCampaign } from '@/lib/scope';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const key = (id: string) => `factsheet:${id}`;

const STR_FIELDS = ['name', 'oneLine', 'whatItIs', 'where', 'size', 'developer', 'process', 'status'];
const ARR_FIELDS = ['benefits', 'commitments'];

export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('campaignId') ?? '';
  if (!id) return NextResponse.json({ error: 'campaignId required' }, { status: 400 });
  if (!(await canAccessCampaign(id))) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  try {
    const hit = await getCache(key(id));
    return NextResponse.json({ card: hit?.value ?? null });
  } catch {
    return NextResponse.json({ card: null });
  }
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
  const b = (body ?? {}) as { campaignId?: unknown; card?: unknown; reset?: unknown };
  const id = typeof b.campaignId === 'string' ? b.campaignId : '';
  if (!id || !isKnownCampaign(id)) {
    return NextResponse.json({ error: 'unknown campaign' }, { status: 400 });
  }

  // Reset to the built-in fact sheet.
  if (b.reset === true) {
    try {
      await clearCache(key(id));
    } catch {
      /* non-fatal */
    }
    return NextResponse.json({ ok: true, reset: true });
  }

  if (!b.card || typeof b.card !== 'object') {
    return NextResponse.json({ error: 'card required' }, { status: 400 });
  }
  const c = b.card as Record<string, unknown>;
  const clean: Record<string, unknown> = {};
  for (const k of STR_FIELDS) {
    if (typeof c[k] === 'string') clean[k] = (c[k] as string).slice(0, 2000);
  }
  for (const k of ARR_FIELDS) {
    if (Array.isArray(c[k])) {
      clean[k] = (c[k] as unknown[])
        .filter((x) => typeof x === 'string' && (x as string).trim())
        .map((x) => (x as string).slice(0, 300))
        .slice(0, 12);
    }
  }

  try {
    await setCache(key(id), clean);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
