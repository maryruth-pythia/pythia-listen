'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import Wordmark from '@/components/Wordmark';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') ?? '/';
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setErr('That password did not match. Try again.');
        setBusy(false);
        return;
      }
      router.push(next);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium text-ink">Shared password</span>
        <input
          type="password"
          autoFocus
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-md border border-brand-rule p-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </label>

      {err && (
        <p className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-800">
          {err}
        </p>
      )}

      <button
        type="submit"
        disabled={busy || password.length === 0}
        className="rounded-md bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
      >
        {busy ? '…' : 'Enter'}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-24">
      <header className="mb-8">
        <div className="mb-3">
          <Wordmark size={24} />
        </div>
        <div className="mb-3 h-1 w-12 rounded-full bg-pythia-gradient" />
        <h1 className="font-serif text-2xl font-semibold text-brand-dark">
          Team access
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          This Pythia instance is gated to the team and invited testers. Enter
          the shared password to continue.
        </p>
      </header>

      <Suspense
        fallback={<p className="text-sm text-ink-muted">Loading…</p>}
      >
        <LoginForm />
      </Suspense>

      <footer className="mt-10 border-t border-brand-rule pt-4 text-xs leading-relaxed text-ink-subtle">
        <p>
          If you don&rsquo;t have the password, ask the Pythia team. We don&rsquo;t share
          access publicly while we&rsquo;re piloting.
        </p>
      </footer>
    </main>
  );
}
