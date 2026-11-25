'use client';

import { useState } from 'react';

interface Verdict {
  section: string;
  claim: string;
  verdict: 'grounded' | 'thin' | 'unsupported';
  reason: string;
}
interface Result {
  checked: number;
  grounded: number;
  thin: number;
  unsupported: number;
  items: Verdict[];
  note?: string;
}

const V: Record<Verdict['verdict'], { label: string; color: string }> = {
  grounded: { label: 'Grounded', color: '#3E8E6E' },
  thin: { label: 'Thin', color: '#C77D2A' },
  unsupported: { label: 'Unsupported', color: '#B23A2E' },
};

export default function RedTeam({ campaignId }: { campaignId: string }) {
  const [running, setRunning] = useState(false);
  const [res, setRes] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState<Record<number, boolean>>({});
  const [applying, setApplying] = useState<number | null>(null);

  async function applyTune(i: number, it: Verdict) {
    const isGap = it.section.toLowerCase().includes('missing');
    const field = isGap ? 'analysisFocus' : 'exclusions';
    const text = isGap
      ? `Actively seek and surface this under-represented voice: ${it.claim}`
      : it.verdict === 'unsupported'
        ? `Remove this claim entirely — it is not supported by the signals: ${it.claim}`
        : `Do not assert this unless the signals clearly support it: ${it.claim}`;
    setApplying(i);
    try {
      const r = await fetch(`/api/manage/campaigns/${campaignId}/tune`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ field, text }),
      });
      if (r.ok) setApplied((a) => ({ ...a, [i]: true }));
    } finally {
      setApplying(null);
    }
  }

  async function run() {
    setRunning(true);
    setError(null);
    try {
      const r = await fetch('/api/redteam', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ campaignId }),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error ?? 'Red-team failed.');
        return;
      }
      setRes(d);
    } catch {
      setError('Network error running the red-team.');
    } finally {
      setRunning(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={run}
          disabled={running}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {running ? 'Auditing every claim…' : res ? 'Re-run check' : 'Run hallucination check'}
        </button>
        {res && !running && (
          <span className="text-sm text-ink-muted">
            {res.checked} claims checked ·{' '}
            <span style={{ color: V.grounded.color }}>{res.grounded} grounded</span> ·{' '}
            <span style={{ color: V.thin.color }}>{res.thin} thin</span> ·{' '}
            <span style={{ color: V.unsupported.color, fontWeight: res.unsupported ? 600 : 400 }}>
              {res.unsupported} unsupported
            </span>
          </span>
        )}
        {error && <span className="text-sm text-[#B23A2E]">{error}</span>}
      </div>

      {res?.note && <p className="mt-2 text-sm text-ink-subtle">{res.note}</p>}

      {res && res.items.length > 0 && (
        <div className="mt-3 flex flex-col gap-1.5">
          {res.unsupported === 0 && (
            <p className="mb-1 text-sm" style={{ color: V.grounded.color }}>
              No unsupported claims — every AI statement traces back to the signals.
            </p>
          )}
          {res.items.map((it, i) => {
            const v = V[it.verdict];
            return (
              <div
                key={i}
                className="rounded-lg border border-brand-rule bg-white p-3"
                style={{ borderLeft: `3px solid ${v.color}` }}
              >
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span
                    className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold text-white"
                    style={{ background: v.color }}
                  >
                    {v.label}
                  </span>
                  <span className="text-xs text-ink-subtle">{it.section}</span>
                </div>
                <p className="text-sm text-ink">{it.claim}</p>
                {it.reason && (
                  <p className="mt-1 text-xs text-ink-muted">
                    <span className="font-medium">Auditor:</span> {it.reason}
                  </p>
                )}
                {it.verdict !== 'grounded' &&
                  (applied[i] ? (
                    <p className="mt-2 text-xs font-medium" style={{ color: V.grounded.color }}>
                      {it.verdict === 'unsupported' ? '✓ Removed — this section will recompute without it.' : '✓ Applied — this section will recompute without it.'}
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => applyTune(i, it)}
                      disabled={applying === i}
                      className="mt-2 rounded-md border px-2.5 py-1 text-xs font-medium disabled:opacity-50"
                      style={{ borderColor: v.color, color: v.color }}
                    >
                      {applying === i
                        ? (it.verdict === 'unsupported' ? 'Removing…' : 'Applying…')
                        : it.section.toLowerCase().includes('missing')
                          ? 'Add as a gap to seek →'
                          : it.verdict === 'unsupported'
                            ? 'Remove from the analysis →'
                            : 'Apply as a tune →'}
                    </button>
                  ))}
              </div>
            );
          })}
        </div>
      )}

      {!res && !running && (
        <p className="mt-2 text-xs text-ink-subtle">
          Runs a skeptical second model over every AI-written claim on this
          dashboard and re-checks it against the raw signals — so nothing here is
          taken on faith.
        </p>
      )}
    </div>
  );
}
