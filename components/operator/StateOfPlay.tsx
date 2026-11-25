'use client';

import { useEffect, useState } from 'react';
import type { StateOfPlay as SoP } from '@/app/api/manage/state-of-play/route';

const PLUM = '#1F1330';
const GRAD = 'linear-gradient(90deg,#FCC029 0%,#EC2BFC 52%,#6A0FC2 100%)';
const RULE = '#E7DCD0';

// Known siting/permitting acronyms. We only ever SHOW the ones that actually
// appear in the generated text (no invented definitions, nothing off-screen).
const ACRONYMS: Array<[string, string]> = [
  ['OPSB', 'Ohio Power Siting Board'],
  ['PUCO', 'Public Utilities Commission of Ohio'],
  ['PJM', 'PJM Interconnection (the regional grid operator)'],
  ['AEP', 'American Electric Power'],
  ['SCC', 'Virginia State Corporation Commission'],
  ['PSC', 'Public Service Commission'],
  ['FERC', 'Federal Energy Regulatory Commission'],
  ['NEPA', 'National Environmental Policy Act'],
  ['EIS', 'Environmental Impact Statement'],
  ['CPCN', 'Certificate of Public Convenience and Necessity'],
  ['CUP', 'Conditional Use Permit'],
  ['SUP', 'Special Use Permit'],
  ['BZA', 'Board of Zoning Appeals'],
  ['ZBA', 'Zoning Board of Appeals'],
  ['BLM', 'Bureau of Land Management'],
  ['PILOT', 'Payment In Lieu Of Taxes'],
  ['TIF', 'Tax Increment Financing'],
  ['HOA', 'Homeowners Association'],
  ['MW', 'Megawatts (project size)'],
];

/**
 * Broadened "State of play": the current legal / permitting picture pulled
 * live from the web on demand, with a chat box for the operator to steer what
 * it covers and Pythia's own suggestions. Falls back to the project card's
 * binding commitments as a baseline so the section is never empty (and prints
 * cleanly even without a live pull).
 */
export default function StateOfPlay({
  campaignId,
  baselineCommitments = [],
  baselineSource = '',
  density = 'balanced',
  onSources,
  onState,
}: {
  campaignId: string;
  baselineCommitments?: string[];
  baselineSource?: string;
  density?: 'skimmable' | 'balanced' | 'detailed';
  onSources?: (sources: { label: string; url: string }[]) => void;
  onState?: (state: SoP | null) => void;
}) {
  const [state, setState] = useState<SoP | null>(null);
  const [ask, setAsk] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [peeked, setPeeked] = useState(false);

  // Peek the cache on mount — never triggers a search.
  useEffect(() => {
    let live = true;
    fetch(`/api/manage/state-of-play?campaignId=${encodeURIComponent(campaignId)}`)
      .then((r) => r.json())
      .then((d) => { if (live && d.generated && d.state) setState(d.state); })
      .catch(() => {})
      .finally(() => { if (live) setPeeked(true); });
    return () => { live = false; };
  }, [campaignId]);

  // Lift sources up so they can be consolidated into the brief's single
  // Sources footer, grouped by section, instead of a paragraph here.
  useEffect(() => {
    if (state?.sources) onSources?.(state.sources);
    onState?.(state);
  }, [state, onSources, onState]);

  async function run(opts: { ask?: string; refresh?: boolean } = {}) {
    if (loading) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch('/api/manage/state-of-play', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ campaignId, ask: opts.ask ?? ask, refresh: opts.refresh }),
      });
      const d = await res.json();
      if (!res.ok || !d.state) { setErr(d?.error ?? 'Could not pull the state of play.'); return; }
      setState(d.state);
    } catch {
      setErr('Network error reaching the web-search service.');
    } finally {
      setLoading(false);
    }
  }

  const lim = (arr: unknown[], sk: number, ba: number) =>
    density === 'skimmable' ? sk : density === 'balanced' ? ba : arr.length;
  const laws = state ? state.laws.slice(0, lim(state.laws, 2, 3)) : [];
  const timeline = state ? state.timeline.slice(0, lim(state.timeline, 2, 4)) : [];
  const actions = state ? state.actions.slice(0, lim(state.actions, 2, 3)) : [];

  // Only surface acronyms that appear in what the reader can actually see.
  const visibleText = [
    state?.headline ?? '',
    ...laws.map((l) => `${l.title} ${l.detail ?? ''}`),
    ...timeline.map((t) => t.label),
    ...actions,
  ].join('  ');
  const acronymsFound = ACRONYMS.filter(([abbr]) =>
    new RegExp(`\\b${abbr}\\b`).test(visibleText)
  );

  return (
    <div>
      {/* baseline (always available, prints cleanly) */}
      {!state && baselineCommitments.length > 0 && (
        <div className="mb-3">
          <p className="mb-2 text-[12.5px]" style={{ color: '#6A5F74' }}>
            Approved with binding conditions the community can hold the developer to:
          </p>
          <div className="flex flex-wrap gap-2">
            {baselineCommitments.map((c, i) => (
              <span key={i} className="rounded-full px-2.5 py-1 text-[11.5px] font-medium" style={{ background: '#EDE6F6', color: '#5b3f86' }}>{c}</span>
            ))}
          </div>
          {baselineSource && <p className="mt-2 text-[11px]" style={{ color: '#9A8FA6' }}>Source: {baselineSource}</p>}
        </div>
      )}

      {/* live result */}
      {state && (
        <div>
          {state.headline && <p className="mb-3 text-[13.5px] font-medium" style={{ color: PLUM }}>{state.headline}</p>}

          {laws.length > 0 && (
            <div className="mb-3">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.06em]" style={{ color: '#6A5F74' }}>Laws &amp; decisions</p>
              <ul className="space-y-0.5">
                {laws.map((l, i) => (
                  <li key={i} className="text-[12px] leading-snug" style={{ color: '#6A5F74' }}>
                    <span className="font-semibold" style={{ color: PLUM }}>{l.title}</span>
                    {l.date && <span style={{ color: '#9A8FA6' }}> &middot; {l.date}</span>}
                    {l.detail && <span> &mdash; {l.detail}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {timeline.length > 0 && (
            <div className="mb-3">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.06em]" style={{ color: '#6A5F74' }}>Timeline</p>
              <div className="space-y-1">
                {timeline.map((t, i) => (
                  <div key={i} className="flex items-start gap-2 text-[12.5px]">
                    <span className="mt-0.5 flex-none rounded-full px-2 py-0.5 text-[10px] font-semibold" style={t.status === 'upcoming' ? { background: '#FAF0E2', color: '#B26A1E' } : { background: '#EAF3EC', color: '#2F6B3C' }}>
                      {t.status === 'upcoming' ? 'Coming' : 'Done'}
                    </span>
                    <span className="flex-none font-medium" style={{ color: PLUM, minWidth: 74 }}>{t.when}</span>
                    <span style={{ color: '#6A5F74' }}>{t.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {actions.length > 0 && (
            <div className="mb-3">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.06em]" style={{ color: '#6A5F74' }}>What you can do next</p>
              <ul className="list-disc space-y-0.5 pl-5 text-[12.5px]" style={{ color: '#2E2438' }}>
                {actions.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          )}

          {acronymsFound.length > 0 && (
            <div className="mb-1">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.06em]" style={{ color: '#6A5F74' }}>Acronyms</p>
              <ul className="space-y-0.5">
                {acronymsFound.map(([abbr, full]) => (
                  <li key={abbr} className="text-[11.5px] leading-snug" style={{ color: '#6A5F74' }}>
                    <span className="font-semibold" style={{ color: PLUM }}>{abbr}</span> &mdash; {full}
                  </li>
                ))}
              </ul>
            </div>
          )}

        </div>
      )}

      {/* controls (hidden in print) */}
      <div className="no-print mt-3 rounded-lg border border-dashed p-3" style={{ borderColor: '#E2D6F0', background: '#FBF8F2' }}>
        {!state && peeked && (
          <button
            type="button"
            onClick={() => run()}
            disabled={loading}
            className="rounded-lg px-3.5 py-2 text-[13px] font-semibold text-white disabled:opacity-60"
            style={{ background: GRAD }}
          >
            {loading ? 'Searching the web…' : 'Pull the latest state of play from the web'}
          </button>
        )}

        {(state || !peeked) && (
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={ask}
              onChange={(e) => setAsk(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); run(); } }}
              placeholder="Tell Pythia what to include — e.g. 'the appeal status and any new setback rules'"
              className="min-w-0 flex-1 rounded-md border px-3 py-2 text-[12.5px]"
              style={{ borderColor: RULE, color: PLUM }}
            />
            <button type="button" onClick={() => run()} disabled={loading} className="rounded-md px-3 py-2 text-[12.5px] font-semibold text-white disabled:opacity-60" style={{ background: GRAD }}>
              {loading ? '…' : state ? 'Update' : 'Generate'}
            </button>
            {state && (
              <button type="button" onClick={() => run({ refresh: true })} disabled={loading} className="rounded-md border px-2.5 py-2 text-[12px]" style={{ borderColor: RULE, color: '#6A0FC2' }} title="Ignore cache and search again">
                ↻ Refresh
              </button>
            )}
          </div>
        )}

        {state && state.suggestions.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px]" style={{ color: '#9A8FA6' }}>Pythia suggests:</span>
            {state.suggestions.map((sg, i) => (
              <button key={i} type="button" onClick={() => { setAsk(sg); run({ ask: sg }); }} disabled={loading} className="rounded-full border px-2.5 py-1 text-[11px]" style={{ borderColor: '#E2D6F0', color: '#5b3f86', background: '#EDE6F6' }}>
                + {sg}
              </button>
            ))}
          </div>
        )}

        {err && <p className="mt-2 text-[12px]" style={{ color: '#B23A2E' }}>{err}</p>}
        {state?.ask && <p className="mt-2 text-[11px]" style={{ color: '#9A8FA6' }}>Focused on: “{state.ask}”. Cached for a day — use ↻ to force a fresh search.</p>}
      </div>
    </div>
  );
}
