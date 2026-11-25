'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Operator-triggered "Refresh channels". Each request processes a bounded
 * batch of files (to stay under the serverless time limit), so this loops
 * automatically until the folders are fully drained, showing progress.
 */
export default function ChannelsRefreshButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function refresh() {
    setBusy(true);
    setMsg('Reading folders…');
    let totalNew = 0;
    let guard = 0;
    try {
      // Drain the channels (email / WhatsApp / Drive) in bounded batches.
      while (guard < 40) {
        guard++;
        const res = await fetch('/api/ingest/channels', { method: 'POST' });
        const data = await res.json();
        if (!res.ok) {
          setMsg(data?.error ? `Error: ${data.error}` : 'Refresh failed.');
          return;
        }
        if (data?.run?.status === 'error') {
          setMsg(data.run.error ?? 'Not configured — see setup below.');
          return;
        }
        totalNew += data?.run?.created ?? 0;
        const remaining = data?.remaining ?? 0;
        router.refresh();
        if (remaining <= 0 || (data?.run?.created ?? 0) === 0) break;
        setMsg(`Ingested ${totalNew} so far · ${remaining} remaining…`);
      }

      // Same click also refreshes the cited public-record baseline + demo
      // seeds, so this one button covers new docs/messages AND public info.
      setMsg(`Ingested ${totalNew} — now refreshing the public record…`);
      let civicNew = 0;
      try {
        const cres = await fetch('/api/ingest/civic', { method: 'POST' });
        const cdata = await cres.json();
        const results = Array.isArray(cdata?.results) ? cdata.results : [];
        civicNew = results.reduce(
          (n: number, r: { seedInserted?: number; run?: { created?: number } }) =>
            n + (r?.seedInserted ?? 0) + (r?.run?.created ?? 0),
          0
        );
      } catch {
        /* keep the channel result if the civic pass fails */
      }
      setMsg(
        `Done — ${totalNew} message${totalNew !== 1 ? 's' : ''} ingested; public record refreshed${civicNew ? ` (+${civicNew} new)` : ''}.`
      );
    } catch {
      setMsg('Refresh failed (network).');
    } finally {
      setBusy(false);
      router.refresh();
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={refresh}
        disabled={busy}
        className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-dark disabled:opacity-50"
      >
        {busy ? 'Syncing…' : 'Refresh all sources'}
      </button>
      {msg && <span className="text-xs text-ink-muted">{msg}</span>}
    </div>
  );
}
