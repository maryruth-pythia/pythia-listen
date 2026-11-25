import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { upsertSurvey, getSurvey } from '@/lib/db';
import type { Survey } from '@/lib/types';
import { canAccessCampaign } from '@/lib/scope';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Publish a SurveySpec as a shareable survey. Operator-only (gated by the
 *  site password wall, since it lives under /api/agents/*). */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
  const b = (body ?? {}) as {
    spec?: unknown;
    campaignId?: unknown;
    languages?: unknown;
    id?: unknown;
    status?: unknown;
  };
  if (!b.spec || typeof b.spec !== 'object') {
    return NextResponse.json({ error: 'missing survey spec' }, { status: 400 });
  }
  const campaignId =
    typeof b.campaignId === 'string' && b.campaignId ? b.campaignId : 'general';
  if (!(await canAccessCampaign(campaignId))) { return NextResponse.json({ error: 'not found' }, { status: 404 }); }
  const languages = Array.isArray(b.languages)
    ? b.languages.filter((x): x is string => typeof x === 'string')
    : ['en'];
  const status: 'draft' | 'published' = b.status === 'draft' ? 'draft' : 'published';

  // Reuse an existing id (draft -> publish, or draft re-save) so we never
  // create duplicate records; otherwise mint a fresh unguessable slug.
  let id = typeof b.id === 'string' && b.id.trim() ? b.id.trim() : '';
  let createdAt = new Date().toISOString();
  if (id) {
    const existing = await getSurvey(id);
    if (existing) createdAt = existing.createdAt;
  } else {
    id = randomUUID().replace(/-/g, '').slice(0, 12);
  }
  const survey: Survey = {
    id,
    campaignId,
    spec: b.spec as Record<string, unknown>,
    status,
    languages: languages.length ? languages : ['en'],
    createdAt,
  };
  try {
    await upsertSurvey(survey);
    return NextResponse.json({ id, url: status === 'published' ? `/s/${id}` : null, status });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `publish failed: ${message}` }, { status: 500 });
  }
}
