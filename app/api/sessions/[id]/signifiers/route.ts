import { NextRequest, NextResponse } from 'next/server';
import { getSession, upsertSession } from '@/lib/db';
import type { SignifierResponse } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * POST /api/sessions/[id]/signifiers
 * Body: { responses: SignifierResponse[] }
 *
 * Records the participant's self-scored signifier responses. Called after
 * the substantive conversation, before recap. Replaces any prior responses
 * on the session (idempotent retry safe).
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

  const body = (await req.json()) as { responses?: SignifierResponse[] };
  const responses = Array.isArray(body.responses) ? body.responses : [];

  // Light validation: each response needs a signifierId and either a dyad value or triad coords.
  for (const r of responses) {
    if (!r.signifierId) {
      return NextResponse.json(
        { error: 'Each response needs a signifierId' },
        { status: 400 }
      );
    }
    if (r.dyadValue === undefined && r.triadCoords === undefined) {
      return NextResponse.json(
        { error: `Response for ${r.signifierId} missing dyadValue or triadCoords` },
        { status: 400 }
      );
    }
    if (r.triadCoords) {
      const { a, b, c } = r.triadCoords;
      const sum = a + b + c;
      if (Math.abs(sum - 1) > 0.05) {
        return NextResponse.json(
          { error: `Triad coords for ${r.signifierId} must sum to ~1 (got ${sum})` },
          { status: 400 }
        );
      }
    }
  }

  session.signifierResponses = responses.map((r) => ({
    ...r,
    capturedAt: r.capturedAt ?? new Date().toISOString(),
  }));
  session.updatedAt = new Date().toISOString();
  await upsertSession(session);

  return NextResponse.json({ ok: true, count: responses.length });
}
