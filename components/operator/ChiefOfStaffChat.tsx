'use client';

import { useRef, useState } from 'react';

interface Turn {
  role: 'user' | 'assistant';
  content: string;
}

const STARTERS = [
  'Help me design a listening project for a 120 MW solar project facing farmland concerns.',
  'Which research questions should I pick if the community fears property-value loss?',
  'Suggest 5 signifiers for a project where trust in the developer is low.',
  'Review this question for leading language: "Don’t you think the project will hurt our farms?"',
];

export default function ChiefOfStaffChat() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    setError(null);
    const next = [...turns, { role: 'user' as const, content }];
    setTurns(next);
    setInput('');
    setBusy(true);
    try {
      const res = await fetch('/api/agents/chief-of-staff', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? 'The agent could not respond.');
      } else {
        setTurns([...next, { role: 'assistant', content: data.reply }]);
      }
    } catch {
      setError('Network error reaching the agent.');
    } finally {
      setBusy(false);
      requestAnimationFrame(() => {
        listRef.current?.scrollTo({
          top: listRef.current.scrollHeight,
          behavior: 'smooth',
        });
      });
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
              Ask the Chief-of-Staff to help you design a project. Try:
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
              </li>
            ))}
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

      {error && (
        <p className="mb-2 text-sm text-[#B23A2E]">{error}</p>
      )}

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
          placeholder="Ask about questions, signifiers, framing, sequencing…"
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
        The Chief-of-Staff advises on campaign design. You review and configure
        the actual project — nothing is changed automatically.
      </p>
    </div>
  );
}
