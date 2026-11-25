import { NextRequest, NextResponse } from 'next/server';
import { getProject, upsertProject } from '@/lib/db';
import type { SignifierId } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/projects/[id]
 *
 * Partial update: only updates fields that are explicitly supplied.
 * Currently supports: signifierIds, photovoiceEnabled, mappingEnabled, demographicsEnabled, mapCenter.
 */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const project = await getProject((await ctx.params).id);
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const body = (await req.json()) as {
    signifierIds?: SignifierId[];
    photovoiceEnabled?: boolean;
    mappingEnabled?: boolean;
    demographicsEnabled?: boolean;
    mapCenter?: { lat: number; lng: number; zoom?: number };
  };

  if ('signifierIds' in body) {
    project.signifierIds = Array.isArray(body.signifierIds)
      ? body.signifierIds
      : [];
  }
  if ('photovoiceEnabled' in body) {
    project.photovoiceEnabled = !!body.photovoiceEnabled;
  }
  if ('mappingEnabled' in body) {
    project.mappingEnabled = !!body.mappingEnabled;
  }
  if ('demographicsEnabled' in body) {
    project.demographicsEnabled = !!body.demographicsEnabled;
  }
  if ('mapCenter' in body) {
    project.mapCenter = body.mapCenter;
  }

  await upsertProject(project);
  return NextResponse.json({ ok: true, project });
}
