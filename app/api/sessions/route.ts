import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { getProject, upsertSession, listProjects } from '@/lib/db';
import type { Language, Session } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * POST /api/sessions
 * Body: { projectId?: string, language: 'en' | 'es' }
 * Creates a new conversation session.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json()) as { projectId?: string; language?: Language };
  const language = body.language === 'es' ? 'es' : 'en';

  let projectId = body.projectId;
  if (!projectId) {
    // Default to the first available project (the demo seed).
    const projects = await listProjects();
    if (projects.length === 0) {
      return NextResponse.json(
        { error: 'No projects in store. Run `npm run db:init` first.' },
        { status: 400 }
      );
    }
    projectId = projects[0].id;
  }

  const project = await getProject(projectId);
  if (!project) {
    return NextResponse.json(
      { error: `Project ${projectId} not found.` },
      { status: 404 }
    );
  }

  const now = new Date().toISOString();
  const session: Session = {
    id: randomUUID(),
    projectId: project.id,
    language,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };

  await upsertSession(session);

  return NextResponse.json({ session });
}
