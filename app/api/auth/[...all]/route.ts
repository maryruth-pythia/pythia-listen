/**
 * Better Auth catch-all handler. Mounts every /api/auth/* endpoint.
 *
 * When accounts are disabled (legacy password mode) there is no auth instance,
 * so we 503 rather than crash — the app keeps running on the password gate.
 */

import { NextResponse } from 'next/server';
import { toNextJsHandler } from 'better-auth/next-js';
import { auth, authEnabled } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const handlers = authEnabled && auth ? toNextJsHandler(auth) : null;

export async function GET(req: Request) {
  if (!handlers) {
    return NextResponse.json({ error: 'accounts are not enabled' }, { status: 503 });
  }
  return handlers.GET(req);
}

export async function POST(req: Request) {
  if (!handlers) {
    return NextResponse.json({ error: 'accounts are not enabled' }, { status: 503 });
  }
  return handlers.POST(req);
}
