/**
 * Red-team audit. POST { campaignId } → adversarial verdicts on the dashboard's
 * AI claims. Operator-gated by the site password wall. Runs on demand (expensive).
 */
import { NextRequest, NextResponse } from 'next/server';
import { computeRedTeam } from '@/lib/analysis/redteam';
import { canAccessCampaign } from '@/lib/scope';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
  const campaignId = (body as { campaignId?: string })?.campaignId;
  if (!campaignId) {
    return NextResponse.json({ error: 'campaignId required' }, { status: 400 });
  }
  if (!(await canAccessCampaign(campaignId))) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  try {
    const result = await computeRedTeam(campaignId);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `red-team failed: ${message}` }, { status: 500 });
  }
}
