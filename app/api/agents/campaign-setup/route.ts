/**
 * Campaign Setup chat endpoint.
 * POST { messages } → { reply }. Gated by cookie. No web search.
 */

import { NextRequest, NextResponse } from 'next/server';
import { runCampaignSetup, type ChatTurn } from '@/lib/agents/campaign-setup';

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

  const b = (body ?? {}) as { messages?: unknown; language?: unknown };
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
    const language =
      typeof b.language === 'string' && b.language ? b.language : undefined;
    const reply = await runCampaignSetup(messages, { language });
    return NextResponse.json({ reply });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `agent error: ${message}` }, { status: 500 });
  }
}
