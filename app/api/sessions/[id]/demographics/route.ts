import { NextRequest, NextResponse } from 'next/server';
import { getSession, upsertSession } from '@/lib/db';
import type { Demographics } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * POST /api/sessions/[id]/demographics
 * Body: Demographics (all fields optional)
 *
 * Records optional demographic information. Captured at the start of the
 * conversation, after begin-consent, before substantive Q&A.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const sessionId = (await ctx.params).id;
  const session = await getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const body = (await req.json()) as Partial<Demographics>;
  const demo: Demographics = {
    language: body.language,
    relationshipToArea: body.relationshipToArea,
    gender: body.gender,
    genderSelfDescribe: body.genderSelfDescribe?.trim() || undefined,
    indigenous: body.indigenous,
    indigenousSelfDescribe: body.indigenousSelfDescribe?.trim() || undefined,
    ageRange: body.ageRange,
    preStance:
      typeof body.preStance === 'number' &&
      body.preStance >= 0 &&
      body.preStance <= 100
        ? body.preStance
        : undefined,
    capturedAt: new Date().toISOString(),
  };

  session.demographics = demo;
  session.updatedAt = new Date().toISOString();
  await upsertSession(session);

  return NextResponse.json({ ok: true, demographics: demo });
}
