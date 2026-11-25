/**
 * Campaign Chief-of-Staff chat endpoint.
 *
 * POST { messages: {role,content}[], projectId?: string } → { reply }.
 * Gated by middleware (operator cookie). Non-streaming for simplicity.
 */

import { NextRequest, NextResponse } from 'next/server';
import { runChiefOfStaff, type ChatTurn } from '@/lib/agents/chief-of-staff';
import { getProject } from '@/lib/db';

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

  const b = (body ?? {}) as { messages?: unknown; projectId?: unknown };
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

  let projectContext: string | undefined;
  if (typeof b.projectId === 'string' && b.projectId) {
    try {
      const p = await getProject(b.projectId);
      if (p) {
        projectContext = `Project: ${p.name} (${p.location}).\n${p.briefMarkdown}`;
      }
    } catch {
      /* context is optional */
    }
  }

  try {
    const reply = await runChiefOfStaff(messages, { projectContext });
    return NextResponse.json({ reply });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `agent error: ${message}` },
      { status: 500 }
    );
  }
}
