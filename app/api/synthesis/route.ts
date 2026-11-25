import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import {
  getProject,
  listSessions,
  listMessages,
  appendSynthesisRun,
} from '@/lib/db';
import { complete, MODELS } from '@/lib/claude';
import { buildSynthesisPrompt } from '@/lib/prompts/synthesis';
import type { Session, Message, SynthesisRun } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * POST /api/synthesis
 * Body: { projectId: string, includeOnlyConsented?: boolean }
 *
 * Runs synthesis across consented conversations for a project.
 * Defaults to including only sessions where the participant consented to
 * sharing with the developer.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    projectId: string;
    includeOnlyConsented?: boolean;
  };
  const includeOnlyConsented = body.includeOnlyConsented ?? true;

  const project = await getProject(body.projectId);
  if (!project) {
    return NextResponse.json(
      { error: `Project ${body.projectId} not found` },
      { status: 404 }
    );
  }

  const allSessions = await listSessions(project.id);
  const eligible: Session[] = includeOnlyConsented
    ? allSessions.filter((s) => s.consent?.mayShareWithDeveloper === true)
    : allSessions.filter((s) => s.status !== 'active');

  if (eligible.length === 0) {
    return NextResponse.json(
      {
        error:
          'No consented conversations available for synthesis. Need at least one conversation where the participant has explicitly consented to share with the developer.',
      },
      { status: 400 }
    );
  }

  // Load transcripts (sessions + messages)
  const transcripts: Array<{ session: Session; messages: Message[] }> = await Promise.all(
    eligible.map(async (s) => ({
      session: s,
      messages: await listMessages(s.id),
    }))
  );

  // Default synthesis language: whichever language the majority of conversations were in.
  const counts = transcripts.reduce(
    (acc, t) => {
      acc[t.session.language] = (acc[t.session.language] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  const synthesisLanguage = (counts.es ?? 0) > (counts.en ?? 0) ? 'es' : 'en';

  const { system, userMessage } = buildSynthesisPrompt({
    project,
    language: synthesisLanguage,
    transcripts,
  });

  const synthesisOutput = await complete({
    model: MODELS.synthesis,
    system,
    messages: [{ role: 'user', content: userMessage }],
    maxTokens: 2000,
    temperature: 0.4,
  });

  const run: SynthesisRun = {
    id: randomUUID(),
    projectId: project.id,
    includedSessionIds: eligible.map((s) => s.id),
    outputMarkdown: synthesisOutput,
    createdAt: new Date().toISOString(),
  };
  await appendSynthesisRun(run);

  return NextResponse.json({ run });
}
