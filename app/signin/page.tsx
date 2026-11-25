'use client';

/**
 * Sign-in surface for the per-org accounts system (Better Auth magic-link).
 *
 * Deliberately dual-purpose so it can be verified on a PREVIEW deploy before the
 * middleware gate is switched from the shared password to Better Auth (plan A3):
 *   - No active session -> show the email form and request a magic link.
 *   - Active session     -> show who you are signed in as and which orgs you
 *                           belong to. That proves the whole magic-link + org
 *                           round trip without flipping the production gate.
 *
 * Self-guards: if accounts are disabled the /api/auth/* calls 503 and the error
 * is surfaced inline, so visiting this page in legacy password mode is harmless.
 */

import { useEffect, useState, type FormEvent } from 'react';
import { authClient } from '@/lib/auth-client';

type Org = { id: string; name: string; slug: string };

/**
 * The destination rides through the magic link as base64url ("to=…"): Better
 * Auth only accepts a callbackURL whose query uses [A-Za-z0-9-._+/=&%@] AFTER
 * decoding it once, so a raw "?campaign=…" inside it is rejected
 * (INVALID_CALLBACK_URL). base64url uses only letters, digits, "-" and "_".
 */
function encodeDest(path: string): string {
  return btoa(unescape(encodeURIComponent(path))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function decodeDest(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const b64 = raw.replace(/-/g, '+').replace(/_/g, '/');
    return decodeURIComponent(escape(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))));
  } catch {
    return null;
  }
}

/** Only same-site paths, never back to /signin itself (no open redirects). */
function safeNext(raw: string | null): string | null {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/signin')) return null;
  return raw;
}

const ERROR_TEXT: Record<string, string> = {
  INVALID_TOKEN:
    'That sign-in link was already used or has expired (links work once, for 5 minutes). If you’re signed in below, just continue; otherwise send yourself a new link.',
  EXPIRED_TOKEN: 'That sign-in link has expired. Send yourself a new one below.',
};

const GROUND = '#F7F5FB';
const INK = '#1F1330';
const PURPLE = '#6A0FC2';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loaded, setLoaded] = useState(false);
  // Where to go after signing in (the page they originally opened), and any
  // error the sign-in link came back with.
  const [next, setNext] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const qs = new URLSearchParams(window.location.search);
    // From the sign-in gate (?next=/path) or back from the magic link (?to=base64url).
    const dest = safeNext(qs.get('next')) ?? safeNext(decodeDest(qs.get('to')));
    setNext(dest);
    const err = qs.get('error');
    if (err) setLinkError(ERROR_TEXT[err] ?? 'That sign-in link didn’t work. Send yourself a new one below.');
    (async () => {
      try {
        const { data } = await authClient.getSession();
        if (cancelled) return;
        if (data?.user) {
          // Pre-approved for a client org? Join it (even if this
          // account already has another org), make it active, and go straight to its boards.
          try {
            const r = await fetch('/api/org/auto-join', { method: 'POST' });
            const j = (await r.json().catch(() => ({}))) as { joined?: boolean; next?: string };
            if (!cancelled && j.joined) {
              window.location.href = dest ?? (j.next && j.next.startsWith('/') ? j.next : '/operator/onboarding');
              return;
            }
          } catch {
            /* not pre-approved, or accounts off: carry on */
          }
          setSessionEmail(data.user.email);
          setActiveOrgId(
            (data.session as { activeOrganizationId?: string | null } | undefined)
              ?.activeOrganizationId ?? null
          );
          const list = await authClient.organization.list();
          const orgList = (list.data ?? []) as Org[];
          if (!cancelled) setOrgs(orgList);
          // Brand-new user with no org yet: send them to create one.
          if (!cancelled && orgList.length === 0) {
            window.location.href = '/operator/create-org';
            return;
          }
          // If no active org yet, default to the first membership so the
          // operator lands in their own org (single-org is the common case).
          const activeNow =
            (data.session as { activeOrganizationId?: string | null } | undefined)
              ?.activeOrganizationId ?? null;
          if (!cancelled && !activeNow && orgList.length > 0) {
            await authClient.organization.setActive({ organizationId: orgList[0].id });
            if (!cancelled) setActiveOrgId(orgList[0].id);
          }
          // Signed in with an org and a page to return to: go straight there.
          if (!cancelled && dest && orgList.length > 0) {
            window.location.href = dest;
            return;
          }
        }
      } catch {
        // accounts likely disabled; treat as signed out
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function requestLink(e: FormEvent) {
    e.preventDefault();
    setStatus('sending');
    setMessage('');
    const { error } = await authClient.signIn.magicLink({
      email: email.trim(),
      // Come back here after the link is clicked, still remembering the destination.
      callbackURL: next ? `/signin?to=${encodeDest(next)}` : '/signin',
    });
    if (error) {
      setStatus('error');
      setMessage(error.message ?? 'Could not send the sign-in link. Accounts may not be enabled on this deploy.');
    } else {
      setStatus('sent');
      setMessage('Check your email for a sign-in link. It expires shortly and can be used once.');
    }
  }

  async function signOut() {
    await authClient.signOut();
    setSessionEmail(null);
    setOrgs([]);
    setActiveOrgId(null);
    setStatus('idle');
    setMessage('');
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: GROUND,
        color: INK,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: 'var(--font-sans, system-ui, sans-serif)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: '#fff',
          border: '1px solid rgba(31,19,48,0.08)',
          borderRadius: 16,
          padding: 32,
          boxShadow: '0 1px 3px rgba(31,19,48,0.06)',
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 4px' }}>Pythia sign-in</h1>

        {!loaded && <p style={{ color: 'rgba(31,19,48,0.6)' }}>Checking your session…</p>}

        {loaded && sessionEmail && (
          <div>
            <p style={{ margin: '12px 0 4px' }}>
              Signed in as <strong>{sessionEmail}</strong>.
            </p>
            <p style={{ margin: '0 0 12px', color: 'rgba(31,19,48,0.7)' }}>
              Active organization: <strong>{activeOrgId ?? 'none yet'}</strong>
            </p>
            <p style={{ margin: '0 0 6px', fontWeight: 600 }}>Your organizations</p>
            {orgs.length === 0 ? (
              <p style={{ margin: '0 0 16px', color: 'rgba(31,19,48,0.6)' }}>
                None yet. An org is created for you by the seed step or an invitation.
              </p>
            ) : (
              <ul style={{ margin: '0 0 16px', paddingLeft: 18 }}>
                {orgs.map((o) => (
                  <li key={o.id} style={{ marginBottom: 6 }}>
                    {o.name}{' '}
                    <span style={{ color: 'rgba(31,19,48,0.5)' }}>({o.slug})</span>
                    {activeOrgId === o.id ? (
                      <span style={{ marginLeft: 8, color: PURPLE, fontWeight: 600 }}>
                        · active
                      </span>
                    ) : (
                      <button
                        onClick={async () => {
                          await authClient.organization.setActive({ organizationId: o.id });
                          setActiveOrgId(o.id);
                        }}
                        style={{
                          marginLeft: 8,
                          background: 'transparent',
                          color: PURPLE,
                          border: `1px solid ${PURPLE}`,
                          borderRadius: 8,
                          padding: '2px 8px',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Use this org
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <a
              href={next ?? '/operator/onboarding'}
              style={{
                display: 'inline-block',
                marginRight: 10,
                background: PURPLE,
                color: '#fff',
                border: `1px solid ${PURPLE}`,
                borderRadius: 10,
                padding: '8px 14px',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Continue to Pythia →
            </a>
            <button
              onClick={signOut}
              style={{
                background: 'transparent',
                color: PURPLE,
                border: `1px solid ${PURPLE}`,
                borderRadius: 10,
                padding: '8px 14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Sign out
            </button>
          </div>
        )}

        {loaded && !sessionEmail && (
          <form onSubmit={requestLink}>
            <p style={{ margin: '10px 0 16px', color: 'rgba(31,19,48,0.7)' }}>
              Enter your email and we will send you a one-time sign-in link. There is no password.
            </p>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.org"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid rgba(31,19,48,0.2)',
                marginBottom: 12,
                fontSize: 15,
              }}
            />
            <button
              type="submit"
              disabled={status === 'sending'}
              style={{
                width: '100%',
                background: PURPLE,
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                padding: '11px 14px',
                fontWeight: 600,
                fontSize: 15,
                cursor: status === 'sending' ? 'default' : 'pointer',
                opacity: status === 'sending' ? 0.7 : 1,
              }}
            >
              {status === 'sending' ? 'Sending…' : 'Send sign-in link'}
            </button>
          </form>
        )}

        {linkError && !message && (
          <p style={{ marginTop: 14, fontSize: 14, color: '#8A1A2B' }}>{linkError}</p>
        )}

        {message && (
          <p
            style={{
              marginTop: 14,
              fontSize: 14,
              color: status === 'error' ? '#8A1A2B' : 'rgba(31,19,48,0.75)',
            }}
          >
            {message}
          </p>
        )}
      </div>
    </main>
  );
}
