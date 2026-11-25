import { NextRequest, NextResponse } from 'next/server';
import { getSurvey } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Public: fetch a published survey spec for rendering. */
export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const survey = await getSurvey(params.id);
  if (!survey || survey.status !== 'published') {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  return NextResponse.json({
    id: survey.id,
    spec: survey.spec,
    languages: survey.languages,
  });
}
