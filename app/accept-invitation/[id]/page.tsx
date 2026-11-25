'use client';

/**
 * Accept an organization invitation (Better Auth organization plugin).
 *
 * The invite email links here with the invitation id in the path. Accepting
 * requires an active session, so:
 *   - Not signed in -> request a magic link with callbackURL back to THIS page,
 *                      so after clicking the email the user returns here signed in.
 *   - Signed in      -> accept the invitation, which adds them to the org.
 */

import { useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

const GROUND = '#F7F5FB';
const INK = '#1F1330';
const PURPLE = '#6A0FC2';

type State = 'checking' | 'need-signin' | 'ready' | 'accepting' | 'done' | 'error';

export default function AcceptInvitationPage() {
  const params = useParams<{ id: string }>();
  const invitationId = params?.id ?? '';
  const [state, setState] = useState<State>('checking');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await authClient.getSession();
        if (cancelled) return;
        setState(data?.user ? 'ready' : 'need-signin');
      } catch {
        if (!cancelled) setState('need-signin');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function accept() {
    setState('accepting');
    setMessage('');
    const { error } = await authClient.organization.acceptInvitation({ invitationId });
    if (error) {
      setState('error');
      setMessage(error.message ?? 'Could not accept the invitation. It may have expired.');
    } else {
      setState('done');
    }
  }

  async function requestLink(e: FormEvent) {
    e.preventDefault();
    setMessage('');
    const { error } = await authClient.signIn.magicLink({
      email: email.trim(),
      callbackURL: `/accept-invitation/${invitationId}`,
    });
    setMessage(
      error
        ? error.message ?? 'Could not send the sign-in link.'
        : 'Check your email for a sign-in link. Clicking it brings you back here to accept.'
    );
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
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 12px' }}>Join your team on Pythia</h1>

        {state === 'checking' && <p style={{ color: 'rgba(31,19,48,0.6)' }}>Checking your session…</p>}

        {state === 'need-signin' && (
          <form onSubmit={requestLink}>
            <p style={{ margin: '0 0 16px', color: 'rgba(31,19,48,0.7)' }}>
              Sign in with the email your invitation was sent to. We will send a one-time link and
              bring you back here to accept.
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
              style={{
                width: '100%',
                background: PURPLE,
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                padding: '11px 14px',
                fontWeight: 600,
                fontSize: 15,
                cursor: 'pointer',
              }}
            >
              Send sign-in link
            </button>
          </form>
        )}

        {state === 'ready' && (
          <div>
            <p style={{ margin: '0 0 16px', color: 'rgba(31,19,48,0.7)' }}>
              You are signed in. Accept the invitation to join the organization.
            </p>
            <button
              onClick={accept}
              style={{
                width: '100%',
                background: PURPLE,
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                padding: '11px 14px',
                fontWeight: 600,
                fontSize: 15,
                cursor: 'pointer',
              }}
            >
              Accept invitation
            </button>
          </div>
        )}

        {state === 'accepting' && <p style={{ color: 'rgba(31,19,48,0.6)' }}>Accepting…</p>}

        {state === 'done' && (
          <p style={{ color: INK }}>
            You are in. You can close this page and open Pythia — you now have access to your team&apos;s
            projects.
          </p>
        )}

        {message && (
          <p
            style={{
              marginTop: 14,
              fontSize: 14,
              color: state === 'error' ? '#8A1A2B' : 'rgba(31,19,48,0.75)',
            }}
          >
            {message}
          </p>
        )}
      </div>
    </main>
  );
}
