'use client';

import { useSpeech } from './useSpeech';

/**
 * Small per-message speaker button. Lets anyone hear a message aloud even when
 * full voice mode is off — the "audio is always one tap away" guarantee.
 */
export default function ListenButton({
  text,
  bcp47,
  label,
}: {
  text: string;
  bcp47: string;
  label: string;
}) {
  const { speak, cancelSpeak, speaking, ttsSupported } = useSpeech(bcp47);
  if (!ttsSupported) return null;
  return (
    <button
      type="button"
      onClick={() => (speaking ? cancelSpeak() : speak(text))}
      aria-label={label}
      title={label}
      className="mt-1 inline-flex items-center gap-1 text-[11px] text-ink-subtle transition hover:text-brand-dark"
    >
      <span aria-hidden>{speaking ? '⏸' : '🔊'}</span> {label}
    </button>
  );
}
