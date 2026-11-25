/**
 * Monitored sources CRUD. Gated by cookie (operator).
 * - GET  ?campaignId=…            → list sources for a campaign
 * - POST { campaignId,url,label?,rationale?,addedBy? } → add one (active)
 * - DELETE ?id=…                  → remove one
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import {
  listMonitoredSources,
  upsertMonitoredSource,
  deleteMonitoredSource,
} from '@/lib/db';
import { FRASIER_CAMPAIGN_ID } from '@/lib/ingest/seed-frasier';
import { canAccessCampaign } from '@/lib/scope';
import type { MonitoredSource } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const campaignId =
    req.nextUrl.searchParams.get('campaignId') || FRASIER_CAMPAIGN_ID;
  if (!(await canAccessCampaign(campaignId))) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  const sources = await listMonitoredSources(campaignId, 'active');
  return NextResponse.json({ sources });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const url = typeof b.url === 'string' ? b.url.trim() : '';
  if (!url || !/^https?:\/\//i.test(url)) {
    return NextResponse.json(
      { error: 'A valid http(s) URL is required.' },
      { status: 400 }
    );
  }
  const source: MonitoredSource = {
    id: `src_${randomUUID()}`,
    campaignId:
      typeof b.campaignId === 'string' && b.campaignId
        ? b.campaignId
        : FRASIER_CAMPAIGN_ID,
    url,
    label: typeof b.label === 'string' ? b.label : undefined,
    rationale: typeof b.rationale === 'string' ? b.rationale : undefined,
    addedBy: b.addedBy === 'agent' ? 'agent' : 'manual',
    status: 'active',
    createdAt: new Date().toISOString(),
  };
  await upsertMonitoredSource(source);
  return NextResponse.json({ source });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await deleteMonitoredSource(id);
  return NextResponse.json({ ok: true });
}
