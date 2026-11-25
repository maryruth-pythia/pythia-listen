'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import type {
  Message,
  Session,
  Language,
  ConsentRecord,
  IdentificationPreference,
  ParticipationConsentState,
} from '@/lib/types';
import type { Signifier } from '@/lib/signifiers';
import { copyFor } from '@/lib/i18n';
import { getLocale } from '@/lib/locales';
import { Markdown } from './Markdown';
import BeginConsent from './BeginConsent';
import DemographicsForm from './DemographicsForm';
import SignifyingPanel from './signifying/SignifyingPanel';
import PhotovoicePanel from './photovoice/PhotovoicePanel';

// RELEASE FLAG — community-facing voice (read-aloud, voice mode, mic). Off by
// default; NEXT_PUBLIC_FEATURE_SURVEY_AUDIO=on per environment (Preview only).
const AUDIO_ON = process.env.NEXT_PUBLIC_FEATURE_SURVEY_AUDIO === 'on';

// Mapping uses Leaflet which requires window — load client-only.
const MappingPanel = dynamic(() => import('./mapping/MappingPanel'), {
  ssr: false,
  loading: () => (
    <p className="mt-8 text-sm italic text-ink-subtle">Loading the map…</p>
  ),
});

type Stage =
  | 'begin_consent'
  | 'demographics'
  | 'chat'
  | 'signifying'
  | 'photovoice'
  | 'mapping'
  | 'recap'
  | 'consent'
  | 'advocacy'
  | 'closed';

function deriveInitialStage(session: Session, messageCount: number, demographicsEnabled = true): Stage {
  if (session.status === 'closed' && session.consent) return 'advocacy';
  if (session.status === 'closed') return 'closed';
  if (session.consent) return 'advocacy';
  if (session.status === 'consented') return 'advocacy';
  if (session.status === 'recap') return 'consent';
  if (session.demographics) return 'chat';
  if (session.participationConsentState === 'yes_begin') return demographicsEnabled ? 'demographics' : 'chat';
  if (session.participationConsentState === 'declined') return 'closed';
  if (session.participationConsentState === 'questions_first') return 'chat';
  // No consent state yet: if AI has spoken at least once, show begin-consent buttons.
  if (messageCount > 0) return 'begin_consent';
  return 'begin_consent';
}

interface Props {
  session: Session;
  initialMessages: Message[];
  /** Project signifiers (operator-selected) for the participant to self-score. */
  signifiers?: Signifier[];
  /** Whether the project has photovoice enabled. */
  photovoiceEnabled?: boolean;
  /** Whether the project has mapping enabled. */
  mappingEnabled?: boolean;
  demographicsEnabled?: boolean;
  /** Map center for the mapping flow. */
  mapCenter?: { lat: number; lng: number; zoom?: number };
  /** Auto-enable voice mode (set from ?voice=1 on the start page). */
  voiceFirst?: boolean;
}

export default function Chat({
  session,
  initialMessages,
  signifiers = [],
  photovoiceEnabled = false,
  mappingEnabled = false,
  demographicsEnabled = true,
  mapCenter,
  voiceFirst = false,
}: Props) {
  const c = copyFor(session.language);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [streamingText, setStreamingText] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [input, setInput] = useState('');
  const [stage, setStage] = useState<Stage>(deriveInitialStage(session, initialMessages.length, demographicsEnabled));
  const [recapText, setRecapText] = useState<string | null>(null);
  const [advocacyText, setAdvocacyText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [recapLoading, setRecapLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(true);
  const [isSafari, setIsSafari] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bootstrapRanRef = useRef(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const voiceModeRef = useRef(false);

  // Auto-scroll on new content.
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, streamingText, stage]);

  // Return focus to the textarea when streaming ends so participants can
  // just start typing without clicking first.
  useEffect(() => {
    if (!streaming && stage === 'chat') {
      textareaRef.current?.focus();
    }
  }, [streaming, stage]);

  // Detect Web Speech API support (browser-only, after mount).
  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    const sttOk = !!(w.SpeechRecognition || w.webkitSpeechRecognition);
    const ttsOk = !!window.speechSynthesis;
    setSpeechSupported(sttOk);
    setTtsSupported(ttsOk);
    // Safari detection (includes iOS Safari and macOS Safari)
    const ua = navigator.userAgent;
    setIsSafari(/^((?!chrome|android).)*safari/i.test(ua));
    // Auto-enable voice mode if the participant chose it on the start page.
    if (AUDIO_ON && voiceFirst && ttsOk) {
      setVoiceMode(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cancel any in-flight speech on unmount.
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  // Keep voiceModeRef in sync so speakText() can read it without stale closure.
  useEffect(() => {
    voiceModeRef.current = voiceMode;
  }, [voiceMode]);

  /** Strip markdown syntax so it reads naturally via TTS. */
  function stripMarkdown(text: string): string {
    return text
      .replace(/#{1,6}\s+/g, '')           // headings
      .replace(/\*\*(.+?)\*\*/g, '$1')     // bold
      .replace(/\*(.+?)\*/g, '$1')         // italic
      .replace(/`{1,3}[^`]*`{1,3}/g, '')   // code
      .replace(/\[(.+?)\]\(.+?\)/g, '$1')  // links
      .replace(/^[-*+]\s+/gm, '')          // list bullets
      .replace(/^\d+\.\s+/gm, '')          // numbered lists
      .replace(/\n{2,}/g, '. ')            // paragraph breaks → pauses
      .replace(/\n/g, ' ')
      .trim();
  }

  /** Speak text via Web Speech Synthesis. If voice mode is on and STT is
   *  supported, re-opens the mic automatically once speaking ends. */
  function speakText(text: string) {
    if (!voiceModeRef.current) return;
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    // Cancel any previous utterance.
    window.speechSynthesis.cancel();

    const clean = stripMarkdown(text);
    if (!clean) return;

    const utterance = new SpeechSynthesisUtterance(clean);
    // Single source of truth for language → voice code (lib/locales.ts),
    // shared with the operator/builder flow so the two never drift.
    utterance.lang = getLocale(session.language).bcp47;
    utterance.rate = 0.95;
    utterance.pitch = 1;

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => {
      setSpeaking(false);
      utteranceRef.current = null;
      // Auto-open mic if still in voice mode.
      if (voiceModeRef.current) startListening();
    };
    utterance.onerror = () => {
      setSpeaking(false);
      utteranceRef.current = null;
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }

  function stopSpeaking() {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    utteranceRef.current = null;
  }

  function startListening() {
    const w = window as unknown as Record<string, unknown>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (w.SpeechRecognition || w.webkitSpeechRecognition) as any;
    if (!SR) return;
    const rec = new SR();
    rec.lang = getLocale(session.language).bcp47;
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e: { resultIndex: number; results: SpeechRecognitionResultList }) => {
      let transcript = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) transcript += e.results[i][0].transcript;
      }
      if (transcript) {
        setInput((prev) => prev + (prev.length > 0 && !prev.endsWith(' ') ? ' ' : '') + transcript);
      }
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.start();
    recognitionRef.current = rec;
    setListening(true);
    textareaRef.current?.focus();
  }

  function stopListening() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  }

  // If there are zero messages on mount, kick off the AI's opening turn.
  // Guarded against React 18 StrictMode's intentional double-effect-fire
  // (which was producing two opening messages).
  useEffect(() => {
    if (bootstrapRanRef.current) return;
    if (messages.length > 0) return;
    bootstrapRanRef.current = true;
    void sendToAI('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sendToAI(userMessage: string) {
    setError(null);
    setStreaming(true);
    setStreamingText('');

    // Optimistically add the user message to the UI.
    if (userMessage.trim().length > 0) {
      setMessages((prev) => [
        ...prev,
        {
          id: 'optimistic-' + Date.now(),
          sessionId: session.id,
          role: 'user',
          content: userMessage,
          createdAt: new Date().toISOString(),
        },
      ]);
    }

    try {
      const res = await fetch('/api/conversation', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id, userMessage }),
      });

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => 'unknown');
        throw new Error(errText || 'Request failed');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let assembled = '';
      let receivedError: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6);
          if (payload === '[DONE]') break;
          try {
            const obj = JSON.parse(payload);
            if (obj.error) {
              receivedError = obj.error;
            } else if (obj.delta) {
              assembled += obj.delta;
              setStreamingText(assembled);
            }
          } catch {
            // Ignore malformed lines.
          }
        }
      }

      if (receivedError) {
        setError(receivedError);
      } else {
        // Move streamed text into the message list.
        setMessages((prev) => [
          ...prev,
          {
            id: 'asst-' + Date.now(),
            sessionId: session.id,
            role: 'assistant',
            content: assembled,
            createdAt: new Date().toISOString(),
          },
        ]);
        // In voice mode: read Pythia's reply aloud, then re-open mic.
        if (assembled) speakText(assembled);
      }
      setStreamingText('');
    } catch (e) {
      setError((e as Error).message ?? c.chat.error);
    } finally {
      setStreaming(false);
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || streaming) return;
    setInput('');
    await sendToAI(trimmed);
  }

  async function handleWrapUp() {
    if (streaming) return;
    // Sequence the optional structured-capture steps: signifying → photovoice
    // → mapping → recap. Skip any step the project hasn't configured or the
    // participant has already completed.
    advanceToNextOptionalStep();
  }

  function advanceToNextOptionalStep() {
    // Check === undefined (not !length) so an empty array (skip-all) still advances.
    if (signifiers.length > 0 && session.signifierResponses === undefined) {
      setStage('signifying');
      return;
    }
    if (photovoiceEnabled && !session.photovoiceEntries) {
      setStage('photovoice');
      return;
    }
    if (mappingEnabled && !session.mapPins) {
      setStage('mapping');
      return;
    }
    void generateRecap();
  }

  async function generateRecap() {
    setStreaming(true);
    setRecapLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/conversation/${session.id}/recap`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Recap failed');
      setRecapText(data.recap);
      setStage('recap');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setStreaming(false);
      setRecapLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-6 sm:px-6">
      <header className="mb-4 flex items-center justify-between border-b border-brand-rule pb-3">
        <Link href="/" className="text-sm text-brand hover:underline">
          {c.common.back}
        </Link>
        <span className="text-xs uppercase tracking-[0.15em] text-brand">
          Pythia
        </span>
      </header>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto pb-4"
        style={{ minHeight: '60vh' }}
      >
        <div className="space-y-4">
          {messages.map((m) => (
            <Bubble key={m.id} role={m.role} content={m.content} />
          ))}
          {streaming && streamingText && (
            <Bubble role="assistant" content={streamingText} />
          )}
          {streaming && !streamingText && (
            <p className="text-sm italic text-ink-subtle">
              {c.chat.pythiaIsTyping}
            </p>
          )}
          {error && (
            <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}
        </div>

        {stage === 'begin_consent' && messages.length > 0 && !streaming && (
          <BeginConsent
            language={session.language}
            sessionId={session.id}
            onChosen={(state: ParticipationConsentState) => {
              if (state === 'yes_begin') setStage(demographicsEnabled ? 'demographics' : 'chat');
              else if (state === 'declined') setStage('closed');
              else setStage('chat'); // questions_first
            }}
          />
        )}

        {stage === 'demographics' && (
          <DemographicsForm
            language={session.language}
            sessionId={session.id}
            onSubmitted={() => setStage('chat')}
          />
        )}

        {stage === 'closed' && !session.consent && (
          <section className="mt-8 rounded-lg border border-brand-rule bg-brand-vlight p-5">
            <h2 className="font-serif text-lg font-semibold text-brand-dark">
              {c.beginConsent.declinedHeading}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              {c.beginConsent.declinedBody}
            </p>
            <Link
              href="/"
              className="mt-4 inline-block rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
            >
              {c.common.done}
            </Link>
          </section>
        )}

        {stage === 'signifying' && (
          <SignifyingPanel
            sessionId={session.id}
            language={session.language}
            signifiers={signifiers}
            onSubmitted={() => {
              // Mark signifiers as captured locally so advanceToNextOptionalStep
              // moves us past them. (Server has the real data.)
              session.signifierResponses = session.signifierResponses ?? [];
              advanceToNextOptionalStep();
            }}
          />
        )}

        {stage === 'photovoice' && (
          <PhotovoicePanel
            sessionId={session.id}
            language={session.language}
            onSubmitted={() => {
              session.photovoiceEntries = session.photovoiceEntries ?? [];
              advanceToNextOptionalStep();
            }}
          />
        )}

        {stage === 'mapping' && (
          <MappingPanel
            sessionId={session.id}
            language={session.language}
            center={mapCenter}
            onSubmitted={() => {
              session.mapPins = session.mapPins ?? [];
              advanceToNextOptionalStep();
            }}
          />
        )}

        {recapLoading && (
          <section className="mt-8 rounded-lg border border-brand-rule bg-brand-vlight p-6 text-center">
            <p className="text-sm font-medium text-brand-dark">
              {session.language === 'es'
                ? 'Estamos procesando lo que compartiste…'
                : session.language === 'tl'
                ? 'Pinoproseso namin ang inyong mga sinabi…'
                : 'We\'re processing what you shared…'}
            </p>
            <p className="mt-2 text-xs text-ink-muted">
              {session.language === 'es'
                ? 'Pythia preparará un resumen de tus pensamientos. Esto toma un momento.'
                : session.language === 'tl'
                ? 'Maghahanda si Pythia ng buod ng inyong mga naiisip. Sandali lang ito.'
                : 'Pythia will put together a summary of your thoughts. This takes just a moment.'}
            </p>
            <div className="mt-4 flex justify-center gap-1">
              <span className="h-2 w-2 animate-bounce rounded-full bg-brand [animation-delay:0ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-brand [animation-delay:150ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-brand [animation-delay:300ms]" />
            </div>
          </section>
        )}

        {stage === 'recap' && recapText && (
          <RecapPanel
            text={recapText}
            language={session.language}
            onConfirm={() => setStage('consent')}
            onCorrect={() => {
              // Drop them back into chat to add or correct. They can hit
              // "I'd like to wrap up" again to regenerate the recap.
              setRecapText(null);
              setStage('chat');
            }}
          />
        )}
        {stage === 'consent' && (
          <ConsentPanel
            sessionId={session.id}
            language={session.language}
            onSubmitted={async () => {
              setStreaming(true);
              try {
                const res = await fetch(
                  `/api/conversation/${session.id}/advocacy`,
                  { method: 'POST' }
                );
                const data = await res.json();
                if (!res.ok) throw new Error(data.error ?? 'Advocacy failed');
                setAdvocacyText(data.advocacy);
                setStage('advocacy');
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setStreaming(false);
              }
            }}
          />
        )}
        {stage === 'advocacy' && advocacyText && (
          <AdvocacyPanel text={advocacyText} language={session.language} />
        )}
      </div>

      {(stage === 'chat') && (
        <form
          onSubmit={handleSend}
          className="border-t border-brand-rule pt-4"
        >
          {messages.filter((m) => m.role === 'user').length === 0 && !streaming && (
            <p className="mb-3 rounded-md border border-brand-rule bg-brand-vlight p-3 text-xs leading-relaxed text-ink-muted">
              {c.chat.firstTurnHint}
            </p>
          )}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              messages.filter((m) => m.role === 'user').length === 0
                ? c.chat.placeholderFirstTurn
                : c.chat.placeholder
            }
            autoFocus={messages.filter((m) => m.role === 'user').length === 0}
            rows={3}
            disabled={streaming}
            onKeyDown={(e) => {
              // Enter sends. Shift+Enter inserts a newline.
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(e as unknown as React.FormEvent);
              }
            }}
            className="w-full resize-none rounded-md border border-brand-rule bg-white p-3 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:opacity-60"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={streaming || !input.trim()}
              className="rounded-md bg-brand px-5 py-2 text-sm font-medium text-white transition hover:bg-brand-dark disabled:opacity-50"
            >
              {c.chat.send}
            </button>
            {AUDIO_ON && speechSupported && (
              <>
                {/* One-shot mic button — always available */}
                <button
                  type="button"
                  onClick={listening ? stopListening : startListening}
                  disabled={streaming || speaking}
                  title={listening ? 'Stop recording' : 'Speak your response'}
                  className={`flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition disabled:opacity-50 ${
                    listening
                      ? 'animate-pulse border-red-300 bg-red-50 text-red-600'
                      : 'border-brand-rule bg-white text-ink-muted hover:border-brand hover:text-brand-dark'
                  }`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" y1="19" x2="12" y2="23"/>
                    <line x1="8" y1="23" x2="16" y2="23"/>
                  </svg>
                  <span>{listening ? 'Listening…' : 'Speak'}</span>
                </button>

                {/* Voice-first mode toggle */}
                <button
                  type="button"
                  onClick={() => {
                    const next = !voiceMode;
                    setVoiceMode(next);
                    if (!next) {
                      stopSpeaking();
                      stopListening();
                    }
                  }}
                  title={voiceMode ? 'Turn off voice mode' : 'Turn on voice mode (Pythia speaks + auto-mic)'}
                  className={`flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition ${
                    voiceMode
                      ? 'border-brand bg-brand text-white'
                      : 'border-brand-rule bg-white text-ink-muted hover:border-brand hover:text-brand-dark'
                  }`}
                >
                  {/* Speaker icon */}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                  </svg>
                  <span>{voiceMode ? 'Voice on' : 'Voice'}</span>
                </button>

                {/* TTS not available warning */}
                {voiceMode && !ttsSupported && (
                  <p className="w-full text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                    Your browser doesn&apos;t support voice output. Pythia&apos;s replies won&apos;t be read aloud — you can still use the mic to speak your responses.
                  </p>
                )}
                {/* Safari unreliable TTS warning */}
                {voiceMode && ttsSupported && isSafari && (
                  <p className="w-full text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                    Voice mode may be unreliable in Safari. For the best experience, try Chrome or Edge.
                  </p>
                )}

                {/* Speaking indicator + stop button */}
                {speaking && (
                  <button
                    type="button"
                    onClick={stopSpeaking}
                    className="flex items-center gap-1.5 animate-pulse rounded-md border border-brand bg-brand-vlight px-3 py-2 text-sm font-medium text-brand"
                    title="Pythia is speaking — click to stop"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="6" width="12" height="12" rx="1"/>
                    </svg>
                    <span>Speaking…</span>
                  </button>
                )}
              </>
            )}
            <button
              type="button"
              onClick={handleWrapUp}
              disabled={streaming || messages.length < 2}
              className="rounded-md border border-brand-rule bg-white px-4 py-2 text-sm text-ink-muted transition hover:border-brand hover:text-brand-dark disabled:opacity-50"
            >
              {c.chat.wrapUp}
            </button>
          </div>
        </form>
      )}
    </main>
  );
}

function Bubble({ role, content }: { role: string; content: string }) {
  const isUser = role === 'user';
  return (
    <div
      className={`max-w-[85%] rounded-lg p-4 text-sm leading-relaxed ${
        isUser
          ? 'ml-auto whitespace-pre-wrap bg-brand text-white'
          : 'bg-brand-vlight text-ink'
      }`}
    >
      {isUser ? content : <Markdown content={content} />}
    </div>
  );
}

function RecapPanel({
  text,
  language,
  onConfirm,
  onCorrect,
}: {
  text: string;
  language: Language;
  onConfirm: () => void;
  onCorrect: () => void;
}) {
  const c = copyFor(language);
  return (
    <section className="mt-8 rounded-lg border-l-4 border-brand bg-brand-light p-5">
      <h2 className="font-serif text-lg font-semibold text-brand-dark">
        {c.recap.heading}
      </h2>
      <p className="mt-1 text-xs italic text-ink-muted">{c.recap.intro}</p>
      <Markdown
        content={text}
        className="mt-3 text-sm leading-relaxed text-ink"
      />

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
        >
          {c.recap.correct}
        </button>
        <button
          type="button"
          onClick={onCorrect}
          className="rounded-md border border-brand-rule bg-white px-4 py-2 text-sm text-brand-dark hover:border-brand"
        >
          {c.recap.edit}
        </button>
      </div>
    </section>
  );
}

function ConsentPanel({
  sessionId,
  language,
  onSubmitted,
}: {
  sessionId: string;
  language: Language;
  onSubmitted: () => Promise<void> | void;
}) {
  const c = copyFor(language);
  const [shareDeveloper, setShareDeveloper] = useState(false);
  const [shareFunder, setShareFunder] = useState(false);
  const [sharePublic, setSharePublic] = useState(false);
  const [identification, setIdentification] = useState<IdentificationPreference>('anonymous');
  const [identificationDescription, setIdentificationDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setErr(null);
    try {
      const body: Partial<ConsentRecord> = {
        mayShareWithDeveloper: shareDeveloper,
        mayShareWithFunder: shareFunder,
        mayShareInPublicReport: sharePublic,
        identification,
        identificationDescription:
          identification === 'self_described'
            ? identificationDescription.trim() || undefined
            : undefined,
        notes: notes.trim() ? notes.trim() : undefined,
      };
      const res = await fetch(`/api/conversation/${sessionId}/consent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Consent save failed');
      }
      await onSubmitted();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 rounded-lg border border-brand-rule bg-white p-5">
      <h2 className="font-serif text-lg font-semibold text-brand-dark">
        {c.consent.heading}
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-ink-muted">
        {c.consent.intro}
      </p>

      <fieldset className="mt-5 space-y-3">
        {[
          {
            id: 'dev' as const,
            v: shareDeveloper,
            set: setShareDeveloper,
            label: c.consent.shareDeveloper,
            help: c.consent.shareDeveloperHelp,
          },
          {
            id: 'fun' as const,
            v: shareFunder,
            set: setShareFunder,
            label: c.consent.shareFunder,
            help: c.consent.shareFunderHelp,
          },
          {
            id: 'pub' as const,
            v: sharePublic,
            set: setSharePublic,
            label: c.consent.sharePublic,
            help: c.consent.sharePublicHelp,
          },
        ].map((opt) => (
          <label
            key={opt.id}
            className="flex cursor-pointer items-start gap-3 rounded-md border border-brand-rule p-3 hover:border-brand"
          >
            <input
              type="checkbox"
              checked={opt.v}
              onChange={(e) => opt.set(e.target.checked)}
              className="mt-1 h-4 w-4 accent-brand"
            />
            <span>
              <span className="block text-sm font-medium text-ink">
                {opt.label}
              </span>
              <span className="mt-1 block text-xs text-ink-muted">
                {opt.help}
              </span>
            </span>
          </label>
        ))}
      </fieldset>

      <fieldset className="mt-5">
        <legend className="text-sm font-medium text-ink">
          {c.consent.identification}
        </legend>
        <p className="mt-1 text-xs text-ink-muted">
          {c.consent.identificationHelp}
        </p>
        <div className="mt-3 space-y-2">
          {(
            [
              ['anonymous', c.consent.idAnonymous, c.consent.idAnonymousHelp],
              ['self_described', c.consent.idSelfDescribed, c.consent.idSelfDescribedHelp],
            ] as Array<[IdentificationPreference, string, string]>
          ).map(([val, label, help]) => (
            <label
              key={val}
              className="flex cursor-pointer items-start gap-3 rounded-md border border-brand-rule p-3 hover:border-brand"
            >
              <input
                type="radio"
                name="ident"
                value={val}
                checked={identification === val}
                onChange={() => setIdentification(val)}
                className="mt-1 h-4 w-4 accent-brand"
              />
              <span>
                <span className="block text-sm font-medium text-ink">{label}</span>
                {help && (
                  <span className="mt-1 block text-xs text-ink-muted">
                    {help}
                  </span>
                )}
              </span>
            </label>
          ))}
        </div>
        {identification === 'self_described' && (
          <input
            type="text"
            value={identificationDescription}
            onChange={(e) => setIdentificationDescription(e.target.value)}
            placeholder={c.consent.idDescriptionPlaceholder}
            className="mt-3 w-full rounded-md border border-brand-rule p-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        )}
      </fieldset>

      <label className="mt-5 block">
        <span className="text-sm font-medium text-ink">{c.consent.notes}</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="mt-2 w-full rounded-md border border-brand-rule p-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </label>

      {err && (
        <p className="mt-3 rounded border border-red-300 bg-red-50 p-2 text-sm text-red-800">
          {err}
        </p>
      )}

      {busy ? (
        <div className="mt-5 rounded-lg border border-brand-rule bg-brand-vlight p-5 text-center">
          <p className="text-sm font-medium text-brand-dark">
            {language === 'es'
              ? 'Creando tu resumen personal…'
              : language === 'tl'
              ? 'Ginagawa ang iyong personal na buod…'
              : 'Creating your personal summary…'}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            {language === 'es'
              ? 'Guardamos tus preferencias de consentimiento y preparamos tu documento.'
              : language === 'tl'
              ? 'Sine-save namin ang iyong mga kagustuhan at inihahanda ang iyong dokumento.'
              : 'We\'re saving your consent choices and preparing your document.'}
          </p>
          <div className="mt-3 flex justify-center gap-1">
            <span className="h-2 w-2 animate-bounce rounded-full bg-brand [animation-delay:0ms]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-brand [animation-delay:150ms]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-brand [animation-delay:300ms]" />
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={submit}
          className="mt-5 rounded-md bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand-dark"
        >
          {c.consent.submit}
        </button>
      )}
    </section>
  );
}

function AdvocacyPanel({
  text,
  language,
}: {
  text: string;
  language: Language;
}) {
  const c = copyFor(language);

  /** Convert simple markdown to HTML for the print window. */
  function mdToHtml(md: string): string {
    return md
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      // headings
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      // bold / italic
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // bullets
      .replace(/^[-*+] (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
      // paragraphs
      .split(/\n{2,}/)
      .map((p) => p.startsWith('<') ? p : `<p>${p.replace(/\n/g, '<br/>')}</p>`)
      .join('\n');
  }

  function handlePrint() {
    const win = window.open('', '_blank');
    if (!win) return;
    const bodyHtml = mdToHtml(text);
    win.document.write(`
      <!DOCTYPE html>
      <html><head>
        <meta charset="utf-8"/>
        <title>My Pythia Summary</title>
        <style>
          body { font-family: Georgia, serif; max-width: 680px; margin: 60px auto; color: #1a1a1a; line-height: 1.7; }
          h1,h2,h3 { font-weight: 600; margin-top: 1.4em; }
          h1 { font-size: 1.5em; }
          h2 { font-size: 1.25em; color: #1F6E6E; }
          h3 { font-size: 1.05em; }
          p { margin: 0.8em 0; }
          ul { padding-left: 1.4em; margin: 0.6em 0; }
          li { margin: 0.3em 0; }
          .header { border-bottom: 2px solid #1F6E6E; padding-bottom: 12px; margin-bottom: 24px; }
          .header p { font-size: 0.8em; color: #555; margin: 0; }
          .footer { margin-top: 40px; font-size: 0.75em; color: #888; border-top: 1px solid #ddd; padding-top: 12px; }
          @media print { body { margin: 30px; } }
        </style>
      </head><body>
        <div class="header">
          <h1 style="color:#1F6E6E;margin:0 0 4px">My Pythia Summary</h1>
          <p>Community voice · ${new Date().toLocaleDateString()}</p>
        </div>
        ${bodyHtml}
        <div class="footer">Generated by Pythia — a community listening tool. Your voice matters.</div>
      </body></html>
    `);
    win.document.close();
    win.print();
  }

  const saveCopy =
    language === 'es' ? 'Guardar mi resumen (PDF)' :
    language === 'tl' ? 'I-save ang aking buod (PDF)' :
    'Save my summary (PDF)';

  return (
    <section className="mt-6 rounded-lg border-l-4 border-brand bg-brand-light p-5">
      <h2 className="font-serif text-lg font-semibold text-brand-dark">
        {c.advocacy.heading}
      </h2>
      <p className="mt-1 text-xs italic text-ink-muted">{c.advocacy.intro}</p>
      <Markdown
        content={text}
        className="prose-pythia mt-4 text-sm leading-relaxed text-ink"
      />

      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          href="/"
          className="inline-block rounded-md bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand-dark"
        >
          {c.advocacy.done}
        </Link>
        <button
          type="button"
          onClick={handlePrint}
          className="flex items-center gap-1.5 rounded-md border border-brand-rule bg-white px-4 py-2 text-sm text-ink-muted hover:border-brand hover:text-brand-dark"
        >
          {/* Download icon */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          {saveCopy}
        </button>
      </div>
      <p className="mt-3 text-xs text-ink-subtle">
        {language === 'es'
          ? 'Si su navegador bloquea la ventana emergente, busque el ícono de desbloqueo en la barra de dirección.'
          : language === 'tl'
          ? 'Kung harangan ng iyong browser ang pop-up, hanapin ang icon ng unlock sa address bar.'
          : 'If your browser blocks the print window, look for a pop-up blocked icon in your address bar and allow it.'}
      </p>
    </section>
  );
}
