'use client';

import { useEffect, useMemo, useState } from 'react';
import { getLocale } from '@/lib/locales';
import ListenButton from '@/components/accessible/ListenButton';
import { SERVER_TTS_LANGS } from '@/components/accessible/useSpeech';

// RELEASE FLAG — survey read-aloud ("Listen") audio. Off by default; set
// NEXT_PUBLIC_FEATURE_SURVEY_AUDIO=on per environment (Preview = sandbox only).
// Client component, so it's a NEXT_PUBLIC var referenced statically (inlined at
// build). See claude/pythia-feature-flags.md.
const AUDIO_ON = process.env.NEXT_PUBLIC_FEATURE_SURVEY_AUDIO === 'on';

// Local shapes (mirror SurveySpec — kept here so this client component doesn't
// import server-only agent code).
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
export interface SurveySpec {
  title: string;
  intro: string;
  signifiers: Signifier[];
  questions: Question[];
  closing?: string;
  photovoice?: boolean;
  mapping?: boolean;
  prePostSentiment?: boolean;
  rotateQuestionOrder?: boolean;
  /** Deliver as an AI-led conversation instead of a static form. */
  conversational?: boolean;
}

type Item =
  | { kind: 'signifier'; data: Signifier }
  | { kind: 'question'; data: Question };

type AnswerMap = Record<string, string | number>;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Accessible, fillable rendering of a SurveySpec — the respondent's view.
 * Voice: every prompt has a Listen button (via the shared locale + speech
 * layer). In `preview`, submitting just shows a confirmation instead of
 * posting (persistence endpoints are a later phase).
 */
export default function SurveyForm({
  spec,
  language = 'en',
  preview = false,
  onSubmit,
}: {
  spec: SurveySpec;
  language?: string;
  preview?: boolean;
  onSubmit?: (answers: AnswerMap) => void;
}) {
  const bcp47 = getLocale(language).bcp47;
  const c = getLocale(language).controls;

  // Pre-warm the hosted voice model so a respondent's first "Listen" tap isn't
  // stuck on a cold start. Fire-and-forget; the tiny clip is cached server-side
  // so this only actually generates once per server, not per visitor.
  useEffect(() => {
    if (!AUDIO_ON) return;
    const base = bcp47.toLowerCase().split('-')[0];
    if (!SERVER_TTS_LANGS.has(base)) return;
    fetch('/api/tts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'Hola.', lang: bcp47 }),
    }).catch(() => {});
  }, [bcp47]);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [done, setDone] = useState(false);

  const items: Item[] = useMemo(() => {
    const base: Item[] = [
      ...spec.signifiers.map((s) => ({ kind: 'signifier' as const, data: s })),
      ...spec.questions.map((q) => ({ kind: 'question' as const, data: q })),
    ];
    return spec.rotateQuestionOrder ? shuffle(base) : base;
    // Shuffle once per mount so order is stable while filling.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function set(id: string, v: string | number) {
    setAnswers((a) => ({ ...a, [id]: v }));
  }

  const label = (text: string) => (
    <div className="flex items-start justify-between gap-2">
      <span className="text-sm font-medium" style={{ color: '#1F1330' }}>{text}</span>
      {AUDIO_ON && <ListenButton text={text} bcp47={bcp47} label={c.listen} />}
    </div>
  );

  const Stance = ({ id, title }: { id: string; title: string }) => (
    <div className="rounded-lg border p-3" style={{ borderColor: '#E7DCD0', background: '#fff' }}>
      {label(title)}
      <input
        type="range"
        min={0}
        max={100}
        value={typeof answers[id] === 'number' ? (answers[id] as number) : 50}
        onChange={(e) => set(id, Number(e.target.value))}
        className="mt-2 w-full accent-brand"
      />
      <div className="mt-1 flex justify-between text-[11px]" style={{ color: '#9488A0' }}>
        <span>{c.stanceLow}</span>
        <span>{c.stanceHigh}</span>
      </div>
    </div>
  );

  if (done) {
    return (
      <div className="rounded-lg border p-6 text-center text-sm" style={{ borderColor: '#DDE8D9', background: '#F7FAF5', color: '#2F6B3C' }}>
        {spec.closing || c.thanks}
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (preview) { setDone(true); return; }
        onSubmit?.(answers);
        setDone(true);
      }}
      className="space-y-4"
    >
      <div>
        <h3 className="font-serif text-xl font-semibold" style={{ color: '#1F1330' }}>{spec.title}</h3>
        {spec.intro && (
          <div className="mt-1 flex items-start justify-between gap-2">
            <p className="text-sm" style={{ color: '#6A5F74' }}>{spec.intro}</p>
            {AUDIO_ON && <ListenButton text={spec.intro} bcp47={bcp47} label={c.listen} />}
          </div>
        )}
      </div>

      {spec.prePostSentiment && (
        <Stance id="stance_before" title={c.feelBefore} />
      )}

      {items.map((it) =>
        it.kind === 'signifier' ? (
          <div key={it.data.id} className="rounded-lg border p-3" style={{ borderColor: '#E7DCD0', background: '#fff' }}>
            {label(it.data.label)}
            {it.data.kind === 'dyad' ? (
              <div className="mt-2">
                <input
                  type="range" min={0} max={100}
                  value={typeof answers[it.data.id] === 'number' ? (answers[it.data.id] as number) : 50}
                  onChange={(e) => set(it.data.id, Number(e.target.value))}
                  className="w-full accent-brand"
                />
                <div className="mt-1 flex justify-between text-[11px]" style={{ color: '#9488A0' }}>
                  <span>{it.data.poleLow}</span>
                  <span>{it.data.poleHigh}</span>
                </div>
              </div>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {(it.data.corners ?? []).map((cc) => (
                  <label key={cc} className="cursor-pointer rounded-full border px-3 py-1 text-xs" style={{ borderColor: '#E7DCD0', color: '#2E2438' }}>
                    <input
                      type="radio" name={it.data.id} className="mr-1.5 accent-brand"
                      checked={answers[it.data.id] === cc}
                      onChange={() => set(it.data.id, cc)}
                    />
                    {cc}
                  </label>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div key={it.data.id} className="rounded-lg border p-3" style={{ borderColor: '#E7DCD0', background: '#fff' }}>
            {label(it.data.prompt)}
            {it.data.kind === 'choice' && it.data.choices?.length ? (
              <div className="mt-2 flex flex-col gap-1.5">
                {it.data.choices.map((cc) => (
                  <label key={cc} className="flex items-center gap-2 text-sm" style={{ color: '#2E2438' }}>
                    <input
                      type="radio" name={it.data.id} className="accent-brand"
                      checked={answers[it.data.id] === cc}
                      onChange={() => set(it.data.id, cc)}
                    />
                    {cc}
                  </label>
                ))}
              </div>
            ) : (
              <textarea
                rows={2}
                value={(answers[it.data.id] as string) ?? ''}
                onChange={(e) => set(it.data.id, e.target.value)}
                placeholder={c.answerPlaceholder}
                className="mt-2 w-full rounded-md border px-3 py-2 text-sm focus:outline-none"
                style={{ borderColor: '#E7DCD0' }}
              />
            )}
          </div>
        )
      )}

      {spec.photovoice && (
        <div className="rounded-lg border border-dashed p-3 text-sm" style={{ borderColor: '#E7DCD0', color: '#6A5F74' }}>
          📷 Add a photo with a short story (optional).
          <input type="file" accept="image/*" className="mt-2 block text-xs" />
        </div>
      )}
      {spec.mapping && (
        <div className="rounded-lg border border-dashed p-3 text-sm" style={{ borderColor: '#E7DCD0', color: '#6A5F74' }}>
          📍 Mark a place on the map (optional). Map loads on the live survey.
        </div>
      )}

      {spec.prePostSentiment && (
        <Stance id="stance_after" title={c.feelAfter} />
      )}

      <button
        type="submit"
        className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-dark"
      >
        {preview ? 'Try submit (preview)' : c.submit}
      </button>
    </form>
  );
}
