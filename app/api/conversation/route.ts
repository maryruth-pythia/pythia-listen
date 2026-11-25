import { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import {
  getSession,
  getProject,
  listMessages,
  appendMessage,
  upsertSession,
} from '@/lib/db';
import { streamComplete, MODELS } from '@/lib/claude';
import { buildCommunitySystemPrompt } from '@/lib/prompts/system.community';
import type { Message } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/conversation
 * Body: { sessionId: string, userMessage?: string }
 *
 * - If userMessage is provided, append it as a user turn.
 * - Always returns a streaming SSE response with the assistant's next reply.
 *
 * If userMessage is empty AND there are no messages yet, the AI produces
 * its opening turn (greet, disclose, FPIC, brief, ask to begin).
 */
export async function POST(req: NextRequest) {
  const { sessionId, userMessage } = (await req.json()) as {
    sessionId: string;
    userMessage?: string;
  };

  const session = await getSession(sessionId);
  if (!session) {
    return new Response(
      JSON.stringify({ error: 'Session not found' }),
      { status: 404, headers: { 'content-type': 'application/json' } }
    );
  }

  const project = await getProject(session.projectId);
  if (!project) {
    return new Response(
      JSON.stringify({ error: 'Project not found' }),
      { status: 404, headers: { 'content-type': 'application/json' } }
    );
  }

  const existingMessages = await listMessages(session.id);

  // If a user message was sent, append it.
  if (userMessage && userMessage.trim().length > 0) {
    const userMsg: Message = {
      id: randomUUID(),
      sessionId: session.id,
      role: 'user',
      content: userMessage.trim(),
      createdAt: new Date().toISOString(),
      stage: 'listen',
    };
    await appendMessage(userMsg);
    existingMessages.push(userMsg);
  }

  // Stage hint: how many user turns have happened (after the optional append above).
  const userTurnCount = existingMessages.filter((m) => m.role === 'user').length;

  const systemPrompt = buildCommunitySystemPrompt({
    project,
    language: session.language,
    userTurnCount,
    demographics: session.demographics,
    participationConsentState: session.participationConsentState,
  });

  // Convert stored messages to chat format.
  const apiMessages = existingMessages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  // If there are no messages at all (very first turn), seed with a single
  // user "begin" trigger so the model produces the opening message.
  if (apiMessages.length === 0) {
    apiMessages.push({
      role: 'user',
      content:
        '[System note: this is the start of the conversation. The participant has just opened the page. Produce your opening message now.]',
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let fullText = '';
      try {
        for await (const delta of streamComplete({
          model: MODELS.conversation,
          maxTokens: 1024,
          system: systemPrompt,
          messages: apiMessages,
        })) {
          fullText += delta;
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`)
          );
        }

        // Persist the assistant message.
        const assistantMsg: Message = {
          id: randomUUID(),
          sessionId: session.id,
          role: 'assistant',
          content: fullText,
          createdAt: new Date().toISOString(),
          stage:
            existingMessages.filter((m) => m.role === 'user').length === 0
              ? 'opening'
              : 'listen',
        };
        await appendMessage(assistantMsg);

        // Touch the session updatedAt.
        session.updatedAt = new Date().toISOString();
        await upsertSession(session);

        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        controller.close();
      } catch (err) {
        const e = err as { message?: string; status?: number };
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              error: e.message ?? 'Model API call failed',
              status: e.status ?? 0,
            })}\n\n`
          )
        );
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
