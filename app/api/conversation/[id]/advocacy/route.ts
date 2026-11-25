import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import {
  getSession,
  listMessages,
  appendMessage,
  upsertSession,
  appendReport,
} from '@/lib/db';
import { complete, MODELS } from '@/lib/claude';
import { buildAdvocacyPrompt } from '@/lib/prompts/advocacy';
import type { Message, Report } from '@/lib/types';

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

  const { system, userMessage } = buildAdvocacyPrompt({
    language: session.language,
    transcript,
  });

  const advocacy = await complete({
    model: MODELS.conversation,
    system,
    messages: [{ role: 'user', content: userMessage }],
    maxTokens: 800,
    temperature: 0.5,
  });

  // Save as a "advocacy" report.
  const report: Report = {
    id: randomUUID(),
    sessionId,
    kind: 'advocacy_summary',
    contentMarkdown: advocacy,
    createdAt: new Date().toISOString(),
  };
  await appendReport(report);

  // Persist as a chat-visible message too.
  const msg: Message = {
    id: randomUUID(),
    sessionId,
    role: 'assistant',
    content: advocacy,
    createdAt: new Date().toISOString(),
    stage: 'advocacy',
  };
  await appendMessage(msg);

  session.status = 'closed';
  session.updatedAt = new Date().toISOString();
  await upsertSession(session);

  return NextResponse.json({ advocacy });
}
