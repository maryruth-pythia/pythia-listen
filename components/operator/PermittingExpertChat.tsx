'use client';

import { useRef, useState } from 'react';

interface Source {
  url: string;
  title?: string;
}
interface Turn {
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
}

const STARTERS = [
  'How does the Ohio Power Siting Board certificate process work, step by step?',
  'What is Ohio Senate Bill 52 and what power does it give county commissioners?',
  'How can a community member file a public comment or intervene in an OPSB case?',
  'What are the deadlines to appeal an OPSB decision, and to whom?',
];

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export default function PermittingExpertChat() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [jurisdiction, setJurisdiction] = useState('Knox County, Ohio');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    setError(null);
    const next: Turn[] = [...turns, { role: 'user', content }];
    setTurns(next);
    setInput('');
    setBusy(true);
    try {
      const res = await fetch('/api/agents/permitting-expert', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          messages: next.map(({ role, content }) => ({ role, content })),
          jurisdiction: jurisdiction || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? 'The agent could not respond.');
      } else {
        setTurns([
          ...next,
          { role: 'assistant', content: data.reply, sources: data.sources },
        ]);
      }
    } catch {
      setError('Network error reaching the agent.');
    } finally {
      setBusy(false);
      requestAnimationFrame(() =>
        listRef.current?.scrollTo({
          top: listRef.current.scrollHeight,
          behavior: 'smooth',
        })
      );
    }
  }

  return (
    <div className="flex flex-col">
      <label className="mb-3 block text-xs text-ink-muted">
        Jurisdiction (used to give location-specific procedure)
        <input
          value={jurisdiction}
          onChange={(e) => setJurisdiction(e.target.value)}
          className="mt-1 block w-full max-w-sm rounded-md border border-brand-rule px-2 py-1 text-sm focus:border-brand focus:outline-none"
          placeholder="e.g. Knox County, Ohio"
        />
      </label>

      <div
        ref={listRef}
        className="mb-4 max-h-[52vh] min-h-[220px] overflow-y-auto rounded-lg border border-brand-rule bg-brand-vlight p-4"
      >
        {turns.length === 0 ? (
          <div>
            <p className="mb-3 text-sm text-ink-muted">
              Ask about the permitting / siting process. Answers are grounded in
              web sources you can click. Try:
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
            {turns.map((t, i) => (
              <li
                key={i}
                className={t.role === 'user' ? 'text-right' : 'text-left'}
              >
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
                {t.role === 'assistant' && t.sources && t.sources.length > 0 && (
                  <div className="mt-1 max-w-[85%] text-left">
                    <span className="text-[11px] uppercase tracking-wide text-ink-subtle">
                      Sources
                    </span>
                    <ul className="mt-0.5 space-y-0.5">
                      {t.sources.map((s, j) => (
                        <li key={j} className="text-xs">
                          <a
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand underline underline-offset-2 hover:text-brand-dark"
                          >
                            {s.title || hostOf(s.url)}
                          </a>
                          <span className="text-ink-subtle"> · {hostOf(s.url)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            ))}
            {busy && (
              <li className="text-left">
                <div className="inline-block rounded-lg border border-brand-rule bg-white px-3 py-2 text-sm text-ink-subtle">
                  Searching &amp; drafting…
                </div>
              </li>
            )}
          </ul>
        )}
      </div>

      {error && <p className="mb-2 text-sm text-[#B23A2E]">{error}</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about permits, deadlines, intervening, appeals…"
          className="flex-1 rounded-md border border-brand-rule px-3 py-2 text-sm focus:border-brand focus:outline-none"
          disabled={busy}
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-dark disabled:opacity-50"
        >
          Send
        </button>
      </form>

      <p className="mt-3 text-xs text-ink-subtle">
        Informational only — not legal advice. Confirm anything consequential
        with counsel or the relevant agency.
      </p>
    </div>
  );
}
