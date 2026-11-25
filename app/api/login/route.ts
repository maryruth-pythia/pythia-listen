import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitHit, rateLimitReset } from '@/lib/ratelimit';
import { signSession } from '@/lib/pw-session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

export async function POST(req: NextRequest) {
  // Brute-force protection: throttle repeated failed logins per client IP,
  // backed by the shared DB cache so it holds across serverless instances.
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
  const rlKey = `login:${ip}`;
  const gate = await rateLimit(rlKey, { max: MAX_ATTEMPTS, windowMs: WINDOW_MS });
  if (!gate.ok) {
    return NextResponse.json(
      { ok: false, error: 'Too many attempts. Please wait a few minutes and try again.' },
      { status: 429, headers: { 'Retry-After': String(gate.retryAfterSec) } }
    );
  }

  const { password } = (await req.json()) as { password?: string };
  const expected = process.env.PYTHIA_PASSWORD;

  if (!expected) {
    return NextResponse.json(
      { ok: false, error: 'PYTHIA_PASSWORD not configured on the server.' },
      { status: 503 }
    );
  }

  if (typeof password !== 'string' || password !== expected) {
    await rateLimitHit(rlKey, WINDOW_MS);
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  await rateLimitReset(rlKey);

  const res = NextResponse.json({ ok: true });
  res.cookies.set('pythia-auth', await signSession(expected), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  });
  return res;
}
