import { NextRequest, NextResponse } from 'next/server';
import { getCampaignById, saveCampaign } from '@/lib/campaigns';
import { bustAnalysisCache } from '@/lib/cache';
import { canAccessCampaign } from '@/lib/scope';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Operator-only (gated by middleware). Appends a red-team directive to a
 * project's analysis config — either `exclusions` (a claim to stop asserting)
 * or `analysisFocus` (a missing voice to actively seek) — then busts the
 * analysis cache so the dashboard recomputes without that hallucination.
 */
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  let b: { field?: unknown; text?: unknown };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
  const field: 'exclusions' | 'analysisFocus' =
    b.field === 'analysisFocus' ? 'analysisFocus' : 'exclusions';
  const text = typeof b.text === 'string' ? b.text.trim() : '';
  if (!text) return NextResponse.json({ error: 'text required' }, { status: 400 });

  const c = await getCampaignById(id);
  if (!c || !(await canAccessCampaign(c.id))) return NextResponse.json({ error: 'unknown project' }, { status: 404 });

  const current = (c[field] ?? '').toString();
  if (current.includes(text)) return NextResponse.json({ ok: true, already: true });
  const updated = current ? current + '\n' + text : text;

  await saveCampaign({
    id: c.id,
    name: c.name,
    kind: c.kind,
    badge: c.badge,
    meta: c.meta,
    blurb: c.blurb,
    routing: c.routing,
    analysisFocus: c.analysisFocus,
    jurisdiction: c.jurisdiction,
    docket: c.docket,
    exclusions: c.exclusions,
    [field]: updated,
  });
  await bustAnalysisCache(c.id);
  return NextResponse.json({ ok: true });
}
