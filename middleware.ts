import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/pw-session';
import { getSessionCookie } from 'better-auth/cookies';

/**
 * Password gate. Anyone visiting any non-login URL must have a valid
 * pythia-auth cookie matching PYTHIA_PASSWORD.
 *
 * If PYTHIA_PASSWORD is unset (e.g., misconfigured deploy), the gate
 * fails closed: every request 503s with a clear instruction. This prevents
 * accidental "open to the world" deploys.
 *
 * NOTE: the per-org accounts system (Better Auth) is being introduced behind
 * the AUTH_MODE flag. Its endpoints under /api/auth/* are allow-listed here so
 * they are reachable; they self-503 when accounts are disabled. Switching this
 * gate from the shared password to the Better Auth session is a later, flagged
 * step (see claude/pythia-accounts-multitenancy-plan.md, phase A3).
 */
export async function middleware(req: NextRequest) {
  const url = new URL(req.url);

  // Always allow login routes and the health endpoint (handy for uptime checks).
  if (
    url.pathname === '/login' ||
    url.pathname === '/api/login' ||
    url.pathname === '/api/logout' ||
    url.pathname === '/api/health' ||
    // Per-org accounts sign-in surfaces (Better Auth). Reachable before the
    // gate is switched from the shared password to accounts (plan A3). They
    // self-guard: the /api/auth/* calls they make 503 while AUTH_MODE is off.
    url.pathname === '/signin' ||
    url.pathname.startsWith('/accept-invitation/') ||
    // Better Auth endpoints (per-org accounts). Reachable, but self-guard: they
    // 503 while AUTH_MODE !== 'accounts'. Sign-in itself is handled here.
    url.pathname.startsWith('/api/auth/') ||
    // Ingestion endpoints are reached by Vercel Cron (no login cookie). They
    // are NOT open: the routes self-guard, requiring a valid operator cookie
    // OR the CRON secret before doing anything.
    url.pathname === '/api/ingest/civic' ||
    url.pathname === '/api/ingest/channels' ||
    // Early-warning watch (daily check + weekly digest). Self-guarded the same way.
    url.pathname === '/api/watch/run' ||
    url.pathname === '/api/watch/digest' ||
    // Public survey: respondents answer without a login. The public paths are
    // read/submit only; publishing lives under /api/agents/* and stays gated.
    url.pathname.startsWith('/s/') ||
    url.pathname.startsWith('/api/surveys/') ||
    // Public read-only text-to-speech so respondents can hear questions aloud
    // without logging in (text in, audio out).
    url.pathname === '/api/tts'
  ) {
    return NextResponse.next();
  }

  // Per-org accounts mode: gate on the Better Auth session cookie instead of
  // the shared password, so magic-link users reach the app without it. Coarse
  // presence check only (edge-safe); pages/routes still verify the session and
  // enforce org scoping. Password mode (production) is unchanged below.
  if (process.env.AUTH_MODE === 'accounts') {
    const sessionCookie = getSessionCookie(req);
    if (!sessionCookie) {
      // Remember where they were going, so sign-in brings them back to the
      // exact link they opened (e.g. a shared dashboard) instead of onboarding.
      const signinUrl = new URL('/signin', req.url);
      if (url.pathname !== '/') signinUrl.searchParams.set('next', url.pathname + url.search);
      return NextResponse.redirect(signinUrl);
    }
    return NextResponse.next();
  }

  const expected = process.env.PYTHIA_PASSWORD;
  if (!expected) {
    return new NextResponse(
      'Pythia is misconfigured: PYTHIA_PASSWORD env var is not set. ' +
        'Set it in your .env.local (local) or Vercel project env vars (production).',
      { status: 503, headers: { 'content-type': 'text/plain' } }
    );
  }

  const cookie = req.cookies.get('pythia-auth')?.value;
  const valid = await verifySession(cookie, expected);
  if (!valid) {
    const loginUrl = new URL('/login', req.url);
    if (url.pathname !== '/') {
      loginUrl.searchParams.set('next', url.pathname + url.search);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

/**
 * matcher: run on every path EXCEPT static asset paths and the Next.js
 * internals. Keeps middleware overhead off CSS/JS/font requests.
 */
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.).*)'],
};
