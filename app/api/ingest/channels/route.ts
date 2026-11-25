/**
 * Channel ingestion endpoint (Drive-backed email/WhatsApp/Drive folders).
 * - POST: operator "Refresh channels" (cookie auth).
 * - GET:  scheduled refresh (cron Bearer secret).
 * Allow-listed in middleware; self-guards like the civic route.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/pw-session';
import { runChannelIngestion } from '@/lib/ingest/channels';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function authorized(req: NextRequest): Promise<boolean> {
  const cookie = req.cookies.get('pythia-auth')?.value;
  const pw = process.env.PYTHIA_PASSWORD;
  if (pw && (await verifySession(cookie, pw))) return true;
  const secret = process.env.PYTHIA_CRON_SECRET ?? process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') === `Bearer ${secret}`) return true;
  return false;
}

async function run() {
  const { run, remaining } = await runChannelIngestion();
  return NextResponse.json({ ok: run.status !== 'error', run, remaining });
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
