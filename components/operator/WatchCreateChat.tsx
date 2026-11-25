'use client';

import { useRef, useState } from 'react';

interface Turn {
  role: 'user' | 'assistant';
  content: string;
}

interface Proposal {
  name: string;
  kind: 'site' | 'general';
  badge?: string;
  meta?: string;
  blurb?: string;
  routing: string;
  analysisFocus?: string;
  jurisdiction?: string;
  docket?: string;
}

const STARTERS = [
  'I want a Project for a new solar project I am tracking.',
  'Set up a Project about a data-center proposal near us.',
  'Make a Project for an issue area, not one specific project.',
  'I need an internal Project about our own organisation.',
];

/** Pull a ```watch { ... } ``` block out of an assistant message, if present. */
function extractProposal(text: string): { clean: string; proposal: Proposal | null } {
  const m = text.match(/```watch\s*([\s\S]*?)```/i);
  if (!m) return { clean: text, proposal: null };
  const clean = text.replace(m[0], '').trim();
  try {
    const raw = JSON.parse(m[1].trim()) as Record<string, unknown>;
    const name = typeof raw.name === 'string' ? raw.name.trim() : '';
    const routing = typeof raw.routing === 'string' ? raw.routing.trim() : '';
    if (!name || !routing) return { clean, proposal: null };
    const proposal: Proposal = {
      name,
      kind: raw.kind === 'site' ? 'site' : 'general',
      badge: typeof raw.badge === 'string' ? raw.badge : undefined,
      meta: typeof raw.meta === 'string' ? raw.meta : undefined,
      blurb: typeof raw.blurb === 'string' ? raw.blurb : undefined,
      routing,
      analysisFocus:
        typeof raw.analysisFocus === 'string' ? raw.analysisFocus : undefined,
      jurisdiction:
        typeof raw.jurisdiction === 'string' ? raw.jurisdiction : undefined,
      docket: typeof raw.docket === 'string' ? raw.docket : undefined,
    };
    return { clean, proposal };
  } catch {
    return { clean, proposal: null };
  }
}

export default function WatchCreateChat() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The current proposal (from the latest assistant turn), editable before save.
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [creating, setCreating] = useState(false);
  const [done, setDone] = useState<{
    id: string;
    name: string;
    scanned: number;
    moved: number;
  } | null>(null);
  const [suggestions, setSuggestions] = useState<
    Array<{ url: string; label?: string; rationale?: string }>
  >([]);
  const [suggesting, setSuggesting] = useState(false);
  const [added, setAdded] = useState<Set<string>>(new Set());

  const listRef = useRef<HTMLDivElement>(null);
  const turnsRef = useRef<Turn[]>([]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    setError(null);
    setDone(null);
    setSuggestions([]);
    const next = [...turnsRef.current, { role: 'user' as const, content }];
    setTurns(next);
    turnsRef.current = next;
    setInput('');
    setBusy(true);
    try {
      const res = await fetch('/api/agents/watch-create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? 'The helper could not respond.');
      } else {
        const { clean, proposal: p } = extractProposal(data.reply as string);
        const shown = clean || (p ? 'I have drafted your Project — review it below.' : '');
        const withAssistant = [
          ...next,
          { role: 'assistant' as const, content: shown },
        ];
        setTurns(withAssistant);
        turnsRef.current = withAssistant;
        if (p) setProposal(p);
      }
    } catch {
      setError('Network error reaching the helper.');
    } finally {
      setBusy(false);
      requestAnimationFrame(() =>
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
      );
    }
  }

  async function createWatch() {
    if (!proposal || creating) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(proposal),
      });
      const data = await res.json();
      if (!res.ok || !data?.campaign) {
        setError(data?.error ?? 'Could not create the Project.');
        setCreating(false);
        return;
      }
      const id = data.campaign.id as string;
      // Pull matching existing email/Drive signals into the new Project.
      let scanned = 0;
      let moved = 0;
      try {
        const bf = await fetch('/api/campaigns/backfill', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ campaignId: id }),
        });
        const bd = await bf.json();
        if (bf.ok) {
          scanned = bd.scanned ?? 0;
          moved = bd.moved ?? 0;
        }
      } catch {
        /* backfill best-effort; the Project still exists */
      }
      setDone({ id, name: proposal.name, scanned, moved });
      if (proposal.kind === 'site') {
        void suggestCivic(id, proposal.name, proposal.jurisdiction, proposal.docket);
      }
      setProposal(null);
    } catch {
      setError('Network error creating the Project.');
    } finally {
      setCreating(false);
    }
  }

  async function suggestCivic(
    id: string,
    name: string,
    jurisdiction?: string,
    docket?: string
  ) {
    setSuggesting(true);
    try {
      const res = await fetch('/api/sources/suggest', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ projectName: name, jurisdiction, docket }),
      });
      const d = await res.json();
      if (res.ok) setSuggestions(Array.isArray(d.suggestions) ? d.suggestions : []);
    } catch {
      /* suggestions are best-effort */
    } finally {
      setSuggesting(false);
    }
  }

  async function addCivic(
    id: string,
    sug: { url: string; label?: string; rationale?: string }
  ) {
    try {
      await fetch('/api/sources', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          campaignId: id,
          url: sug.url,
          label: sug.label,
          rationale: sug.rationale,
          addedBy: 'scout',
        }),
      });
      setAdded((prev) => new Set(prev).add(sug.url));
    } catch {
      /* best-effort */
    }
  }

  return (
    <div className="flex flex-col">
      <div
        ref={listRef}
        className="mb-4 max-h-[52vh] min-h-[220px] overflow-y-auto rounded-lg border border-brand-rule bg-brand-vlight p-4"
      >
        {turns.length === 0 ? (
          <div>
            <p className="mb-3 text-sm text-ink-muted">
              A Project is one topic on your dashboard. Tell me what you want to
              track and I&rsquo;ll set it up — no new uploads needed, since your
              email and Drive are already connected. Try:
            </p>
            <div className="flex flex-col gap-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-md border border-brand-rule bg-white px-3 py-2 text-left text-sm text-brand-dark transition hover:bg-brand-light"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ul className="space-y-3">
            {turns.map((t, i) =>
              t.content ? (
                <li key={i} className={t.role === 'user' ? 'text-right' : 'text-left'}>
                  <div
                    className={
                      'inline-block max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ' +
                      (t.role === 'user'
                        ? 'bg-brand text-white'
                        : 'border border-brand-rule bg-white text-ink')
                    }
                  >
                    {t.content}
                  </div>
                </li>
              ) : null
            )}
            {busy && (
              <li className="text-left">
                <div className="inline-block rounded-lg border border-brand-rule bg-white px-3 py-2 text-sm text-ink-subtle">
                  Thinking…
                </div>
              </li>
            )}
          </ul>
        )}
      </div>

      {error && <p className="mb-2 text-sm text-[#B23A2E]">{error}</p>}

      {/* Proposal review card */}
      {proposal && !done && (
        <div className="mb-4 rounded-lg border border-brand bg-white p-4">
          <p className="mb-3 text-sm font-semibold text-brand-dark">
            Review your new Project
          </p>
          <label className="mb-2 block text-xs font-medium text-ink-subtle">
            Name
            <input
              value={proposal.name}
              onChange={(e) => setProposal({ ...proposal, name: e.target.value })}
              className="mt-1 w-full rounded-md border border-brand-rule px-2 py-1.5 text-sm text-ink focus:border-brand focus:outline-none"
            />
          </label>
          <label className="mb-2 block text-xs font-medium text-ink-subtle">
            Type
            <select
              value={proposal.kind}
              onChange={(e) =>
                setProposal({ ...proposal, kind: e.target.value as 'site' | 'general' })
              }
              className="mt-1 w-full rounded-md border border-brand-rule px-2 py-1.5 text-sm text-ink focus:border-brand focus:outline-none"
            >
              <option value="site">A specific development (site)</option>
              <option value="general">An issue area / internal</option>
            </select>
          </label>
          <label className="mb-3 block text-xs font-medium text-ink-subtle">
            What belongs in it (used to sort your data)
            <textarea
              value={proposal.routing}
              onChange={(e) => setProposal({ ...proposal, routing: e.target.value })}
              rows={5}
              className="mt-1 w-full rounded-md border border-brand-rule px-2 py-1.5 text-sm text-ink focus:border-brand focus:outline-none"
            />
          </label>
          <label className="mb-3 block text-xs font-medium text-ink-subtle">
            What to learn from it (guides how the dashboard is analysed)
            <textarea
              value={proposal.analysisFocus ?? ''}
              onChange={(e) =>
                setProposal({ ...proposal, analysisFocus: e.target.value })
              }
              rows={4}
              className="mt-1 w-full rounded-md border border-brand-rule px-2 py-1.5 text-sm text-ink focus:border-brand focus:outline-none"
            />
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={createWatch}
              disabled={creating || !proposal.name.trim() || !proposal.routing.trim()}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {creating ? 'Creating & sorting your data…' : 'Create this Project'}
            </button>
            <button
              onClick={() => setProposal(null)}
              disabled={creating}
              className="rounded-lg border border-brand-rule px-3 py-2 text-sm text-brand-dark disabled:opacity-50"
            >
              Keep editing in chat
            </button>
          </div>
        </div>
      )}

      {/* Success */}
      {done && (
        <div className="mb-4 rounded-lg border border-brand bg-brand-vlight p-4">
          <p className="text-sm font-semibold text-brand-dark">
            “{done.name}” is ready.
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            {done.moved > 0
              ? `Pulled ${done.moved} matching item${done.moved === 1 ? '' : 's'} from your existing email & Drive (scanned ${done.scanned}).`
              : `No existing items matched yet — new email & Drive content will flow in automatically. (Scanned ${done.scanned}.)`}
          </p>
          <a
            href={`/operator/dashboard?campaign=${encodeURIComponent(done.id)}`}
            className="mt-3 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white"
          >
            Open “{done.name}” on the dashboard →
          </a>
          {(suggesting || suggestions.length > 0) && (
            <div className="mt-4 border-t border-brand-rule/60 pt-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-brand">
                Civic sources to monitor
              </p>
              {suggesting ? (
                <p className="text-sm text-ink-subtle">
                  Scouting local news, county/township pages, and dockets…
                </p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {suggestions.map((sug) => (
                    <div
                      key={sug.url}
                      className="flex items-start gap-2 rounded-md border border-brand-rule bg-white p-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm text-ink">
                          {sug.label || sug.url}
                        </div>
                        {sug.rationale && (
                          <div className="text-xs text-ink-subtle">{sug.rationale}</div>
                        )}
                      </div>
                      <button
                        onClick={() => addCivic(done.id, sug)}
                        disabled={added.has(sug.url)}
                        className="flex-none rounded-md border border-brand-rule px-2 py-1 text-xs text-brand-dark disabled:opacity-50"
                      >
                        {added.has(sug.url) ? 'Added ✓' : 'Add'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-1 text-xs text-ink-subtle">
                These feed the dashboard’s civic data alongside your uploads.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Composer */}
      {!done && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-center gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your answer…"
            disabled={busy}
            className="flex-1 rounded-lg border border-brand-rule px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Send
          </button>
        </form>
      )}
    </div>
  );
}
