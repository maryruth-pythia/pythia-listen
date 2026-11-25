/**
 * Civic-record ingestion endpoint.
 *
 * - POST: operator-triggered "Refresh now" (requires the pythia-auth cookie).
 * - GET:  scheduled refresh from Vercel Cron (requires the CRON secret).
 *
 * This route is allow-listed in middleware.ts so Vercel Cron (which has no
 * login cookie) can reach it — but it self-guards: every request must present
 * EITHER a valid operator cookie OR the cron secret, or it gets a 401.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/pw-session';
import { runCivicIngestion, ensureSeed } from '@/lib/ingest/civic';
import { bustAnalysisCache } from '@/lib/cache';
import {
  CEDAR_CAMPAIGN_ID,
  CEDAR_CIVIC_SIGNALS,
  CEDAR_DESK_SIGNALS,
} from '@/lib/ingest/seed-cedar';
import {
  FRASIER_CONTEXT,
  FRASIER_SEED_SIGNALS,
  FRASIER_CAMPAIGN_ID,
} from '@/lib/ingest/seed-frasier';
import {
  FRASIER_DESK_SIGNALS,
  FRASIER_DIRECT_SIGNALS,
} from '@/lib/ingest/seed-frasier-trend';
import {
  DGATEWAY_CONTEXT,
  DGATEWAY_SEED_SIGNALS,
} from '@/lib/ingest/seed-datacenter';
import {
  KAHUKU_CAMPAIGN_ID,
  KAHUKU_CIVIC_SIGNALS,
  KAHUKU_COMMUNITY_SIGNALS,
} from '@/lib/ingest/seed-kahuku';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function authorized(req: NextRequest): Promise<boolean> {
  // Operator-triggered: valid password cookie.
  const cookie = req.cookies.get('pythia-auth')?.value;
  const pw = process.env.PYTHIA_PASSWORD;
  if (pw && (await verifySession(cookie, pw))) return true;

  // Cron-triggered: bearer secret. Vercel Cron sends the configured secret.
  const secret = process.env.PYTHIA_CRON_SECRET ?? process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization') ?? '';
    if (auth === `Bearer ${secret}`) return true;
  }
  return false;
}

async function run() {
  // Each campaign registers its own verified context + seeds and is added
  // here. All campaigns seed on every refresh (idempotent — deterministic ids
  // mean re-running is a no-op upsert).
  const passes = [
    { name: 'frasier', ctx: FRASIER_CONTEXT, seeds: FRASIER_SEED_SIGNALS },
    { name: 'digital-gateway', ctx: DGATEWAY_CONTEXT, seeds: DGATEWAY_SEED_SIGNALS },
  ];
  const results = [];
  let ok = true;
  for (const p of passes) {
    const { run, seedInserted } = await runCivicIngestion(p.ctx, p.seeds);
    if (run.status === 'error') ok = false;
    results.push({ campaign: p.name, seedInserted, run });
  }

  // Frasier demo desk + direct signals (dated) so all three trend lines render.
  const frasierDesk = await ensureSeed(FRASIER_CAMPAIGN_ID, FRASIER_DESK_SIGNALS, 'desk');
  const frasierDirect = await ensureSeed(FRASIER_CAMPAIGN_ID, FRASIER_DIRECT_SIGNALS, 'pythia');
  if (frasierDesk + frasierDirect > 0) await bustAnalysisCache(FRASIER_CAMPAIGN_ID);
  results.push({ campaign: 'frasier (demo desk+direct)', seedInserted: frasierDesk + frasierDirect });

  // Cedar Ridge is an illustrative DEMO project — seed its civic + desk
  // baselines directly (no live web search for a fictional docket).
  const cedarCivic = await ensureSeed(CEDAR_CAMPAIGN_ID, CEDAR_CIVIC_SIGNALS, 'civic');
  const cedarDesk = await ensureSeed(CEDAR_CAMPAIGN_ID, CEDAR_DESK_SIGNALS, 'desk');
  if (cedarCivic + cedarDesk > 0) await bustAnalysisCache(CEDAR_CAMPAIGN_ID);
  results.push({ campaign: 'cedar-ridge (demo)', seedInserted: cedarCivic + cedarDesk });

  // Kahuku Wind (Nā Pua Makani) — a REAL Hawaiʻi project used as a demo Site
  // Project. Civic layer is real + cited; community layer is illustrative,
  // anonymized sentiment honestly marked as demo data. Seeded directly (no live
  // web search) and idempotent via deterministic ids.
  const kahukuCivic = await ensureSeed(KAHUKU_CAMPAIGN_ID, KAHUKU_CIVIC_SIGNALS, 'civic');
  const kahukuComm = await ensureSeed(KAHUKU_CAMPAIGN_ID, KAHUKU_COMMUNITY_SIGNALS, 'pythia');
  if (kahukuCivic + kahukuComm > 0) await bustAnalysisCache(KAHUKU_CAMPAIGN_ID);
  results.push({ campaign: 'kahuku-wind (demo)', seedInserted: kahukuCivic + kahukuComm });

  return NextResponse.json({ ok, results });
}

export async function POST(req: NextRequest) {
  if (!(await authorized(req))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  return run();
}

export async function GET(req: NextRequest) {
  if (!(await authorized(req))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  return run();
}
