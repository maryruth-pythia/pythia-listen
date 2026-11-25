'use client';

import { useState } from 'react';
import { define } from '@/lib/glossary';

/**
 * A small "i" icon that reveals a plain-language definition on hover, focus, or
 * tap. Pass a glossary `term` (looked up in lib/glossary) or explicit `text`.
 * Renders nothing if neither resolves, so it's safe to sprinkle liberally.
 */
export default function InfoTip({
  term,
  text,
  className,
}: {
  term?: string;
  text?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const body = text ?? (term ? define(term) : undefined);
  if (!body) return null;

  return (
    <span className={`relative inline-flex align-middle ${className ?? ''}`}>
      <button
        type="button"
        aria-label={term ? `What does “${term}” mean?` : 'More information'}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
        className="flex h-[15px] w-[15px] items-center justify-center rounded-full border text-[10px] font-bold leading-none transition"
        style={{ borderColor: '#B9A9CE', color: '#6A0FC2', background: '#fff' }}
      >
        i
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute left-1/2 top-[20px] z-40 w-64 -translate-x-1/2 rounded-lg px-3 py-2 text-left text-[12px] font-normal leading-snug shadow-xl"
          style={{ background: '#1F1330', color: '#FCF6C4' }}
        >
          {body}
        </span>
      )}
    </span>
  );
}
