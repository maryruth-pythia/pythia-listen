'use client';

import { useEffect, useState } from 'react';
import { enabledLocales } from '@/lib/locales';

/**
 * Cycles the word for "Language" through each enabled locale, so a speaker of
 * any supported language recognises the control and knows where to switch.
 * Pauses on hover/focus. Falls back to a static word if only one locale.
 */
export default function RotatingLabel() {
  const words = Array.from(
    new Set(enabledLocales().map((l) => l.controls.language))
  );
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || words.length < 2) return;
    const id = setInterval(() => setI((n) => (n + 1) % words.length), 1800);
    return () => clearInterval(id);
  }, [paused, words.length]);

  return (
    <span
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-label="Language"
      title="Language"
      className="inline-block min-w-[64px] text-right transition-opacity"
    >
      {words[i] ?? 'Language'}
    </span>
  );
}
