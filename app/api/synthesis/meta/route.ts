/**
 * Meta-synthesis endpoint. POST { campaignId?, projectId? } → MetaResult.
 * Gated by cookie. Computed on demand (a synthesis-model call over the live
 * civic + direct signals). Defaults to the Frasier civic pilot + Honua demo
 * conversations if no ids are given.
 */

import { NextRequest, NextResponse } from 'next/server';
import { computeMetaSynthesis } from '@/lib/synthesis/meta';
import { canAccessCampaign } from '@/lib/scope';
import { FRASIER_CAMPAIGN_ID } from '@/lib/ingest/seed-frasier';
import { clearCache } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    /* body optional */
  }
  const b = (body ?? {}) as { campaignId?: unknown; force?: unknown };
  const campaignId =
    typeof b.campaignId === 'string' && b.campaignId
      ? b.campaignId
      : FRASIER_CAMPAIGN_ID;

  if (!(await canAccessCampaign(campaignId))) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  if (b.force === true) {
    try {
      await clearCache(`analysis:${campaignId}:meta`);
    } catch {
      /* non-fatal */
    }
  }

  try {
    const result = await computeMetaSynthesis(campaignId);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `meta-synthesis error: ${message}` }, { status: 500 });
  }
}
