'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Operator-triggered "Refresh now" for civic-record ingestion.
 * POSTs to the gated ingestion route (cookie auth) and reloads the page.
 */
export default function CivicRefreshButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function refresh() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/ingest/civic', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data?.error ? `Error: ${data.error}` : 'Refresh failed.');
      } else {
        // The route returns { ok, results: [{ seedInserted, run:{created,updated,status} }] }.
        // Sum across passes — the old code read data.run.* (which never exists),
        // so it always printed "0 new" regardless of what actually happened.
        type Res = {
          seedInserted?: number;
          run?: { created?: number; updated?: number; status?: string };
        };
        const results: Res[] = Array.isArray(data?.results) ? data.results : [];
        const seeded = results.reduce((n, r) => n + (r?.seedInserted ?? 0), 0);
        const created = results.reduce((n, r) => n + (r?.run?.created ?? 0), 0);
        const refreshed = results.reduce((n, r) => n + (r?.run?.updated ?? 0), 0);
        const anyErr = results.some((r) => r?.run?.status === 'error');
        const added = seeded + created;
        if (anyErr && added === 0) {
          setMsg('Baseline confirmed; live web search was unavailable this run.');
        } else if (added === 0) {
          setMsg('Synced — baseline already complete (nothing new to add).');
        } else {
          setMsg(`Synced — ${added} new, ${refreshed} refreshed.`);
        }
        router.refresh();
      }
    } catch {
      setMsg('Refresh failed (network).');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={refresh}
        disabled={busy}
        className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-dark disabled:opacity-50"
      >
        {busy ? 'Syncing…' : 'Refresh now'}
      </button>
      {msg && <span className="text-xs text-ink-muted">{msg}</span>}
    </div>
  );
}
