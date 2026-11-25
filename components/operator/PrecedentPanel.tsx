'use client';

import { useEffect, useState } from 'react';

interface Researched {
  id: string;
  name: string;
  jurisdiction?: string;
  mechanism: string;
  detail: string;
  sources: { label: string; url: string }[];
}

interface Suggestion {
  name: string;
  location: string;
  status: string;
}

const CARD: React.CSSProperties = {
  background: '#fff',
  borderColor: '#E7DCD0',
  boxShadow: '0 1px 2px rgba(59,42,78,.05),0 6px 22px rgba(59,42,78,.07)',
};

export default function PrecedentPanel({ campaignId }: { campaignId: string }) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingSug, setLoadingSug] = useState(true);
  const [added, setAdded] = useState<Researched[]>([]);
  const [researching, setResearching] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [jurisdiction, setJurisdiction] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingSug(true);
    fetch(`/api/precedent/suggest?campaign=${encodeURIComponent(campaignId)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d?.ok) setSuggestions((d.suggestions as Suggestion[]) ?? []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingSug(false);
      });
    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  async function researchProject(pname: string, loc: string) {
    const n = pname.trim();
    if (!n || researching) return;
    if (added.some((a) => a.name.toLowerCase() === n.toLowerCase())) return;
    setResearching(n);
    setError(null);
    try {
      const res = await fetch('/api/precedent/research', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: n, jurisdiction: loc.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data?.error ?? 'Could not research that project.');
      } else {
        setAdded((a) => [data.precedent as Researched, ...a]);
      }
    } catch {
      setError('Network error reaching the researcher.');
    } finally {
      setResearching(null);
    }
  }

  function onPick(e: React.ChangeEvent<HTMLSelectElement>) {
    const v = e.target.value;
    e.target.value = '';
    if (v === '') return;
    const s = suggestions[Number(v)];
    if (s) researchProject(s.name, s.location);
  }

  async function submitManual(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || researching) return;
    await researchProject(name, jurisdiction);
    setName('');
    setJurisdiction('');
    setShowForm(false);
  }

  const availableSuggestions = suggestions
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => !added.some((a) => a.name.toLowerCase() === s.name.toLowerCase()));

  const compact = added.length > 0; // once a project is shown, shrink the picker to the top-right
  const picker =
    availableSuggestions.length > 0 ? (
      <select
        onChange={onPick}
        defaultValue=""
        disabled={!!researching}
        className="w-full rounded-md border px-3 py-2 text-sm outline-none disabled:opacity-50"
        style={{ borderColor: '#E4DACB', background: '#fff', color: '#1F1330' }}
      >
        <option value="">{compact ? 'Compare another…' : 'Choose a comparable project…'}</option>
        {availableSuggestions.map(({ s, i }) => (
          <option key={i} value={i}>
            {s.name}
            {s.location ? ` — ${s.location}` : ''}
            {s.status ? ` (${s.status})` : ''}
          </option>
        ))}
      </select>
    ) : (
      <p className="text-[13px]" style={{ color: '#6A5F74' }}>
        {loadingSug ? 'Finding comparable projects nearby…' : 'No automatic suggestions — add one below.'}
      </p>
    );

  return (
    <div className="relative space-y-4">
      {/* Picker — full card when nothing is chosen; compact & top-right once a project shows */}
      {compact ? (
        <div className="sm:absolute sm:right-0 sm:top-[-4.75rem] sm:z-10 sm:w-72">
          <div className="w-full rounded-lg border px-3 py-2" style={CARD}>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.05em]" style={{ color: '#9A8FA6' }}>
              Compare another project
            </label>
            {picker}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border p-4" style={CARD}>
          <label className="block text-[13px] font-semibold" style={{ color: '#1F1330' }}>
            Compare with a similar project nearby
          </label>
          <p className="mt-0.5 text-[12px]" style={{ color: '#9A8FA6' }}>
            Projects like this one, in the same region — pick one and Pythia researches how it reached agreement.
          </p>
          <div className="mt-2">{picker}</div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[12px]" style={{ color: '#9A8FA6' }}>
              Know a specific project to compare? Add it by name.
            </p>
            <button
              type="button"
              onClick={() => setShowForm((v) => !v)}
              className="rounded-lg px-3 py-1.5 text-[12px] font-semibold text-white"
              style={{ background: 'linear-gradient(90deg,#FCC029,#EC2BFC,#6A0FC2)' }}
            >
              {showForm ? 'Cancel' : '+ Add your own'}
            </button>
          </div>

          {showForm && (
            <form onSubmit={submitManual} className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Project name"
                className="flex-1 rounded-md border px-3 py-2 text-sm outline-none"
                style={{ borderColor: '#E4DACB' }}
                disabled={!!researching}
              />
              <input
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
                placeholder="Where (town, region) — optional"
                className="flex-1 rounded-md border px-3 py-2 text-sm outline-none"
                style={{ borderColor: '#E4DACB' }}
                disabled={!!researching}
              />
              <button
                type="submit"
                disabled={!!researching || !name.trim()}
                className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                style={{ background: '#6A0FC2' }}
              >
                Research
              </button>
            </form>
          )}
          <p className="mt-2 text-[11px]" style={{ color: '#9A8FA6' }}>
            Uses live web search — results are model-summarised; check the sources before relying on them.
          </p>
        </div>
      )}

      {error && (
        <p className="text-sm" style={{ color: '#B23A2E' }}>
          {error}
        </p>
      )}

      {researching && (
        <div className="rounded-2xl border p-5" style={CARD}>
          <p className="text-sm" style={{ color: '#6A5F74' }}>
            Researching <span className="font-semibold">{researching}</span> — how it reached agreement…
          </p>
        </div>
      )}

      {/* Result cards — full width when there's just one, two-up otherwise */}
      {added.length > 0 && (
        <div className={added.length === 1 ? 'space-y-3' : 'grid gap-3 sm:grid-cols-2'}>
          {added.map((p) => (
            <div key={p.id} className="rounded-2xl border p-5" style={CARD}>
              <div className="flex items-center gap-2">
                <span style={{ color: '#4F8A5C' }}>✓</span>
                <h3 className="font-serif text-base font-semibold" style={{ color: '#1F1330' }}>
                  {p.name}
                </h3>
                {p.jurisdiction && (
                  <span className="text-[12px]" style={{ color: '#9A8FA6' }}>
                    · {p.jurisdiction}
                  </span>
                )}
              </div>
              <div className="mt-1 text-[13px] font-semibold" style={{ color: '#5A3E8C' }}>
                {p.mechanism}
              </div>
              <p className="mt-1 text-sm" style={{ color: '#6A5F74' }}>
                {p.detail}
              </p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                {p.sources.map((s) => (
                  <a
                    key={s.url}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] underline underline-offset-2"
                    style={{ color: '#6A0FC2' }}
                  >
                    {s.label} →
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
