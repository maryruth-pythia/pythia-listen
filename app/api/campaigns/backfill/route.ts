/**
 * Backfill a Watch from already-ingested data.
 * POST { campaignId } → { ok, scanned, moved }. Operator-gated.
 */

import { NextRequest, NextResponse } from 'next/server';
import { backfillWatch } from '@/lib/ingest/backfill';
import { canAccessCampaign } from '@/lib/scope';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
  const b = (body ?? {}) as { campaignId?: unknown };
  if (typeof b.campaignId !== 'string' || !b.campaignId.trim()) {
    return NextResponse.json({ error: 'campaignId is required' }, { status: 400 });
  }
  if (!(await canAccessCampaign(b.campaignId.trim()))) { return NextResponse.json({ error: 'not found' }, { status: 404 }); }
  try {
    const result = await backfillWatch(b.campaignId.trim());
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
