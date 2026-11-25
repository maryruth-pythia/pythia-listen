/**
 * Keeps the signal lens sorting until a dashboard is fully sorted, without
 * anyone reloading. A sorting run that runs out of time calls this route on
 * the same app; it starts the next run (after responding) and that run calls
 * here again if there's still more to do. See "Hand-off" in lib/analysis/lens.ts.
 *
 * Gated like every other app route: middleware requires the operator login
 * cookie, which the previous run forwards. Responds immediately; the work
 * happens after the response.
 */
import { NextRequest, NextResponse } from 'next/server';
import { loadLensedSignals } from '@/lib/dashboard/signals';
import { getCampaignById } from '@/lib/campaigns';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const campaignId = req.nextUrl.searchParams.get('campaign') ?? '';
  const hop = Math.max(0, Math.min(1000, Number(req.nextUrl.searchParams.get('hop') ?? 0) || 0));
  if (!campaignId || !(await getCampaignById(campaignId))) {
    return NextResponse.json({ ok: false, error: 'unknown campaign' }, { status: 400 });
  }
  try {
    const lensed = await loadLensedSignals(campaignId, { mode: 'background', trigger: `auto-continue #${hop}`, hop });
    return NextResponse.json({ ok: true, campaignId, hop, pending: lensed.lens?.pending ?? null, building: lensed.lens?.building ?? false });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
