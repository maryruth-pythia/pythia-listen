/**
 * Deep ingestion diagnostic (operator-only).
 *
 * Shows exactly what the LIVE deployment sees: the folder ids currently in its
 * environment, the service-account it authenticates as, per-folder file counts,
 * plus the campaign routing result. This pinpoints env / sharing problems that
 * the normal UI hides.
 */

import { NextResponse } from 'next/server';
import { runChannelIngestion, CHANNELS_CAMPAIGN } from '@/lib/ingest/channels';
import { FRASIER_CAMPAIGN_ID } from '@/lib/ingest/seed-frasier';
import { diagnose } from '@/lib/ingest/drive';
import { listSignals, deleteChannelSignals } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Show a folder id safely-ish (they aren't real secrets, but keep it tidy). */
function tail(v: string | undefined): string | null {
  if (!v) return null;
  return v.length <= 10 ? v : `…${v.slice(-8)}`;
}

export async function GET(req: Request) {
  // ?reset=channels wipes channel-origin signals so the next ingestion
  // re-reads and re-routes every message from scratch (civic/seed untouched).
  let reset: unknown;
  const resetParam = new URL(req.url).searchParams.get('reset');
  if (resetParam === 'channels') {
    try {
      reset = { deletedChannelSignals: await deleteChannelSignals() };
    } catch (e) {
      reset = { error: e instanceof Error ? e.message : String(e) };
    }
  }

  const ids = {
    FRASIER_CAMPAIGN_ID,
    CHANNELS_CAMPAIGN,
    envPYTHIA_CHANNELS_CAMPAIGN: process.env.PYTHIA_CHANNELS_CAMPAIGN ?? null,
    aligned: CHANNELS_CAMPAIGN === FRASIER_CAMPAIGN_ID,
  };

  // What folder ids does THIS running deployment actually have?
  const envFolders = {
    email: tail(process.env.PYTHIA_DRIVE_FOLDER_EMAIL),
    whatsapp: tail(process.env.PYTHIA_DRIVE_FOLDER_WHATSAPP),
    drive: tail(process.env.PYTHIA_DRIVE_FOLDER_DRIVE),
  };

  // What can the service account actually see in those folders?
  let diagnostic: unknown;
  try {
    diagnostic = await diagnose();
  } catch (e) {
    diagnostic = { error: e instanceof Error ? e.message : String(e) };
  }

  let liveRun: unknown;
  try {
    const { run } = await runChannelIngestion();
    liveRun = { status: run.status, created: run.created, notes: run.notes };
  } catch (e) {
    liveRun = { threw: true, error: e instanceof Error ? e.message : String(e) };
  }

  const reads: Record<string, unknown> = {};
  try {
    const everything = await listSignals();
    const byCampaign: Record<string, { total: number; channel: number }> = {};
    for (const s of everything) {
      const b = (byCampaign[s.campaignId] ??= { total: 0, channel: 0 });
      b.total++;
      if (s.origin === 'channel') b.channel++;
    }
    reads.total = everything.length;
    reads.byCampaign = byCampaign;
  } catch (e) {
    reads.error = e instanceof Error ? e.message : String(e);
  }

  return NextResponse.json({ reset, ids, envFolders, diagnostic, liveRun, reads });
}
