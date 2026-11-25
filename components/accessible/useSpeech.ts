'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Voice for the accessible flows. Text-to-speech prefers a natural SERVER voice
 * (Kokoro "Heart", via /api/tts) for English, and falls back to the browser's
 * Web Speech voice on any failure (model not installed, offline, non-English,
 * error). Speech-to-text stays on the browser's SpeechRecognition.
 *
 * Server TTS gives a human-sounding voice without a paid provider; the browser
 * fallback keeps things working everywhere and for every language.
 */
export interface SpeechApi {
  ttsSupported: boolean;
  sttSupported: boolean;
  speaking: boolean;
  preparing: boolean;
  warm: () => void;
  listening: boolean;
  speak: (text: string, onEnd?: () => void) => void;
  cancelSpeak: () => void;
  listen: (onResult: (text: string) => void) => void;
  stopListen: () => void;
}

/**
 * Base language codes routed to the server voice (/api/tts → ElevenLabs
 * multilingual_v2, which auto-detects language from the text). Others fall
 * back to the browser's Web Speech voice. Codes match the base of each
 * locale's bcp47 in lib/locales.ts (e.g. Tagalog is 'fil-PH' -> 'fil').
 * To enable another language, add its base code here IF ElevenLabs
 * multilingual_v2 supports it (its list of 29 languages).
 */
export const SERVER_TTS_LANGS = new Set(['en', 'es', 'fil', 'pt', 'hi']);

// Fired warm-ups, so we never re-warm a language within a page session (cost).
const warmedLangs = new Set<string>();

/** Strip code blocks and markdown marks so the voice reads cleanly. */
function cleanForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[*_#>`]/g, '')
    .trim();
}

export function useSpeech(bcp47: string): SpeechApi {
  const [speaking, setSpeaking] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);
  const uttRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ttsAbortRef = useRef<AbortController | null>(null);

  const ttsSupported =
    typeof window !== 'undefined' && !!window.speechSynthesis;
  const sttSupported =
    typeof window !== 'undefined' &&
    !!((window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition);

  const cancelSpeak = useCallback(() => {
    // Stop an in-flight server request and any playing audio…
    try {
      ttsAbortRef.current?.abort();
    } catch {
      /* no-op */
    }
    ttsAbortRef.current = null;
    if (audioRef.current) {
      try {
        audioRef.current.pause();
      } catch {
        /* no-op */
      }
      audioRef.current = null;
    }
    // …and any browser synthesis.
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    uttRef.current = null;
    setSpeaking(false);
    setPreparing(false);
  }, []);

  // Pick the most natural available browser voice for this language. The free
  // default is often robotic; Edge/Chrome expose Microsoft/Google neural voices
  // whose names include Natural/Neural/Online — prefer those.
  const pickVoice = useCallback(
    (lang: string): SpeechSynthesisVoice | null => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return null;
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) return null;
      const base = lang.toLowerCase().split('-')[0];
      const sameLang = voices.filter((v) =>
        v.lang?.toLowerCase().startsWith(base)
      );
      const pool = sameLang.length ? sameLang : voices;
      const PREFERRED = /natural|neural|online|google|siri|premium|enhanced/i;
      return (
        pool.find((v) => PREFERRED.test(v.name)) ??
        pool.find((v) => v.lang?.toLowerCase() === lang.toLowerCase()) ??
        pool[0] ??
        null
      );
    },
    []
  );

  // Some browsers populate the voice list asynchronously; warm it up.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const warm = () => window.speechSynthesis.getVoices();
    warm();
    window.speechSynthesis.onvoiceschanged = warm;
    return () => {
      try {
        window.speechSynthesis.onvoiceschanged = null;
      } catch {
        /* no-op */
      }
    };
  }, []);

  /** Browser Web Speech fallback. */
  const speakBrowser = useCallback(
    (clean: string, onEnd?: () => void) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        setSpeaking(false);
        onEnd?.();
        return;
      }
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(clean);
      u.lang = bcp47;
      const voice = pickVoice(bcp47);
      if (voice) u.voice = voice;
      u.rate = 0.97;
      u.pitch = 1;
      u.onstart = () => setSpeaking(true);
      u.onend = () => {
        setSpeaking(false);
        uttRef.current = null;
        onEnd?.();
      };
      u.onerror = () => {
        setSpeaking(false);
        uttRef.current = null;
        onEnd?.();
      };
      uttRef.current = u;
      window.speechSynthesis.speak(u);
    },
    [bcp47, pickVoice]
  );

  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      const clean = cleanForSpeech(text);
      if (!clean) {
        onEnd?.();
        return;
      }
      // Use the hosted server voice for supported languages; others use the
      // browser voice so multilingual accessibility never regresses.
      const base = bcp47.toLowerCase().split('-')[0];
      if (!SERVER_TTS_LANGS.has(base)) {
        speakBrowser(clean, onEnd);
        return;
      }

      // Cancel anything currently playing, then try the server.
      try {
        window.speechSynthesis?.cancel();
      } catch {
        /* no-op */
      }
      setPreparing(true);
      const controller = new AbortController();
      ttsAbortRef.current = controller;

      fetch('/api/tts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: clean, lang: bcp47 }),
        signal: controller.signal,
      })
        .then(async (res) => {
          if (!res.ok) throw new Error('tts ' + res.status);
          const blob = await res.blob();
          if (controller.signal.aborted) return;
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audioRef.current = audio;
          const done = () => {
            setSpeaking(false);
            setPreparing(false);
            audioRef.current = null;
            URL.revokeObjectURL(url);
            onEnd?.();
          };
          audio.onended = done;
          audio.onerror = done;
          setPreparing(false);
          setSpeaking(true);
          await audio.play();
        })
        .catch(() => {
          // Aborted by the user → just stop. Any other failure → browser voice.
          if (controller.signal.aborted) {
            setSpeaking(false);
            setPreparing(false);
            return;
          }
          audioRef.current = null;
          setPreparing(false);
          speakBrowser(clean, onEnd);
        });
    },
    [bcp47, speakBrowser]
  );

  const stopListen = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      /* no-op */
    }
    recRef.current = null;
    setListening(false);
  }, []);

  const listen = useCallback(
    (onResult: (text: string) => void) => {
      if (typeof window === 'undefined') return;
      const SR =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      if (!SR) return;
      try {
        const rec = new SR();
        rec.lang = bcp47;
        rec.interimResults = false;
        rec.maxAlternatives = 1;
        rec.onresult = (e: any) => {
          const t = e?.results?.[0]?.[0]?.transcript ?? '';
          if (t) onResult(t);
        };
        rec.onend = () => {
          setListening(false);
          recRef.current = null;
        };
        rec.onerror = () => {
          setListening(false);
          recRef.current = null;
        };
        recRef.current = rec;
        setListening(true);
        rec.start();
      } catch {
        setListening(false);
      }
    },
    [bcp47]
  );

  useEffect(
    () => () => {
      cancelSpeak();
      stopListen();
    },
    [cancelSpeak, stopListen]
  );

  // Fire-and-forget: wake the hosted voice model so the first real click is
  // fast (fal cold-starts otherwise). Safe to call on mount; costs a fraction
  // of a cent and never touches the speaking/preparing UI state.
  const warm = useCallback(() => {
    const base = bcp47.toLowerCase().split('-')[0];
    if (!SERVER_TTS_LANGS.has(base)) return;
    if (warmedLangs.has(base)) return;
    warmedLangs.add(base);
    try {
      fetch('/api/tts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: 'Hola.', lang: bcp47 }),
      }).catch(() => {});
    } catch {
      /* no-op */
    }
  }, [bcp47]);

  return {
    ttsSupported,
    sttSupported,
    speaking,
    preparing,
    warm,
    listening,
    speak,
    cancelSpeak,
    listen,
    stopListen,
  };
}
