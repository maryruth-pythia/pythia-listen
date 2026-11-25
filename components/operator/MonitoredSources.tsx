'use client';

import { useEffect, useState } from 'react';

interface Source {
  id: string;
  url: string;
  label?: string;
  rationale?: string;
  addedBy: 'manual' | 'agent';
}
interface Suggestion {
  url: string;
  label: string;
  rationale: string;
}

interface Props {
  campaignId?: string;
  projectName?: string;
  jurisdiction?: string;
  docket?: string;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export default function MonitoredSources({
  campaignId,
  projectName,
  jurisdiction,
  docket,
}: Props) {
  const [sources, setSources] = useState<Source[]>([]);
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const qs = campaignId ? `?campaignId=${encodeURIComponent(campaignId)}` : '';

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/sources${qs}`);
      const data = await res.json();
      setSources(data.sources ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addSource(u: string, l?: string, rationale?: string, addedBy?: string) {
    setError(null);
    const res = await fetch('/api/sources', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ campaignId, url: u, label: l, rationale, addedBy }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? 'Could not add source.');
      return false;
    }
    return true;
  }

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    if (await addSource(url.trim(), label.trim() || undefined)) {
      setUrl('');
      setLabel('');
      load();
    }
  }

  async function remove(id: string) {
    await fetch(`/api/sources?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    load();
  }

  async function suggest() {
    setSuggesting(true);
    setError(null);
    try {
      const res = await fetch('/api/sources/suggest', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ projectName, jurisdiction, docket }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? 'Could not get suggestions.');
      else setSuggestions(data.suggestions ?? []);
    } catch {
      setError('Network error.');
    } finally {
      setSuggesting(false);
    }
  }

  async function approve(s: Suggestion) {
    if (await addSource(s.url, s.label, s.rationale, 'agent')) {
      setSuggestions((prev) => prev.filter((x) => x.url !== s.url));
      load();
    }
  }
  function deny(s: Suggestion) {
    setSuggestions((prev) => prev.filter((x) => x.url !== s.url));
  }

  return (
    <section className="rounded-lg border border-brand-rule bg-white p-5">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="font-serif text-lg font-semibold text-brand-dark">
          Sources to monitor
        </h2>
        <button
          onClick={suggest}
          disabled={suggesting}
          className="rounded-md border border-brand bg-brand-light px-3 py-1.5 text-sm font-medium text-brand-dark transition hover:bg-brand-vlight disabled:opacity-50"
        >
          {suggesting ? 'Scouting…' : '✨ Suggest sources'}
        </button>
      </div>
      <p className="mb-4 text-sm text-ink-muted">
        Websites the civic-record pass checks each run. Add your own, or let the
        scout suggest sources for this Project and approve the ones you want.
      </p>

      {error && <p className="mb-3 text-sm text-[#B23A2E]">{error}</p>}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="mb-4 rounded-md border border-brand-rule bg-brand-vlight p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand">
            Suggested — approve or deny
          </p>
          <ul className="space-y-2">
            {suggestions.map((s) => (
              <li
                key={s.url}
                className="flex items-start justify-between gap-3 rounded border border-brand-rule bg-white p-2"
              >
                <div className="min-w-0">
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-brand underline underline-offset-2"
                  >
                    {s.label || hostOf(s.url)}
                  </a>
                  <span className="ml-1 text-xs text-ink-subtle">
                    {hostOf(s.url)}
                  </span>
                  {s.rationale && (
                    <p className="text-xs text-ink-muted">{s.rationale}</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => approve(s)}
                    className="rounded bg-brand px-2 py-1 text-xs font-medium text-white hover:bg-brand-dark"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => deny(s)}
                    className="rounded border border-brand-rule px-2 py-1 text-xs text-ink-muted hover:bg-brand-vlight"
                  >
                    Deny
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Current sources */}
      {loading ? (
        <p className="text-sm text-ink-subtle">Loading…</p>
      ) : sources.length === 0 ? (
        <p className="mb-4 text-sm text-ink-subtle">No sources yet.</p>
      ) : (
        <ul className="mb-4 space-y-1">
          {sources.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-3 rounded border border-brand-rule px-3 py-1.5"
            >
              <div className="min-w-0">
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-brand underline underline-offset-2"
                >
                  {s.label || hostOf(s.url)}
                </a>
                <span className="ml-1 text-xs text-ink-subtle">
                  {hostOf(s.url)}
                </span>
                {s.addedBy === 'agent' && (
                  <span className="ml-2 rounded bg-brand-light px-1.5 py-0.5 text-[10px] text-brand-dark">
                    suggested
                  </span>
                )}
              </div>
              <button
                onClick={() => remove(s.id)}
                className="shrink-0 text-xs text-ink-subtle hover:text-[#B23A2E]"
              >
                remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Add form */}
      <form onSubmit={onAdd} className="flex flex-wrap gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/news"
          className="min-w-[220px] flex-1 rounded-md border border-brand-rule px-3 py-2 text-sm focus:border-brand focus:outline-none"
        />
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label (optional)"
          className="w-40 rounded-md border border-brand-rule px-3 py-2 text-sm focus:border-brand focus:outline-none"
        />
        <button
          type="submit"
          disabled={!url.trim()}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-dark disabled:opacity-50"
        >
          Add source
        </button>
      </form>
    </section>
  );
}
