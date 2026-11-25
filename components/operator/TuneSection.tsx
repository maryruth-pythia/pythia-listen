'use client';

import { useEffect, useRef, useState } from 'react';

const GRAD = 'linear-gradient(90deg,#FCC029 0%,#EC2BFC 52%,#6A0FC2 100%)';

type Campaign = {
  id: string;
  name: string;
  routing?: string;
  analysisFocus?: string;
  exclusions?: string;
  [k: string]: unknown;
};

/**
 * Inline "Tune this section" — unfurls a small panel (like the Scout check-in)
 * instead of navigating to the Configure page. Loads the project's current
 * analysis focus + exclusions on open, and saves them back through the same
 * /api/campaigns endpoint (which busts the analysis cache so sections re-run).
 */
export default function TuneSection({ campaignId }: { campaignId: string }) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [focus, setFocus] = useState('');
  const [exclusions, setExclusions] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/campaigns', { headers: { 'cache-control': 'no-store' } });
      const data = await res.json();
      const list: Campaign[] = Array.isArray(data?.campaigns) ? data.campaigns : [];
      const c = list.find((x) => x.id === campaignId) ?? null;
      if (!c) { setError('Could not load this project’s settings.'); return; }
      setCampaign(c);
      setFocus(c.analysisFocus ?? '');
      setExclusions(c.exclusions ?? '');
      setLoaded(true);
    } catch {
      setError('Network error loading settings.');
    } finally {
      setLoading(false);
    }
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !loaded && !loading) load();
  }

  async function save() {
    if (!campaign || saving) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...campaign, analysisFocus: focus, exclusions }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data?.error ?? 'Could not save.'); return; }
      setSaved(true);
    } catch {
      setError('Network error saving.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={toggle}
        className="rounded-md border border-brand-rule px-3 py-1.5 text-[12.5px] font-medium text-brand hover:bg-brand-light"
      >
        ⚙ Tune this section {open ? '▴' : '▾'}
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-[min(92vw,420px)] rounded-xl border border-brand-rule bg-white p-4 shadow-lg">
          <p className="mb-1 text-[13px] font-semibold text-brand-dark">Tune what this section pays attention to</p>
          <p className="mb-3 text-[11.5px] text-ink-subtle">
            These apply to the whole project&rsquo;s analyses (clusters, questions, meta &amp; more). Saving re-runs them.
          </p>

          {loading ? (
            <p className="text-[12px] text-ink-subtle">Loading current settings…</p>
          ) : (
            <>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-subtle">Analysis focus</label>
              <textarea
                value={focus}
                onChange={(e) => { setFocus(e.target.value); setSaved(false); }}
                rows={3}
                placeholder="The lens the analyses should reason through — what matters most for this project."
                className="mb-3 w-full rounded-md border border-brand-rule px-2.5 py-2 text-[12.5px] text-ink focus:border-brand focus:outline-none"
              />
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-subtle">What to ignore</label>
              <textarea
                value={exclusions}
                onChange={(e) => { setExclusions(e.target.value); setSaved(false); }}
                rows={2}
                placeholder="Say it plainly — e.g. ignore anything about past bitterness or the job market. No quotes needed."
                className="mb-3 w-full rounded-md border border-brand-rule px-2.5 py-2 text-[12.5px] text-ink focus:border-brand focus:outline-none"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={save}
                  disabled={saving || !campaign}
                  className="rounded-md px-3.5 py-2 text-[12.5px] font-semibold text-white disabled:opacity-50"
                  style={{ background: GRAD }}
                >
                  {saving ? 'Saving…' : 'Save & re-run'}
                </button>
                {saved && (
                  <span className="text-[12px]" style={{ color: '#2F6B3C' }}>
                    Saved. <button type="button" onClick={() => window.location.reload()} className="underline">Reload</button> to see it re-run.
                  </span>
                )}
                <button type="button" onClick={() => setOpen(false)} className="ml-auto text-[12px] text-ink-subtle hover:text-ink">Close</button>
              </div>
            </>
          )}
          {error && <p className="mt-2 text-[12px]" style={{ color: '#B23A2E' }}>{error}</p>}
        </div>
      )}
    </div>
  );
}
