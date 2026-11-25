'use client';

import { useEffect, useState } from 'react';

interface Row {
  channel: string;
  weight: number;
}

/**
 * Source weighting. Signals from higher-weighted channels (folders) rise to the
 * top of the dashboard AND are preferentially fed into the AI analysis, so
 * high-signal sources like interview transcripts / Discovery shape the read more
 * than routine documents. Applies to ALL Projects (weighting is by source, not
 * per-Project). Editing takes effect on the next ingest.
 */
export default function ChannelWeights() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [base, setBase] = useState(45);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const res = await fetch('/api/channel-weights', { cache: 'no-store' });
        const data = await res.json();
        if (!live) return;
        if (!res.ok) {
          setError(data?.error ?? 'Could not load weights.');
          setRows([]);
          return;
        }
        setBase(data.default ?? 45);
        setRows(data.channels ?? []);
      } catch {
        if (live) {
          setError('Network error loading weights.');
          setRows([]);
        }
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  function setWeight(channel: string, value: number) {
    setRows((r) =>
      (r ?? []).map((row) => (row.channel === channel ? { ...row, weight: value } : row))
    );
    setSaved(false);
  }

  async function save() {
    if (!rows) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const weights: Record<string, number> = {};
      for (const row of rows) weights[row.channel] = row.weight;
      const res = await fetch('/api/channel-weights', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ weights }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? 'Could not save.');
        return;
      }
      setSaved(true);
    } catch {
      setError('Network error saving.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-lg border border-brand-rule bg-white p-4">
      <h3 className="mb-1 font-serif text-base font-semibold text-brand-dark">
        Source weighting
      </h3>
      <p className="mb-3 text-sm text-ink-muted">
        How much each source counts. Higher-weighted sources rise to the top of
        the dashboard and shape the AI analysis more — so direct signal like
        interview transcripts or a Discovery folder can outweigh routine
        documents. This applies across all Projects; changes take effect on the
        next refresh.
      </p>

      {rows === null ? (
        <p className="text-sm text-ink-subtle">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-ink-subtle">
          No sources yet. Once a Project ingests from a channel folder, it appears
          here to weight.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((row) => (
            <div key={row.channel} className="flex items-center gap-3">
              <label
                htmlFor={`w-${row.channel}`}
                className="w-40 text-sm text-ink"
              >
                {row.channel}
              </label>
              <input
                id={`w-${row.channel}`}
                type="range"
                min={0}
                max={100}
                value={row.weight}
                onChange={(e) => setWeight(row.channel, Number(e.target.value))}
                className="flex-1"
              />
              <input
                type="number"
                min={0}
                max={100}
                value={row.weight}
                onChange={(e) => setWeight(row.channel, Number(e.target.value))}
                className="w-16 rounded-md border border-brand-rule px-2 py-1 text-sm text-ink focus:border-brand focus:outline-none"
              />
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={save}
          disabled={saving || !rows || rows.length === 0}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save weighting'}
        </button>
        {saved && <span className="text-sm" style={{ color: '#2F6B3C' }}>Saved.</span>}
        {error && <span className="text-sm text-[#B23A2E]">{error}</span>}
      </div>
      <p className="mt-2 text-xs text-ink-subtle">
        Default weight is {base}. Put high-signal material (e.g. interviews) in
        its own Drive folder/channel, then raise its weight here.
      </p>
    </section>
  );
}
