'use client';

import { useEffect, useRef, useState } from 'react';
import { getLocale, enabledLocales } from '@/lib/locales';
import { useSpeech } from '@/components/accessible/useSpeech';
import ListenButton from '@/components/accessible/ListenButton';
import QuickReplies from '@/components/accessible/QuickReplies';
import RotatingLabel from '@/components/accessible/RotatingLabel';
import SurveyForm from '@/components/survey/SurveyForm';
import { QRCodeSVG } from 'qrcode.react';

const AUDIO_ON = process.env.NEXT_PUBLIC_FEATURE_SURVEY_AUDIO === 'on';

interface Turn {
  role: 'user' | 'assistant';
  content: string;
}

interface Signifier {
  id: string;
  label: string;
  kind: 'dyad' | 'triad';
  poleLow?: string;
  poleHigh?: string;
  corners?: [string, string, string];
}
interface Question {
  id: string;
  prompt: string;
  kind: 'open' | 'choice';
  choices?: string[];
}
interface SurveySpec {
  title: string;
  intro: string;
  signifiers: Signifier[];
  questions: Question[];
  closing?: string;
  photovoice?: boolean;
  mapping?: boolean;
  prePostSentiment?: boolean;
  rotateQuestionOrder?: boolean;
  conversational?: boolean;
}

/** Pure client-side parser — kept here so we don't bundle server-only agent code. */
function parseSurveySpec(reply: string): { spec: SurveySpec | null; prose: string } {
  const fence = reply.match(/```json\s*([\s\S]*?)```/i);
  if (!fence) return { spec: null, prose: reply };
  try {
    const parsed = JSON.parse(fence[1].trim());
    if (
      parsed &&
      typeof parsed.title === 'string' &&
      Array.isArray(parsed.signifiers) &&
      Array.isArray(parsed.questions)
    ) {
      return { spec: parsed as SurveySpec, prose: reply.replace(fence[0], '').trim() };
    }
  } catch {
    /* fall through */
  }
  return { spec: null, prose: reply };
}


export default function SurveyBuilderChat({ campaignId, initialDraft }: { campaignId?: string; initialDraft?: { id: string; campaignId?: string; language?: string; spec?: Record<string, unknown> } }) {
  const dspec = initialDraft?.spec;
  const dInProgress = dspec ? dspec.inProgress === true : false;
  const initTurns: Turn[] =
    dspec && dInProgress && Array.isArray(dspec.conversation)
      ? (dspec.conversation as Turn[])
      : [];
  const initSurvey: SurveySpec | null =
    dspec && !dInProgress && typeof dspec.title === 'string'
      ? (dspec as unknown as SurveySpec)
      : null;
  const [turns, setTurns] = useState<Turn[]>(initTurns);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [survey, setSurvey] = useState<SurveySpec | null>(initSurvey);
  const [language, setLanguage] = useState(initialDraft?.language ?? 'en');
  const [speakReplies, setSpeakReplies] = useState(false);
  const [feedId, setFeedId] = useState<string | undefined>(initialDraft?.campaignId ?? campaignId);
  const [draftId, setDraftId] = useState<string | null>(initialDraft?.id ?? null);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const turnsRef = useRef<Turn[]>(initTurns);
  const speakRepliesRef = useRef(false);

  const locale = getLocale(language);
  const c = locale.controls;
  const speech = useSpeech(locale.bcp47);

  // Warm the hosted voice model on mount (and on language change) so the
  // first Read-aloud click isn't stuck on a cold start.
  useEffect(() => {
    speech.warm();
  }, [speech.warm]);

  // Load the operator's projects so this survey can be pointed at the one it feeds.
  useEffect(() => {
    fetch('/api/campaigns', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d.campaigns) ? d.campaigns : [];
        setProjects(list.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
      })
      .catch(() => {});
  }, []);

  function lastAssistant(): string | null {
    for (let i = turnsRef.current.length - 1; i >= 0; i--) {
      if (turnsRef.current[i].role === 'assistant') return turnsRef.current[i].content;
    }
    return null;
  }

  function toggleReadAloud() {
    const on = !speakReplies;
    setSpeakReplies(on);
    speakRepliesRef.current = on;
    if (on) {
      const last = lastAssistant();
      if (last) {
        speech.speak(last);
      } else if (turnsRef.current.length === 0) {
        // Starter screen (nothing said yet): read the intro + the example prompts.
        speech.speak([c.chatIntro, ...c.chatStarters].join('. '));
      }
    } else {
      speech.cancelSpeak();
    }
  }

  // When the language is switched, translate the most recent assistant message
  // so the text on screen — and the read-aloud voice — match the new language.
  // (New replies already come back in the selected language from the agent.)
  async function changeLanguage(newLang: string) {
    setLanguage(newLang);
    let idx = -1;
    for (let i = turnsRef.current.length - 1; i >= 0; i--) {
      if (turnsRef.current[i].role === 'assistant') {
        idx = i;
        break;
      }
    }
    if (idx < 0) return;
    const original = turnsRef.current[idx].content;
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: original, target: newLang }),
      });
      const data = await res.json();
      const translated = typeof data?.text === 'string' ? data.text : '';
      if (translated) {
        const updated = turnsRef.current.map((t, i) =>
          i === idx ? { ...t, content: translated } : t
        );
        setTurns(updated);
        turnsRef.current = updated;
      }
    } catch {
      /* keep the original on failure */
    }
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
      const res = await fetch('/api/agents/survey-builder', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: next, campaignId: feedId, language }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? 'The agent could not respond.');
      } else {
        const { spec, prose } = parseSurveySpec(data.reply as string);
        const assistantText = spec
          ? prose || 'Built your survey — preview is on the right.'
          : (data.reply as string);
        const withAssistant = [...next, { role: 'assistant' as const, content: assistantText }];
        setTurns(withAssistant);
        turnsRef.current = withAssistant;
        if (spec) {
          setSurvey(spec);
          // Persist as a DRAFT so work survives navigation and shows on the
          // Surveys page. Reuses draftId so repeated builds update one record.
          fetch('/api/agents/publish-survey', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              spec,
              campaignId: feedId,
              languages: [language],
              status: 'draft',
              id: draftId,
            }),
          })
            .then((r) => r.json())
            .then((d) => {
              if (d?.id) setDraftId(d.id);
            })
            .catch(() => {});
        } else {
          // Auto-save the in-progress conversation as a draft so leaving
          // mid-build doesn't lose it and it shows on the Surveys page.
          const draftTitle = (
            withAssistant.find((t) => t.role === 'user')?.content ?? 'Untitled draft'
          ).slice(0, 60);
          fetch('/api/agents/publish-survey', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              spec: {
                title: draftTitle,
                intro: '',
                signifiers: [],
                questions: [],
                conversation: withAssistant,
                inProgress: true,
              },
              campaignId: feedId,
              languages: [language],
              status: 'draft',
              id: draftId,
            }),
          })
            .then((r) => r.json())
            .then((d) => {
              if (d?.id) setDraftId(d.id);
            })
            .catch(() => {});
        }
        if (speakRepliesRef.current) speech.speak(assistantText);
      }
    } catch {
      setError('Network error reaching the agent.');
    } finally {
      setBusy(false);
      requestAnimationFrame(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
      });
    }
  }

  const canQuickReply = turnsRef.current.some((t) => t.role === 'assistant') && !busy;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* Conversation */}
      <div className="flex flex-col">
        {/* Accessibility bar: voice + language */}
        {/* Which project this survey feeds */}
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-medium text-ink-muted">This survey feeds:</span>
          <select
            value={feedId ?? ''}
            onChange={(e) => setFeedId(e.target.value || undefined)}
            className="rounded-md border border-brand-rule bg-white px-2 py-1 text-sm text-brand-dark focus:border-brand focus:outline-none"
          >
            <option value="">General (no specific project)</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
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
              onChange={(e) => changeLanguage(e.target.value)}
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
          className="mb-3 max-h-[52vh] min-h-[240px] overflow-y-auto rounded-lg border border-brand-rule bg-brand-vlight p-4"
        >
          {turns.length === 0 ? (
            <div>
              <p className="mb-3 text-sm text-ink-muted">{c.chatIntro}</p>
              <div className="flex flex-col gap-2">
                {c.chatStarters.map((s) => (
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
                      'inline-block max-w-[88%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ' +
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
        <p className="mt-3 text-xs text-ink-subtle">{c.selfSignNote}</p>
      </div>

      {/* Live survey preview */}
      <div className="rounded-lg border border-brand-rule bg-white p-5">
        {survey ? (
          <SurveyPreview spec={survey} onClear={() => setSurvey(null)} language={language} campaignId={feedId} draftId={draftId} onPublished={() => setDraftId(null)} />
        ) : (
          <div className="flex h-full min-h-[240px] flex-col items-center justify-center text-center">
            <div
              aria-hidden
              className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl text-white"
              style={{ background: 'linear-gradient(90deg,#FCC029,#EC2BFC,#6A0FC2)' }}
            >
              ✎
            </div>
            <p className="max-w-xs text-sm text-ink-muted">
              Your live survey appears here the moment you approve the draft. You’ll
              see exactly what participants see.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function SurveyPreview({
  spec,
  onClear,
  language,
  campaignId,
  draftId,
  onPublished,
}: {
  spec: SurveySpec;
  onClear: () => void;
  language: string;
  campaignId?: string;
  draftId?: string | null;
  onPublished?: () => void;
}) {
  const [publishing, setPublishing] = useState(false);
  const [conversational, setConversational] = useState<boolean>(!!spec.conversational);
  const [link, setLink] = useState<string | null>(null);
  const [pubErr, setPubErr] = useState<string | null>(null);

  async function publish() {
    setPublishing(true);
    setPubErr(null);
    try {
      const res = await fetch('/api/agents/publish-survey', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          spec: { ...spec, conversational },
          campaignId,
          languages: [language],
          status: 'published',
          id: draftId ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) setPubErr(data?.error ?? 'Could not publish.');
      else {
        onPublished?.();
        setLink(
          typeof window !== 'undefined'
            ? window.location.origin + data.url
            : data.url
        );
      }
    } catch {
      setPubErr('Network error publishing.');
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="rounded-full bg-brand-vlight px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-dark">
          Live preview · what the community sees
        </span>
        <button
          onClick={onClear}
          className="text-xs text-ink-subtle underline underline-offset-2 hover:text-brand-dark"
        >
          Clear
        </button>
      </div>

      <div className="max-h-[62vh] overflow-y-auto rounded-lg border border-brand-rule bg-brand-vlight p-4">
        <SurveyForm spec={spec} language={language} preview />
      </div>

      <div className="mt-3">
        <label className="mb-3 flex items-start gap-2 text-sm" style={{ color: '#1F1330' }}>
          <input
            type="checkbox"
            checked={conversational}
            onChange={(e) => setConversational(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            Deliver as an <strong>AI-led conversation</strong> — the community answers by chatting
            (with voice), instead of filling a static form.
          </span>
        </label>
        <button
          onClick={publish}
          disabled={publishing}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-dark disabled:opacity-50"
        >
          {publishing ? 'Publishing…' : 'Publish & get shareable link'}
        </button>
        {pubErr && <p className="mt-2 text-sm text-[#B23A2E]">{pubErr}</p>}
        {link && (
          <div className="mt-3 rounded-lg border border-brand-rule bg-white p-3">
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={link}
                target="_blank"
                rel="noreferrer"
                className="break-all text-sm text-brand underline underline-offset-2"
              >
                {link}
              </a>
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(link)}
                className="rounded-md border border-brand-rule bg-white px-3 py-1.5 text-xs text-ink-muted transition hover:border-brand hover:text-brand-dark"
              >
                Copy link
              </button>
            </div>
            <div className="mt-3 flex items-start gap-3">
              <div className="flex-none rounded-lg border border-brand-rule p-2">
                <QRCodeSVG value={link} size={116} level="M" bgColor="#ffffff" fgColor="#1F1330" />
              </div>
              <p className="text-xs text-ink-muted">
                Share this link or QR in a WhatsApp or Viber chat, a community
                group, or print it on a flyer. Anyone who taps or scans it
                answers on the web — no app, no login, and no phone number
                collected.
              </p>
            </div>
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-ink-subtle">
        This is the real fillable form, in the language selected above. Publish to
        get a link anyone can answer — no login, no identifying info collected.
      </p>
    </div>
  );
}
