'use client';

import type { ControlCopy } from '@/lib/locales';

const AUDIO_ON = process.env.NEXT_PUBLIC_FEATURE_SURVEY_AUDIO === 'on';

/**
 * Big tap-target quick replies for low-literacy / voice users. Mirrors the
 * suggest-and-confirm pattern: the agent asks a simple yes/no or offers more,
 * and the person can tap instead of typing. "Say that again" re-speaks the last
 * message; "In my own words" hands focus to the input for a free answer.
 */
export default function QuickReplies({
  c,
  onSend,
  onRepeat,
  onOwnWords,
  disabled,
}: {
  c: ControlCopy;
  onSend: (text: string) => void;
  onRepeat: () => void;
  onOwnWords: () => void;
  disabled?: boolean;
}) {
  const base =
    'rounded-lg border px-4 py-2.5 text-sm font-medium transition disabled:opacity-50';
  return (
    <div className="mb-2 flex flex-wrap gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onSend(c.yes)}
        className={base + ' border-brand bg-brand text-white hover:bg-brand-dark'}
      >
        ✓ {c.yes}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onSend(c.no)}
        className={base + ' border-brand-rule bg-white text-brand-dark hover:bg-brand-light'}
      >
        ✕ {c.no}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onSend(c.more)}
        className={base + ' border-brand-rule bg-white text-brand-dark hover:bg-brand-light'}
      >
        {c.more}
      </button>
      {AUDIO_ON && (
      <button
        type="button"
        disabled={disabled}
        onClick={onRepeat}
        className={base + ' border-brand-rule bg-white text-ink-muted hover:bg-brand-light'}
      >
        🔊 {c.repeat}
      </button>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={onOwnWords}
        className={base + ' border-brand-rule bg-white text-ink-muted hover:bg-brand-light'}
      >
        ✎ {c.ownWords}
      </button>
    </div>
  );
}
