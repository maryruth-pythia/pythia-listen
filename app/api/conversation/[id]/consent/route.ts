import { NextResponse } from 'next/server';
import { recordConsent, getSession } from '@/lib/db';
import type { ConsentRecord, IdentificationPreference } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const sessionId = (await ctx.params).id;
  const session = await getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const body = (await req.json()) as Partial<ConsentRecord>;

  const consent: ConsentRecord = {
    mayShareWithDeveloper: !!body.mayShareWithDeveloper,
    mayShareWithFunder: !!body.mayShareWithFunder,
    mayShareInPublicReport: !!body.mayShareInPublicReport,
    identification:
      (body.identification as IdentificationPreference) ?? 'anonymous',
    notes: body.notes,
    recordedAt: new Date().toISOString(),
  };

  await recordConsent(sessionId, consent);

  return NextResponse.json({ ok: true, consent });
}
