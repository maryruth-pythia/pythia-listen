/**
 * Political Foresight chat endpoint.
 * POST { messages, context? } → { reply, sources }. Gated by cookie.
 * Uses web search, so it can run a little longer.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  runPoliticalForesight,
  type ChatTurn,
} from '@/lib/agents/political-foresight';

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

  const b = (body ?? {}) as { messages?: unknown; context?: unknown };
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

  const context =
    typeof b.context === 'string' && b.context ? b.context : undefined;

  try {
    const result = await runPoliticalForesight(messages, { context });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error: `agent error: ${message}`,
        hint: 'Political Foresight uses web search; set PYTHIA_FORESIGHT_MODEL to a web-search-capable model if this persists.',
      },
      { status: 500 }
    );
  }
}
