/**
 * New Watch chat endpoint.
 * POST { messages } → { reply }. Operator-gated by the site password wall.
 */

import { NextRequest, NextResponse } from 'next/server';
import { runWatchCreate, type ChatTurn } from '@/lib/agents/watch-create';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  const b = (body ?? {}) as { messages?: unknown };
  const raw = Array.isArray(b.messages) ? b.messages : [];
  const messages: ChatTurn[] = raw
    .filter(
      (m): m is ChatTurn =>
        !!m &&
        typeof m === 'object' &&
        ((m as ChatTurn).role === 'user' ||
          (m as ChatTurn).role === 'assistant') &&
        typeof (m as ChatTurn).content === 'string'
    )
    .slice(-20);

  if (messages.length === 0) {
    return NextResponse.json({ error: 'no messages' }, { status: 400 });
  }

  try {
    const reply = await runWatchCreate(messages);
    return NextResponse.json({ reply });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `agent error: ${message}` }, { status: 500 });
  }
}
