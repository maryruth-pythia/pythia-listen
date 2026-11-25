/**
 * Early-warning watch: check PJM, DEQ, Town Hall and county agendas for every campaign with
 * a `watch` config (or one campaign with ?campaign=<id> / {campaignId}).
 * - GET from Vercel Cron (daily, bearer secret).
 * - POST from the dashboard's "Check now" button (signed-in operator).
 */
import { NextRequest, NextResponse } from 'next/server';
import { CAMPAIGNS, getCampaignById } from '@/lib/campaigns';
import { runWatch } from '@/lib/watch/run';
import { watchAccess } from '@/lib/watch/guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

async function handle(req: NextRequest, campaignId?: string) {
  const access = await watchAccess(req, campaignId);
  if (!access.ok) {
    return NextResponse.json({ error: access.reason ?? 'unauthorized' }, { status: access.status ?? 401 });
  }
  const targets = campaignId
    ? [await getCampaignById(campaignId)].filter((c) => c?.watch)
    : CAMPAIGNS.filter((c) => c.watch);
  const results = [];
  for (const c of targets) {
    if (!c?.watch) continue;
    const s = await runWatch(c.id, c.watch);
    results.push({
      campaign: c.id,
      leads: s.leads.length,
      checks: s.checks.map((k) => ({ source: k.label, county: k.county, ok: k.ok, items: k.items, note: k.note })),
    });
  }
  return NextResponse.json({ ok: true, results });
}

export async function GET(req: NextRequest) {
  return handle(req, req.nextUrl.searchParams.get('campaign') ?? undefined);
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { campaignId?: string };
  return handle(req, typeof body.campaignId === 'string' ? body.campaignId : undefined);
}
