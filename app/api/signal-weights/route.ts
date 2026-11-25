/**
 * Per-file weighting. Operator-gated by the site password wall.
 * GET ?campaign=<id> → one row per FILE (signals from the same file are grouped)
 *   with the file's current weight.
 * POST { campaignId, updates:[{fileKey, salience}] } → set salience on ALL
 *   signals from each file now (immediate, no re-ingest), record a per-file
 *   override so a future re-ingest keeps the boost, and bust the analysis cache.
 */
import { NextRequest, NextResponse } from 'next/server';
import { listSignals, upsertSignal, getCache, setCache } from '@/lib/db';
import {
  FILE_WEIGHTS_KEY,
  DEFAULT_CHANNEL_WEIGHT,
  baseFileKey,
} from '@/lib/ingest/channels';
import { bustAnalysisCache } from '@/lib/cache';
import { canAccessCampaign } from '@/lib/scope';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const campaignId = req.nextUrl.searchParams.get('campaign') || undefined;
  if (!campaignId) {
    return NextResponse.json({ error: 'campaign required' }, { status: 400 });
  }
  if (!(await canAccessCampaign(campaignId))) { return NextResponse.json({ error: 'not found' }, { status: 404 }); }
  const signals = await listSignals(campaignId);
  const groups = new Map<
    string,
    { fileKey: string; name: string; sourceType: string; count: number; salience: number }
  >();
  for (const s of signals) {
    const fileKey = baseFileKey(s.dedupeKey);
    if (!fileKey) continue; // non-file signals (seeds, etc.) aren't per-file weightable
    const name = s.citations?.[0]?.title || s.title || '(untitled)';
    const salience = s.salience ?? DEFAULT_CHANNEL_WEIGHT;
    const g = groups.get(fileKey);
    if (g) {
      g.count += 1;
      g.salience = Math.max(g.salience, salience); // representative = the file's top weight
    } else {
      groups.set(fileKey, { fileKey, name, sourceType: s.sourceType, count: 1, salience });
    }
  }
  const rows = [...groups.values()].sort(
    (a, b) => b.salience - a.salience || a.name.localeCompare(b.name)
  );
  return NextResponse.json(
    { count: rows.length, rows },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
  const b = body as { campaignId?: string; updates?: unknown };
  if (!b.campaignId || !Array.isArray(b.updates)) {
    return NextResponse.json(
      { error: 'campaignId and updates[] required' },
      { status: 400 }
    );
  }
  const wanted = new Map<string, number>();
  for (const u of b.updates as Array<{ fileKey?: string; salience?: unknown }>) {
    const n = Number(u?.salience);
    if (u?.fileKey && Number.isFinite(n)) {
      wanted.set(u.fileKey, Math.max(0, Math.min(100, Math.round(n))));
    }
  }
  if (wanted.size === 0) {
    return NextResponse.json({ ok: true, updated: 0 });
  }

  if (!(await canAccessCampaign(b.campaignId))) { return NextResponse.json({ error: 'not found' }, { status: 404 }); }
  const signals = await listSignals(b.campaignId);
  const fileWeights =
    ((await getCache(FILE_WEIGHTS_KEY))?.value as
      | Record<string, number>
      | undefined) ?? {};
  let updated = 0;
  const touchedFiles = new Set<string>();
  for (const s of signals) {
    const fileKey = baseFileKey(s.dedupeKey);
    if (!wanted.has(fileKey)) continue;
    const salience = wanted.get(fileKey)!;
    await upsertSignal({ ...s, salience });
    fileWeights[fileKey] = salience;
    touchedFiles.add(fileKey);
    updated++;
  }
  await setCache(FILE_WEIGHTS_KEY, fileWeights);
  if (updated > 0) await bustAnalysisCache(b.campaignId);
  return NextResponse.json({ ok: true, updated, files: touchedFiles.size });
}
