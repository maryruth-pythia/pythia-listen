/**
 * Source-scout suggestions. POST { projectName?, jurisdiction?, docket? }
 * → { suggestions: [{url,label,rationale}] }. Gated by cookie. Uses web search.
 */

import { NextRequest, NextResponse } from 'next/server';
import { suggestSources } from '@/lib/agents/source-scout';
import { FRASIER_CONTEXT } from '@/lib/ingest/seed-frasier';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    /* optional */
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const projectName =
    typeof b.projectName === 'string' && b.projectName
      ? b.projectName
      : FRASIER_CONTEXT.projectName;
  const jurisdiction =
    typeof b.jurisdiction === 'string' && b.jurisdiction
      ? b.jurisdiction
      : FRASIER_CONTEXT.jurisdiction;
  const docket =
    typeof b.docket === 'string' && b.docket ? b.docket : FRASIER_CONTEXT.docket;

  try {
    const suggestions = await suggestSources(projectName, jurisdiction, docket);
    return NextResponse.json({ suggestions });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error: `suggestion error: ${message}`,
        hint: 'Source suggestions use web search; set PYTHIA_INGEST_MODEL to a web-search-capable model.',
      },
      { status: 500 }
    );
  }
}
