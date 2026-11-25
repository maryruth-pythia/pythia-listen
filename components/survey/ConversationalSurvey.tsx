'use client';

import { useEffect, useRef, useState } from 'react';
import { getLocale } from '@/lib/locales';
import { useSpeech } from '@/components/accessible/useSpeech';
import ListenButton from '@/components/accessible/ListenButton';

// RELEASE FLAG — community-facing voice (read-aloud, voice mode, mic). Off by
// default; NEXT_PUBLIC_FEATURE_SURVEY_AUDIO=on per environment (Preview only).
const AUDIO_ON = process.env.NEXT_PUBLIC_FEATURE_SURVEY_AUDIO === 'on';

interface Spec {
  title: string;
  intro: string;
  closing?: string;
}
interface Turn {
  role: 'user' | 'assistant';
  content: string;
}

export default function ConversationalSurvey({
  id,
  spec,
  language = 'en',
}: {
  id: string;
  spec: Spec;
  language?: string;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const responseId = useRef<string | null>(null);
  const bcp47 = getLocale(language).bcp47;
  const c = getLocale(language).controls;
  const speech = useSpeech(bcp47);

  async function send(userText?: string) {
    if (busy || done) return;
    const base = userText ? [...turns, { role: 'user' as const, content: userText }] : turns;
    if (userText) {
      setTurns(base);
      setInput('');
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/surveys/${id}/converse`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: base, responseId: responseId.current }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? 'Something went wrong — please try again.');
        return;
      }
      if (data.responseId) responseId.current = data.responseId;
      setTurns([...base, { role: 'assistant', content: data.reply }]);
      if (data.done) setDone(true);
    } catch {
      setError('Network error — please try again.');
    } finally {
      setBusy(false);
      requestAnimationFrame(() =>
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
      );
    }
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    send();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold" style={{ color: '#1F1330' }}>
        {spec.title}
      </h1>
      <p className="mt-1 text-sm" style={{ color: '#6A5F74' }}>
        {spec.intro}
      </p>

      <div
        ref={listRef}
        className="mt-4 max-h-[60vh] min-h-[260px] overflow-y-auto rounded-xl border p-4"
        style={{ borderColor: '#E7DCD0', background: '#fff' }}
      >
        <ul className="space-y-3">
          {turns.map((t, i) => (
            <li key={i} className={t.role === 'user' ? 'text-right' : 'text-left'}>
              <div
                className="inline-block max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-[15px]"
                style={
                  t.role === 'user'
                    ? { background: '#6A0FC2', color: '#fff' }
                    : { background: '#F3ECF7', color: '#2E2438' }
                }
              >
                {t.content}
              </div>
              {AUDIO_ON && t.role === 'assistant' && (
                <div className="text-left">
                  <ListenButton text={t.content} bcp47={bcp47} label={c.listen} />
                </div>
              )}
            </li>
          ))}
          {busy && (
            <li className="text-left">
              <div
                className="inline-block rounded-2xl px-3.5 py-2 text-[15px]"
                style={{ background: '#F3ECF7', color: '#9A8FA6' }}
              >
                …
              </div>
            </li>
          )}
        </ul>
      </div>

      {error && (
        <p className="mt-2 text-sm" style={{ color: '#B23A2E' }}>
          {error}
        </p>
      )}

      {done ? (
        <p
          className="mt-4 rounded-lg px-4 py-3 text-center text-sm font-medium"
          style={{ background: '#EAF3EC', color: '#2F6B3C' }}
        >
          ✓ Thank you — your response has been recorded.
        </p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim()) send(input.trim());
          }}
          className="mt-3 flex gap-2"
        >
          {speech.sttSupported && (
            <button
              type="button"
              onClick={() => speech.listen((t) => send(t))}
              disabled={busy}
              aria-label={c.mic}
              title={c.mic}
              className="rounded-lg border px-3 py-2.5 text-sm disabled:opacity-50"
              style={{
                borderColor: speech.listening ? '#6A0FC2' : '#E4DACB',
                background: speech.listening ? '#6A0FC2' : '#fff',
                color: speech.listening ? '#fff' : '#1F1330',
              }}
            >
              🎙
            </button>
          )}
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={c.inputPlaceholder}
            disabled={busy}
            className="flex-1 rounded-lg border px-3.5 py-2.5 text-[15px] outline-none"
            style={{ borderColor: '#E4DACB' }}
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: '#6A0FC2' }}
          >
            {c.send}
          </button>
        </form>
      )}
    </div>
  );
}
