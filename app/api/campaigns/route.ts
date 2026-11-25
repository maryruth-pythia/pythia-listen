/**
 * Watches API. GET → all Watches (built-in + user-created). POST → create one.
 * Operator-gated by the site password wall (not allow-listed in middleware).
 */

import { NextRequest, NextResponse } from 'next/server';
import { saveCampaign, type WatchInput } from '@/lib/campaigns';
import { getScopedCampaigns, actingOrgId, canAccessCampaign } from '@/lib/scope';
import { getAllCampaigns } from '@/lib/campaigns';
import { bustAnalysisCache } from '@/lib/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const campaigns = await getScopedCampaigns();
  return NextResponse.json(
    { campaigns },
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
  const b = (body ?? {}) as Partial<WatchInput>;
  if (!b.name || typeof b.name !== 'string' || !b.name.trim()) {
    return NextResponse.json({ error: 'a name is required' }, { status: 400 });
  }
  if (!b.routing || typeof b.routing !== 'string' || !b.routing.trim()) {
    return NextResponse.json(
      { error: 'a short description of what belongs in this Watch is required' },
      { status: 400 }
    );
  }
  // Editing an existing board (id given) requires access to it; otherwise anyone signed in
  // could overwrite another org's board settings by id.
  const editId = typeof b.id === 'string' ? b.id.trim() : '';
  if (editId && (await getAllCampaigns()).some((c) => c.id === editId) && !(await canAccessCampaign(editId))) {
    return NextResponse.json({ error: 'You don’t have access to that project.' }, { status: 403 });
  }
  const kind = b.kind === 'site' ? 'site' : 'general';
  try {
    const created = await saveCampaign({
      id: typeof b.id === 'string' && b.id.trim() ? b.id.trim() : undefined,
      orgId: await actingOrgId(),
      name: b.name,
      kind,
      badge: typeof b.badge === 'string' ? b.badge : undefined,
      meta: typeof b.meta === 'string' ? b.meta : undefined,
      blurb: typeof b.blurb === 'string' ? b.blurb : undefined,
      routing: b.routing,
      analysisFocus:
        typeof b.analysisFocus === 'string' ? b.analysisFocus : undefined,
      jurisdiction:
        typeof b.jurisdiction === 'string' ? b.jurisdiction : undefined,
      docket: typeof b.docket === 'string' ? b.docket : undefined,
      exclusions:
        typeof b.exclusions === 'string' ? b.exclusions : undefined,
    });
    // Focus/routing changed → recompute analyses through the new lens.
    await bustAnalysisCache(created.id);
    return NextResponse.json({ ok: true, campaign: created });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
