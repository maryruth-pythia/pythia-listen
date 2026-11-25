'use client';

import { useState } from 'react';
import { GLOSSARY } from '@/lib/glossary';

/**
 * Wraps the first occurrence of each known glossary term inside a run of text
 * with a dotted-underline hover definition. Drop <AutoGloss text={...} /> in
 * place of a plain string and every important term becomes self-explaining —
 * no per-term wrapping by hand.
 */

const TERMS = Object.keys(GLOSSARY).sort((a, b) => b.length - a.length);
const PATTERN = new RegExp(
  `\\b(${TERMS.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
  'i'
);

function Term({ term, children }: { term: string; children: string }) {
  const [open, setOpen] = useState(false);
  const body = GLOSSARY[term];
  if (!body) return <>{children}</>;
  return (
    <span className="relative inline">
      <span
        tabIndex={0}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="cursor-help underline decoration-dotted underline-offset-2"
        style={{ textDecorationColor: '#B9A9CE' }}
      >
        {children}
      </span>
      {open && (
        <span
          role="tooltip"
          className="absolute left-0 top-[20px] z-40 w-64 rounded-lg px-3 py-2 text-left text-[12px] font-normal leading-snug shadow-xl"
          style={{ background: '#1F1330', color: '#F7F1E8' }}
        >
          {body}
        </span>
      )}
    </span>
  );
}

export default function AutoGloss({ text }: { text: string }) {
  const used = new Set<string>();
  const out: React.ReactNode[] = [];
  let rest = text;
  let guard = 0;
  while (rest && guard < 200) {
    guard++;
    const m = PATTERN.exec(rest);
    if (!m || m.index === undefined) {
      out.push(rest);
      break;
    }
    const matched = m[0];
    const key = matched.toLowerCase();
    out.push(rest.slice(0, m.index));
    if (used.has(key)) {
      out.push(matched);
    } else {
      used.add(key);
      out.push(
        <Term key={guard} term={key}>
          {matched}
        </Term>
      );
    }
    rest = rest.slice(m.index + matched.length);
  }
  return <>{out}</>;
}
