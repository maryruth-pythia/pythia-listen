import { NextResponse } from 'next/server';
import { CAMPAIGNS, resetBuiltInCampaign } from '@/lib/campaigns';
import { canAccessCampaign } from '@/lib/scope';
import { bustAnalysisCache } from '@/lib/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Operator-only (under /api/manage, gated by middleware). Puts a BUILT-IN board's settings
 * (name, details line, focus, what to ignore, routing...) back to its definition in
 * lib/campaigns.ts by deleting the stored edits. Signals are not touched. Requires access
 * to the board. GET works too, so it can be run by opening the URL once.
 */
async function reset(id: string) {
  if (!CAMPAIGNS.some((c) => c.id === id)) {
    return NextResponse.json({ ok: false, error: 'Only built-in boards can be reset this way.' }, { status: 400 });
  }
  if (!(await canAccessCampaign(id))) {
    return NextResponse.json(
      { ok: false, error: 'You don’t have access to that board. Switch to its organization first (account menu, top right).' },
      { status: 403 }
    );
  }
  const changed = await resetBuiltInCampaign(id);
  await bustAnalysisCache(id);
  return NextResponse.json({
    ok: true,
    board: id,
    result: changed ? 'Stored edits removed; the board is back to its original settings.' : 'Nothing to reset: the board already had its original settings.',
  });
}

export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  return reset((await props.params).id);
}
export async function POST(_req: Request, props: { params: Promise<{ id: string }> }) {
  return reset((await props.params).id);
}
