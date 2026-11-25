'use client';

/**
 * "Create your organization" — the self-serve onboarding step (plan A5).
 *
 * Shown to a signed-in user who has no org yet. They name their org and enter
 * an invite code; on success we land them in the data step. If they already
 * have an org, we send them straight into the app.
 */

import { useEffect, useState, type FormEvent } from 'react';
import { authClient } from '@/lib/auth-client';

const GROUND = '#F7F5FB';
const INK = '#1F1330';
const PURPLE = '#6A0FC2';
const NEXT = '/operator/onboarding';

export default function CreateOrgPage() {
  const [checking, setChecking] = useState(true);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await authClient.getSession();
        if (cancelled) return;
        if (!data?.user) {
          window.location.href = '/signin';
          return;
        }
        const list = await authClient.organization.list();
        if (cancelled) return;
        const orgs = (list.data ?? []) as { id: string }[];
        // Pre-approved for a client org? Join it and go straight in.
        if (orgs.length === 0) {
          const r = await fetch('/api/org/auto-join', { method: 'POST' }).catch(() => null);
          const j = r ? ((await r.json().catch(() => ({}))) as { joined?: boolean; next?: string }) : {};
          if (cancelled) return;
          if (j.joined) {
            window.location.href = j.next && j.next.startsWith('/') ? j.next : NEXT;
            return;
          }
        }
        if (orgs.length > 0) {
          const active =
            (data.session as { activeOrganizationId?: string | null } | undefined)
              ?.activeOrganizationId ?? null;
          if (!active) {
            try {
              await authClient.organization.setActive({ organizationId: orgs[0].id });
            } catch {
              /* non-fatal */
            }
          }
          window.location.href = NEXT;
          return;
        }
      } catch {
        /* accounts disabled or signed out — show the form, submit will guide */
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/org/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), inviteCode: code.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; next?: string };
      if (!res.ok) {
        setError(data.error ?? 'Could not create your organization.');
        setBusy(false);
        return;
      }
      // Client-org codes send members straight to their boards.
      window.location.href = data.next && data.next.startsWith('/') ? data.next : NEXT;
    } catch {
      setError('Something went wrong. Please try again.');
      setBusy(false);
    }
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
          maxWidth: 440,
          background: '#fff',
          border: '1px solid rgba(31,19,48,0.08)',
          borderRadius: 16,
          padding: 32,
          boxShadow: '0 1px 3px rgba(31,19,48,0.06)',
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 4px' }}>
          Create your organization
        </h1>
        {checking ? (
          <p style={{ color: 'rgba(31,19,48,0.6)', marginTop: 12 }}>One moment…</p>
        ) : (
          <form onSubmit={submit}>
            <p style={{ margin: '10px 0 18px', color: 'rgba(31,19,48,0.7)' }}>
              This is your private workspace — only your team will see its data. Enter a
              name and the invite code you were given. If your code is for an organization that
              already exists, you’ll join it.
            </p>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Organization name
            </label>
            <input
              id="org-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Kahuku Community Alliance"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid rgba(31,19,48,0.2)',
                marginBottom: 16,
                fontSize: 15,
              }}
            />
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Invite code
            </label>
            <input
              id="invite-code"
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter your invite code"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid rgba(31,19,48,0.2)',
                marginBottom: 18,
                fontSize: 15,
              }}
            />
            <button
              type="submit"
              disabled={busy}
              style={{
                width: '100%',
                background: PURPLE,
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                padding: '11px 14px',
                fontWeight: 600,
                fontSize: 15,
                cursor: busy ? 'default' : 'pointer',
                opacity: busy ? 0.7 : 1,
              }}
            >
              {busy ? 'Creating…' : 'Create organization'}
            </button>
            {error && (
              <p style={{ marginTop: 14, fontSize: 14, color: '#8A1A2B' }}>{error}</p>
            )}
          </form>
        )}
      </div>
    </main>
  );
}
