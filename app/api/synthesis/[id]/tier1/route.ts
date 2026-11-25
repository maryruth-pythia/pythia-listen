import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import {
  listSynthesisRuns,
  getProject,
  listSessions,
  listReports,
  appendReport,
} from '@/lib/db';
import { complete, MODELS } from '@/lib/claude';
import { buildTier1Prompt } from '@/lib/prompts/tier1';
import type { Report } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * POST /api/synthesis/[id]/tier1
 * Generates a Tier 1 Independent Signal Report from a synthesis run.
 */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const allRuns = await listSynthesisRuns();
  const run = allRuns.find((r) => r.id === id);
  if (!run) {
    return NextResponse.json(
      { error: `Synthesis run ${id} not found` },
      { status: 404 }
    );
  }

  const project = await getProject(run.projectId);
  if (!project) {
    return NextResponse.json(
      { error: 'Project not found' },
      { status: 404 }
    );
  }

  const sessions = await listSessions(project.id);
  const included = sessions.filter((s) => run.includedSessionIds.includes(s.id));

  const languageMix = included.reduce(
    (acc, s) => {
      acc[s.language] = (acc[s.language] ?? 0) + 1;
      return acc;
    },
    { en: 0, es: 0, tl: 0, pt: 0, hi: 0 } as { en: number; es: number; tl: number; pt: number; hi: number }
  );

  // If a Tier 1 report already exists for this run, return it instead of regenerating.
  const existingReports = await listReports();
  const existing = existingReports.find(
    (r) => r.synthesisRunId === run.id && r.kind === 'tier1'
  );
  if (existing) {
    return NextResponse.json({ report: existing });
  }

  const reportLanguage =
    languageMix.es > languageMix.en ? 'es' : 'en';

  const { system, userMessage } = buildTier1Prompt({
    project,
    language: reportLanguage,
    synthesisMarkdown: run.outputMarkdown,
    conversationCount: included.length,
    languageMix,
  });

  const reportMarkdown = await complete({
    model: MODELS.synthesis,
    system,
    messages: [{ role: 'user', content: userMessage }],
    maxTokens: 1500,
    temperature: 0.4,
  });

  const report: Report = {
    id: randomUUID(),
    synthesisRunId: run.id,
    kind: 'tier1',
    contentMarkdown: reportMarkdown,
    createdAt: new Date().toISOString(),
  };
  await appendReport(report);

  return NextResponse.json({ report });
}
