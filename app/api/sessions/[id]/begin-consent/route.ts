import { NextRequest, NextResponse } from 'next/server';
import { getSession, upsertSession } from '@/lib/db';
import type { ParticipationConsentState } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * POST /api/sessions/[id]/begin-consent
 * Body: { state: 'yes_begin' | 'questions_first' | 'declined' }
 *
 * Records the participant's beginning-of-conversation choice.
 * 'declined' moves the session to 'closed' and no further turns happen.
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

  const body = (await req.json()) as { state?: ParticipationConsentState };
  const state = body.state;
  if (state !== 'yes_begin' && state !== 'questions_first' && state !== 'declined') {
    return NextResponse.json({ error: 'Invalid state' }, { status: 400 });
  }

  session.participationConsentState = state;
  session.participationConsentAt = new Date().toISOString();
  session.updatedAt = new Date().toISOString();
  if (state === 'declined') {
    session.status = 'closed';
  }
  await upsertSession(session);

  return NextResponse.json({ ok: true, state });
}
