import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import {
  getSession,
  listMessages,
  appendMessage,
  upsertSession,
} from '@/lib/db';
import { complete, MODELS } from '@/lib/claude';
import { buildRecapPrompt } from '@/lib/prompts/recap';
import type { Message } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const sessionId = (await ctx.params).id;
  const session = await getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }
  const transcript = await listMessages(sessionId);

  const { system, userMessage } = buildRecapPrompt({
    language: session.language,
    transcript,
  });

  const recap = await complete({
    model: MODELS.conversation,
    system,
    messages: [{ role: 'user', content: userMessage }],
    maxTokens: 600,
    temperature: 0.4,
  });

  // Persist as a special-stage assistant message.
  const msg: Message = {
    id: randomUUID(),
    sessionId,
    role: 'assistant',
    content: recap,
    createdAt: new Date().toISOString(),
    stage: 'recap',
  };
  await appendMessage(msg);

  session.status = 'recap';
  session.updatedAt = new Date().toISOString();
  await upsertSession(session);

  return NextResponse.json({ recap });
}
