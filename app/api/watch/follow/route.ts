/**
 * POST { campaignId, leadId } → { boardId, url, created }. Turns one pipeline item from a watch
 * board into its own public-record board (lib/watch/follow.ts). Operator-only: this path is
 * behind the site gate in middleware, and access to the watch board is checked here too.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getCampaignById } from '@/lib/campaigns';
import { actingOrgId, canAccessCampaign } from '@/lib/scope';
import { followLead } from '@/lib/watch/follow';
import { bustAnalysisCache } from '@/lib/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as { campaignId?: unknown; leadId?: unknown };
  const campaignId = typeof b.campaignId === 'string' ? b.campaignId : '';
  const leadId = typeof b.leadId === 'string' ? b.leadId : '';
  if (!campaignId || !leadId) return NextResponse.json({ error: 'campaignId and leadId are required' }, { status: 400 });
  if (!(await canAccessCampaign(campaignId))) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const board = await getCampaignById(campaignId);
  if (!board?.watch) return NextResponse.json({ error: 'this board has no watch' }, { status: 400 });
  try {
    const r = await followLead({ watchBoard: board, cfg: board.watch, leadId, orgId: await actingOrgId() });
    if (r.created) await bustAnalysisCache(r.boardId);
    return NextResponse.json({ ...r, url: `/operator/dashboard?campaign=${encodeURIComponent(r.boardId)}` });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}
