'use client';

import { useEffect, useRef, useState } from 'react';
import { getLocale, enabledLocales } from '@/lib/locales';
import { useSpeech } from '@/components/accessible/useSpeech';
import ListenButton from '@/components/accessible/ListenButton';
import QuickReplies from '@/components/accessible/QuickReplies';
import RotatingLabel from '@/components/accessible/RotatingLabel';

const AUDIO_ON = process.env.NEXT_PUBLIC_FEATURE_SURVEY_AUDIO === 'on';

interface Turn {
  role: 'user' | 'assistant';
  content: string;
}

const STARTERS = [
  'I want to set up a project for a new 150 MW solar project in a rural county.',
  'Help me configure a campaign where the community mostly worries about farmland and water.',
  'Set up a general community-solar sentiment campaign (no specific project yet).',
  'What research questions and signifiers should I pick for a wind project facing strong opposition?',
];

export default function CampaignSetupChat() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState('en');
  const [speakReplies, setSpeakReplies] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const turnsRef = useRef<Turn[]>([]);
  const speakRepliesRef = useRef(false);

  const locale = getLocale(language);
  const c = locale.controls;
  const speech = useSpeech(locale.bcp47);

  // Warm the hosted voice model on mount (and on language change) so the
  // first Read-aloud click isn't stuck on a cold start.
  useEffect(() => {
    speech.warm();
  }, [speech.warm]);

  function lastAssistant(): string | null {
    for (let i = turnsRef.current.length - 1; i >= 0; i--) {
      if (turnsRef.current[i].role === 'assistant') return turnsRef.current[i].content;
    }
    return null;
  }

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    setError(null);
    const next = [...turnsRef.current, { role: 'user' as const, content }];
    setTurns(next);
    turnsRef.current = next;
    setInput('');
    setBusy(true);
    try {
      const res = await fetch('/api/agents/campaign-setup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: next, language }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? 'The agent could not respond.');
      } else {
        const assistantText = data.reply as string;
        const withAssistant = [...next, { role: 'assistant' as const, content: assistantText }];
        setTurns(withAssistant);
        turnsRef.current = withAssistant;
        if (speakRepliesRef.current) speech.speak(assistantText);
      }
    } catch {
      setError('Network error reaching the agent.');
    } finally {
      setBusy(false);
      requestAnimationFrame(() =>
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
      );
    }
  }

  function toggleReadAloud() {
    const on = !speakReplies;
    setSpeakReplies(on);
    speakRepliesRef.current = on;
    if (on) {
      const last = lastAssistant();
      if (last) speech.speak(last);
    } else {
      speech.cancelSpeak();
    }
  }

  const canQuickReply = turnsRef.current.some((t) => t.role === 'assistant') && !busy;

  return (
    <div className="flex flex-col">
      {/* Accessibility bar */}
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {AUDIO_ON && speech.ttsSupported && (
          <button
            type="button"
            onClick={toggleReadAloud}
            aria-pressed={speakReplies}
            className={
              'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition ' +
              (speakReplies
                ? 'border-brand bg-brand text-white'
                : 'border-brand-rule bg-white text-brand-dark hover:bg-brand-light')
            }
          >
            <span aria-hidden>🔊</span>
            {speakReplies ? c.voiceOff : c.voiceOn}
          </button>
        )}
        {speech.preparing && <span className="text-xs text-brand">{c.preparing}</span>}
        {speech.speaking && <span className="text-xs text-ink-subtle">{c.speaking}</span>}
        {speech.listening && <span className="text-xs text-brand">{c.listening}</span>}
        <label className="ml-auto flex items-center gap-1.5 text-xs text-ink-subtle">
          <RotatingLabel />
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="rounded-md border border-brand-rule bg-white px-2 py-1 text-sm text-brand-dark focus:border-brand focus:outline-none"
          >
            {enabledLocales().map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div
        ref={listRef}
        className="mb-4 max-h-[52vh] min-h-[220px] overflow-y-auto rounded-lg border border-brand-rule bg-brand-vlight p-4"
      >
        {turns.length === 0 ? (
          <div>
            <p className="mb-3 text-sm text-ink-muted">
              Tell me about the project and I&rsquo;ll propose a full campaign
              setup — questions, signifiers, sources, and a brief. Try:
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
                {AUDIO_ON && t.role === 'assistant' && (
                  <div className="text-left">
                    <ListenButton text={t.content} bcp47={locale.bcp47} label={c.listen} />
                  </div>
                )}
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

      {error && <p className="mb-2 text-sm text-[#B23A2E]">{error}</p>}

      {canQuickReply && (
        <QuickReplies
          c={c}
          onSend={(t) => send(t)}
          onRepeat={() => {
            const last = lastAssistant();
            if (last) speech.speak(last);
          }}
          onOwnWords={() => inputRef.current?.focus()}
          disabled={busy}
        />
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2"
      >
        {speech.sttSupported && (
          <button
            type="button"
            onClick={() => speech.listen((t) => send(t))}
            disabled={busy}
            aria-label={c.mic}
            title={c.mic}
            className={
              'rounded-md border px-3 py-2 text-sm transition disabled:opacity-50 ' +
              (speech.listening
                ? 'border-brand bg-brand text-white'
                : 'border-brand-rule bg-white text-brand-dark hover:bg-brand-light')
            }
          >
            <span aria-hidden>🎙</span>
          </button>
        )}
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={c.inputPlaceholder}
          className="flex-1 rounded-md border border-brand-rule px-3 py-2 text-sm focus:border-brand focus:outline-none"
          disabled={busy}
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-dark disabled:opacity-50"
        >
          {c.send}
        </button>
      </form>

      <p className="mt-3 text-xs text-ink-subtle">
        The agent proposes a configuration; you review and create the campaign
        in Projects. Nothing is created automatically.
      </p>
    </div>
  );
}
