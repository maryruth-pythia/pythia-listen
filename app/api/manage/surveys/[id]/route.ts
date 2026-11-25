import { NextRequest, NextResponse } from 'next/server';
import { deleteSurvey, getSurvey } from '@/lib/db';
import { canAccessCampaign } from '@/lib/scope';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Operator-only (gated by middleware — NOT in the public /api/surveys allowlist).
 * Only someone with access to the survey's board can delete it. */
export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const survey = await getSurvey(id);
  if (!survey || !(await canAccessCampaign(survey.campaignId))) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  await deleteSurvey(id);
  return NextResponse.json({ ok: true });
}
