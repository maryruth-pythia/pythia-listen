import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { getSurvey, appendSurveyResponse } from '@/lib/db';
import type { SurveyResponse } from '@/lib/types';
import { rateLimit, rateLimitHit } from '@/lib/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Community-aware flood protection: a generous per-minute burst cap per IP+survey.
// It only bites machine-speed abuse — a room of people sharing one network won't
// realistically submit 20 genuine responses within the same minute. Plus payload
// caps so a single request can't bloat storage.
const SUBMIT_MAX = 20;
const SUBMIT_WINDOW_MS = 60 * 1000;
const MAX_ANSWERS = 200;
const MAX_VALUE_LEN = 4000;
const MAX_DEMO = 50;
const MAX_DEMO_LEN = 500;

// Cloudflare Turnstile server-side check. Inert unless TURNSTILE_SECRET_KEY is
// set. Fails OPEN on a network error (don't block real respondents during a
// Cloudflare outage — the per-minute flood cap still applies), CLOSED on an
// explicit failure or a missing token.
async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;
  try {
    const form = new URLSearchParams({ secret, response: token });
    if (ip && ip !== 'unknown') form.set('remoteip', ip);
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
    });
    const d = (await r.json()) as { success?: boolean };
    return d.success === true;
  } catch {
    return true;
  }
}

/** Public: submit a survey response. Anonymous by construction — coarse date
 *  only, no identity, no IP, no precise timestamp. */
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const survey = await getSurvey(params.id);
  if (!survey || survey.status !== 'published') {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  // Throttle machine-speed floods without hurting a shared community network.
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
  const rlKey = `survey:${params.id}:${ip}`;
  const gate = await rateLimit(rlKey, { max: SUBMIT_MAX, windowMs: SUBMIT_WINDOW_MS });
  if (!gate.ok) {
    return NextResponse.json(
      { error: 'Too many submissions from this connection. Please wait a minute and try again.' },
      { status: 429, headers: { 'Retry-After': String(gate.retryAfterSec) } }
    );
  }
  await rateLimitHit(rlKey, SUBMIT_WINDOW_MS);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
  const b = (body ?? {}) as { answers?: unknown; demographics?: unknown; turnstileToken?: unknown };

  // Bot check — only enforced once a Turnstile secret is configured.
  if (process.env.TURNSTILE_SECRET_KEY) {
    const token = typeof b.turnstileToken === 'string' ? b.turnstileToken : '';
    if (!(await verifyTurnstile(token, ip))) {
      return NextResponse.json({ error: 'Verification failed. Please try again.' }, { status: 403 });
    }
  }

  const answers: Record<string, string | number> = {};
  if (b.answers && typeof b.answers === 'object') {
    for (const [k, v] of Object.entries(b.answers as Record<string, unknown>)) {
      if (Object.keys(answers).length >= MAX_ANSWERS) break;
      if (typeof v === 'number') answers[k] = v;
      else if (typeof v === 'string') answers[k] = v.slice(0, MAX_VALUE_LEN);
    }
  }
  let demographics: Record<string, string> | undefined;
  if (b.demographics && typeof b.demographics === 'object') {
    demographics = {};
    for (const [k, v] of Object.entries(b.demographics as Record<string, unknown>)) {
      if (Object.keys(demographics).length >= MAX_DEMO) break;
      if (typeof v === 'string') demographics[k] = v.slice(0, MAX_DEMO_LEN);
    }
  }

  const response: SurveyResponse = {
    id: randomUUID(),
    surveyId: survey.id,
    answers,
    demographics,
    submittedDate: new Date().toISOString().slice(0, 10), // YYYY-MM-DD only
  };
  try {
    await appendSurveyResponse(response);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `submit failed: ${message}` }, { status: 500 });
  }
}
