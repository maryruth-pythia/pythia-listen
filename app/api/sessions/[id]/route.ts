import { NextResponse } from 'next/server';
import { getSession, listMessages } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getSession((await ctx.params).id);
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }
  const messages = await listMessages(session.id);
  return NextResponse.json({ session, messages });
}
