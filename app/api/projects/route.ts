import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { listProjects, upsertProject } from '@/lib/db';
import type {
  Language,
  Project,
  PublicComment,
  ResearchQuestionId,
  SignifierId,
} from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const projects = await listProjects();
  return NextResponse.json({ projects });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Partial<Project>;
  if (!body.name || !body.location || !body.briefMarkdown) {
    return NextResponse.json(
      { error: 'name, location, and briefMarkdown are required' },
      { status: 400 }
    );
  }
  const langs = (body.languages ?? ['en']).filter((l): l is Language =>
    l === 'en' || l === 'es'
  );
  const project: Project = {
    id: slugify(body.name) + '-' + randomUUID().slice(0, 8),
    name: body.name,
    location: body.location,
    briefMarkdown: body.briefMarkdown,
    publicComments: (body.publicComments ?? []) as PublicComment[],
    languages: langs.length > 0 ? langs : ['en'],
    researchQuestionIds:
      (body.researchQuestionIds as ResearchQuestionId[] | undefined) ?? undefined,
    signifierIds:
      (body.signifierIds as SignifierId[] | undefined) ?? undefined,
    createdAt: new Date().toISOString(),
  };
  await upsertProject(project);
  return NextResponse.json({ project });
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}
