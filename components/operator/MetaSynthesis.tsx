'use client';

import { useCallback, useEffect, useState } from 'react';
import MissingVoices from '@/components/operator/MissingVoices';
import { DEMOGRAPHICS } from '@/lib/reference/demographics';

interface Source {
  label: string;
  url?: string;
}
interface Finding {
  title: string;
  detail: string;
  sources: Source[];
}
interface MetaResult {
  summary: string;
  agreements: Finding[];
  tensions: Finding[];
  missingVoices: Finding[];
  civicCount: number;
  pythiaCount: number;
  generatedAt: string;
  note?: string;
  mode?: 'public-record';
}

type ColKey = 'agreements' | 'tensions' | 'missingVoices';

const COLUMNS: { key: ColKey; label: string; subtitle: string; icon: string; color: string; chipBg: string }[] = [
  { key: 'agreements', label: 'Shared agreement', subtitle: 'Where sources converge', icon: '✓', color: '#4F8A5C', chipBg: '#EAF3EC' },
  { key: 'tensions', label: 'Tensions', subtitle: 'Where they pull apart', icon: '⚡', color: '#C77D2A', chipBg: '#FaF0E2' },
  { key: 'missingVoices', label: 'Whose voice is missing', subtitle: 'Under-represented in the record', icon: '◑', color: '#6A0FC2', chipBg: '#F1EAF6' },
];

// Public-record boards: there's no second source to compare, so the columns read the record itself.
const PR_COLUMNS: typeof COLUMNS = [
  { ...COLUMNS[0], label: 'Common ground in the record', subtitle: 'Raised the same way by different kinds of voices' },
  { ...COLUMNS[1], label: 'Contested', subtitle: 'Where speakers, figures or commitments disagree' },
  { ...COLUMNS[2], label: 'Missing from the record', subtitle: 'Community members who are absent or thin' },
];

/** Distinct sources behind a finding (by url, else label), so readers can judge how thin it is. */
function sourceCount(f: Finding): number {
  return new Set(f.sources.map((s) => (s.url || s.label || '').trim()).filter(Boolean)).size;
}

const DOT_COLORS = ['#FCC029', '#EC2BFC', '#6A0FC2'];

const CARD: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #E7DCD0',
  borderRadius: 16,
  boxShadow: '0 1px 2px rgba(59,42,78,.05),0 6px 22px rgba(59,42,78,.07)',
};

export default function MetaSynthesis({
  campaignId,
  refreshKey,
}: {
  campaignId: string;
  /** Changes when the signal lens finishes sorting, so the synthesis reloads on views only. */
  refreshKey?: string;
}) {
  const [data, setData] = useState<MetaResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(
    (force: boolean, retry = true) => {
      setBusy(true);
      setError(null);
      // One automatic retry (after a short pause) before showing an error —
      // the first load can collide with other analyses warming up.
      const again = () => setTimeout(() => load(false, false), 8000);
      fetch('/api/synthesis/meta', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ campaignId, force }),
      })
        .then((r) => r.json())
        .then((d) => {
          const empty = !d?.error && (d?.agreements?.length ?? 0) + (d?.tensions?.length ?? 0) + (d?.missingVoices?.length ?? 0) === 0;
          if ((d?.error || empty) && retry) return void again();
          if (d?.error) setError(d.error);
          else setData(d as MetaResult);
          setBusy(false);
        })
        .catch(() => {
          if (retry) return void again();
          setError('Could not reach the synthesis service.');
          setBusy(false);
        });
    },
    [campaignId]
  );

  useEffect(() => {
    load(false);
  }, [load, refreshKey]);

  const rerun = (
    <button
      type="button"
      onClick={() => load(true)}
      disabled={busy}
      className="text-[11px] underline underline-offset-2 disabled:opacity-50"
      style={{ color: '#6A0FC2' }}
    >
      {busy ? 'Re-running…' : '↻ Re-run'}
    </button>
  );

  if (error) {
    return (
      <div className="rounded-lg p-3 text-sm" style={{ background: '#FbeceA', border: '1px solid #F0C9C4', color: '#8A2B22' }}>
        {error} {rerun}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {COLUMNS.map((col) => (
          <div key={col.key} className="p-4" style={CARD}>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 flex-none items-center justify-center rounded-lg text-[15px] font-bold" style={{ background: col.chipBg, color: col.color }}>{col.icon}</div>
              <div>
                <h3 className="font-serif text-[15px] font-semibold leading-tight" style={{ color: '#1F1330' }}>{col.label}</h3>
                <p className="text-[11px]" style={{ color: '#9A8FA6' }}>{col.subtitle}</p>
              </div>
            </div>
            <p className="mt-3 animate-pulse text-[12px]" style={{ color: '#B9A9CE' }}>Synthesizing across sources…</p>
          </div>
        ))}
      </div>
    );
  }

  const has = data.agreements.length + data.tensions.length + data.missingVoices.length > 0;
  if (!has) {
    return (
      <div className="rounded-lg p-5 text-sm" style={{ ...CARD, color: '#6A5F74' }}>
        <p>
          {data.note && !/parse_error/.test(data.note)
            ? data.note
            : data.mode === 'public-record'
              ? 'The synthesis came back empty this run. It reads the public record: common ground, what is contested, and who is missing from it.'
              : 'The synthesis came back empty this run. It reconciles the civic record with direct listening — where they agree, diverge, and whose voice is under-represented.'}
        </p>
        <p className="mt-2">{rerun}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {data.summary && <p className="text-[13px] italic" style={{ color: '#6A5F74' }}>{data.summary}</p>}
        <span className="text-[11px]" style={{ color: '#9A8FA6' }}>
          {data.mode === 'public-record' ? `Read from ${data.civicCount} public-record signals` : `${data.civicCount} civic + ${data.pythiaCount} direct signals`}
        </span>
        {rerun}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {(data.mode === 'public-record' ? PR_COLUMNS : COLUMNS).map((col) => (
          <div key={col.key} className="p-4" style={CARD}>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 flex-none items-center justify-center rounded-lg text-[15px] font-bold" style={{ background: col.chipBg, color: col.color }}>{col.icon}</div>
              <div>
                <h3 className="font-serif text-[15px] font-semibold leading-tight" style={{ color: '#1F1330' }}>{col.label}</h3>
                <p className="text-[11px]" style={{ color: '#9A8FA6' }}>{col.subtitle}</p>
              </div>
            </div>

            {col.key === 'missingVoices' && DEMOGRAPHICS[campaignId] ? (
              <MissingVoices demo={DEMOGRAPHICS[campaignId]!} findings={data.missingVoices} />
            ) : (
            <ul className="mt-2">
              {data[col.key].length === 0 && <li className="py-2 text-xs" style={{ color: '#9A8FA6' }}>None identified.</li>}
              {data[col.key].map((f, i) => {
                const id = `${col.key}-${i}`;
                const isOpen = open === id;
                return (
                  <li key={i} style={{ borderTop: '1px solid #EFE7DA' }}>
                    <button type="button" onClick={() => setOpen(isOpen ? null : id)} className="flex w-full items-start gap-2 py-2 text-left" aria-expanded={isOpen}>
                      <span className="mt-1 flex flex-none gap-1">
                        {f.sources.slice(0, 3).map((_, j) => (
                          <span key={j} className="inline-block h-2 w-2 rounded-full" style={{ background: DOT_COLORS[j % DOT_COLORS.length] }} />
                        ))}
                      </span>
                      <span className="min-w-0 flex-1 text-[13.5px] font-semibold" style={{ color: '#2E2438' }}>{f.title}</span>
                      <span
                        className="mt-0.5 flex-none rounded px-1.5 py-0.5 text-[10px] font-semibold"
                        style={sourceCount(f) <= 1 ? { background: '#FaF0E2', color: '#9A5A12' } : { background: '#F1EAF6', color: '#6A5F74' }}
                        title={sourceCount(f) <= 1 ? 'Rests on a single source: treat as thin.' : `Based on ${sourceCount(f)} distinct sources.`}
                      >
                        {sourceCount(f) === 0 ? 'no source' : `${sourceCount(f)} source${sourceCount(f) === 1 ? '' : 's'}`}
                      </span>
                      <span className="mt-0.5 flex-none text-[10px]" style={{ color: '#B9A9CE' }}>{isOpen ? '▲' : '▼'}</span>
                    </button>
                    {!isOpen && f.detail && (
                      <p className="pb-1.5 pl-[26px] pr-1 text-[12px] leading-snug" style={{ color: '#8A7F94', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{f.detail}</p>
                    )}
                    {isOpen && (
                      <div className="pb-2.5 pl-[26px] pr-1">
                        <p className="text-[13px]" style={{ color: '#6A5F74' }}>{f.detail}</p>
                        {f.sources.some((s) => s.url) && (
                          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                            {f.sources.map((s, j) =>
                              s.url ? (
                                <a key={j} href={s.url} target="_blank" rel="noopener noreferrer" className="text-[11px] underline underline-offset-2" style={{ color: '#6A0FC2' }}>
                                  {s.label ? s.label.slice(0, 32) : 'source'} →
                                </a>
                              ) : null
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            )}
          </div>
        ))}
      </div>

      <p className="mt-2 text-[11px]" style={{ color: '#B9A9CE' }}>Each dot is a source behind that finding (up to three shown) — more dots means more sources point to it. Click any finding to see the detail and its sources.</p>
    </div>
  );
}
