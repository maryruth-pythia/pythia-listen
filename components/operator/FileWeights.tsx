'use client';

import { useEffect, useMemo, useState } from 'react';

interface Row {
  fileKey: string;
  name: string;
  sourceType: string;
  count: number;
  salience: number;
}

const MAX_SHOWN = 100;

/**
 * Weight individual already-uploaded files. One row per file (a transcript that
 * produced many signals shows once); the weight applies to all of that file's
 * signals. Search by filename, set a weight, save — updates salience directly,
 * takes effect on the next dashboard load, and is remembered across re-ingests.
 */
export default function FileWeights({ campaignId }: { campaignId: string }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [edits, setEdits] = useState<Record<string, number>>({});
  const [q, setQ] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const res = await fetch(
          `/api/signal-weights?campaign=${encodeURIComponent(campaignId)}`,
          { cache: 'no-store' }
        );
        const data = await res.json();
        if (!live) return;
        if (!res.ok) {
          setError(data?.error ?? 'Could not load files.');
          setRows([]);
          return;
        }
        setRows(data.rows ?? []);
      } catch {
        if (live) {
          setError('Network error loading files.');
          setRows([]);
        }
      }
    })();
    return () => {
      live = false;
    };
  }, [campaignId]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const term = q.trim().toLowerCase();
    return term
      ? rows.filter(
          (r) =>
            r.name.toLowerCase().includes(term) ||
            r.sourceType.toLowerCase().includes(term)
        )
      : rows;
  }, [rows, q]);

  const shown = filtered.slice(0, MAX_SHOWN);
  const dirtyCount = Object.keys(edits).length;

  function setWeight(fileKey: string, value: number) {
    setEdits((e) => ({ ...e, [fileKey]: value }));
    setSaved(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(null);
    try {
      const updates = Object.entries(edits).map(([fileKey, salience]) => ({
        fileKey,
        salience,
      }));
      const res = await fetch('/api/signal-weights', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ campaignId, updates }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? 'Could not save.');
        return;
      }
      setRows((r) =>
        (r ?? []).map((row) =>
          row.fileKey in edits ? { ...row, salience: edits[row.fileKey] } : row
        )
      );
      setEdits({});
      setSaved(
        `Updated ${data.files ?? 0} file${data.files === 1 ? '' : 's'} (${data.updated} signal${data.updated === 1 ? '' : 's'}).`
      );
    } catch {
      setError('Network error saving.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-lg border border-brand-rule bg-white p-4">
      <h3 className="mb-1 font-serif text-base font-semibold text-brand-dark">
        Weight individual files
      </h3>
      <p className="mb-3 text-sm text-ink-muted">
        Boost specific already-uploaded files so they carry more weight than the
        rest — search for your interview transcripts and raise them. One row per
        file; the weight applies to all of that file&rsquo;s signals. Takes
        effect on the next dashboard load; no re-ingest needed.
      </p>

      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search files by name…"
        className="mb-3 w-full rounded-md border border-brand-rule px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
      />

      {rows === null ? (
        <p className="text-sm text-ink-subtle">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-ink-subtle">
          {q.trim() ? 'No files match your search.' : 'No files yet.'}
        </p>
      ) : (
        <>
          <div className="flex max-h-80 flex-col gap-1 overflow-y-auto">
            {shown.map((row) => {
              const val = edits[row.fileKey] ?? row.salience;
              return (
                <div
                  key={row.fileKey}
                  className="flex items-center gap-3 border-b border-brand-rule/40 py-1"
                >
                  <span className="min-w-0 flex-1 truncate text-sm text-ink" title={row.name}>
                    {row.name}
                    <span className="ml-2 text-xs text-ink-subtle">
                      {row.sourceType.replace(/^channel_/, '')} · {row.count} signal
                      {row.count === 1 ? '' : 's'}
                    </span>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={val}
                    onChange={(e) => setWeight(row.fileKey, Number(e.target.value))}
                    className="w-32"
                  />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={val}
                    onChange={(e) => setWeight(row.fileKey, Number(e.target.value))}
                    className="w-16 rounded-md border border-brand-rule px-2 py-1 text-sm text-ink focus:border-brand focus:outline-none"
                  />
                </div>
              );
            })}
          </div>
          {filtered.length > MAX_SHOWN && (
            <p className="mt-2 text-xs text-ink-subtle">
              Showing {MAX_SHOWN} of {filtered.length} files. Narrow the search to
              see the rest.
            </p>
          )}
        </>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={save}
          disabled={saving || dirtyCount === 0}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? 'Saving…' : `Save${dirtyCount ? ` (${dirtyCount})` : ''}`}
        </button>
        {saved && <span className="text-sm" style={{ color: '#2F6B3C' }}>{saved}</span>}
        {error && <span className="text-sm text-[#B23A2E]">{error}</span>}
      </div>
    </section>
  );
}
