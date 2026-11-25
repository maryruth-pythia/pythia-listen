/**
 * Source-weighting API. Operator-gated by the site password wall (like
 * /api/campaigns — not allow-listed in middleware).
 * GET  → { default, channels: [{channel, weight}] } — every channel seen in the
 *        data plus any that already have an override, with effective weights.
 * POST → { weights: {channel: number} } — persist operator overrides.
 */
import { NextRequest, NextResponse } from 'next/server';
import { listSignals, setCache } from '@/lib/db';
import {
  getEffectiveChannelWeights,
  DEFAULT_CHANNEL_WEIGHT,
  CHANNEL_WEIGHTS_KEY,
} from '@/lib/ingest/channels';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const weights = await getEffectiveChannelWeights();
  const channels = new Set<string>(Object.keys(weights));
  const signals = await listSignals();
  for (const s of signals) {
    const st = s.sourceType || '';
    if (st.startsWith('channel_')) {
      const name = st.slice('channel_'.length).toLowerCase();
      if (name && name !== 'unknown') channels.add(name);
    }
  }
  const rows = [...channels]
    .sort()
    .map((channel) => ({
      channel,
      weight: weights[channel] ?? DEFAULT_CHANNEL_WEIGHT,
    }));
  return NextResponse.json(
    { default: DEFAULT_CHANNEL_WEIGHT, channels: rows },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
  const w = (body as { weights?: unknown })?.weights;
  if (!w || typeof w !== 'object') {
    return NextResponse.json({ error: 'weights object required' }, { status: 400 });
  }
  const clean: Record<string, number> = {};
  for (const [k, v] of Object.entries(w as Record<string, unknown>)) {
    const n = Number(v);
    if (k && Number.isFinite(n)) {
      clean[k.toLowerCase()] = Math.max(0, Math.min(100, Math.round(n)));
    }
  }
  await setCache(CHANNEL_WEIGHTS_KEY, clean);
  return NextResponse.json({ ok: true, weights: clean });
}
