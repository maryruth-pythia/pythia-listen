/**
 * Survey Builder chat endpoint.
 *
 * POST { messages: {role,content}[], projectId?, campaignId? } → { reply }.
 * Gated by middleware (operator cookie). Non-streaming for simplicity.
 * The client parses any survey spec out of the reply itself.
 */

import { NextRequest, NextResponse } from 'next/server';
import { runSurveyBuilder, type ChatTurn } from '@/lib/agents/survey-builder';
import { resolveProject } from '@/lib/resolve-project';

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

  const b = (body ?? {}) as {
    messages?: unknown;
    projectId?: unknown;
    campaignId?: unknown;
    language?: unknown;
  };
  const raw = Array.isArray(b.messages) ? b.messages : [];
  const messages: ChatTurn[] = raw
    .filter(
      (m): m is ChatTurn =>
        !!m &&
        typeof m === 'object' &&
        (('role' in m && (m as ChatTurn).role === 'user') ||
          (m as ChatTurn).role === 'assistant') &&
        typeof (m as ChatTurn).content === 'string'
    )
    .slice(-20);

  if (messages.length === 0) {
    return NextResponse.json({ error: 'no messages' }, { status: 400 });
  }

  // Grounding: resolve the Project (from either store) and give the agent its
  // brief + background "civic-record" samples, so it can ask smart questions
  // even for a brand-new project with no real survey data yet.
  let projectContext: string | undefined;
  const pid =
    typeof b.projectId === 'string' && b.projectId
      ? b.projectId
      : typeof b.campaignId === 'string' && b.campaignId
        ? b.campaignId
        : '';
  if (pid) {
    try {
      const p = await resolveProject(pid);
      if (p) {
        const bg = p.publicComments.length
          ? `\n\nBACKGROUND — sampled "civic-record" concerns for this project area (illustrative examples, NOT this project's own survey data; use only to ask smarter questions, never quote verbatim):\n` +
            p.publicComments.slice(0, 12).map((c) => `- ${c.text}`).join('\n')
          : '';
        projectContext = `Project: ${p.name}${p.location ? ` (${p.location})` : ''}.\n${p.briefMarkdown}${bg}`;
      }
    } catch {
      /* grounding is optional */
    }
  }

  try {
    const language =
      typeof b.language === 'string' && b.language ? b.language : undefined;
    const reply = await runSurveyBuilder(messages, { projectContext, language });
    return NextResponse.json({ reply });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `agent error: ${message}` },
      { status: 500 }
    );
  }
}
