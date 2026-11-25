'use client';

import { useState } from 'react';
import type { CountyDemographics } from '@/lib/reference/demographics';
import InfoTip from '@/components/operator/InfoTip';

interface Finding {
  title: string;
  detail: string;
  sources: { label: string; url?: string }[];
}

/**
 * "Whose voice is missing" — grounded in real local-population shares from the
 * U.S. Census (see lib/reference/demographics.ts), NOT estimated. Compact:
 * each bar expands on click to show why that group is often under-heard.
 */
export default function MissingVoices({
  demo,
  findings,
}: {
  demo: CountyDemographics;
  findings: Finding[];
}) {
  const [open, setOpen] = useState<number | null>(null);
  const [showRead, setShowRead] = useState(false);

  return (
    <div className="mt-2">
      <p className="text-[11.5px] leading-snug" style={{ color: '#6A5F74' }}>
        Real Census population shares for {demo.county} — the community the record should reflect.
        <InfoTip
          className="ml-1"
          text="These are real U.S. Census Bureau QuickFacts figures for this county’s total population — measured values, not estimates or model output. The county source is linked at the bottom of this panel."
        />
      </p>

      <ul className="mt-2">
        {demo.groups.map((g, i) => {
          const isOpen = open === i;
          return (
            <li key={i} style={{ borderTop: i ? '1px solid #EFE7DA' : 'none' }}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                className="w-full py-1.5 text-left"
                aria-expanded={isOpen}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[12.5px] font-medium" style={{ color: '#2E2438' }}>{g.label}</span>
                  <span className="flex flex-none items-center gap-1.5">
                    <span className="tabular-nums text-[12px] font-semibold" style={{ color: '#6A0FC2' }}>{g.pct}%</span>
                    <span className="text-[9px]" style={{ color: '#B9A9CE' }}>{isOpen ? '▲' : '▼'}</span>
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full" style={{ background: '#EFE7DA' }}>
                  <div className="h-full rounded-full" style={{ width: `${g.pct}%`, background: '#6A0FC2' }} />
                </div>
              </button>
              {isOpen && (
                <p className="pb-1.5 text-[11px] leading-snug" style={{ color: '#9A8FA6' }}>{g.hint}</p>
              )}
            </li>
          );
        })}
      </ul>

      <p className="mt-2 text-[11px]" style={{ color: '#9A8FA6' }}>
        {demo.population.toLocaleString()} residents ·{' '}
        <a href={demo.source.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2" style={{ color: '#6A0FC2' }}>
          {demo.source.label} →
        </a>
      </p>

      {findings.length > 0 && (
        <div className="mt-2 border-t pt-2" style={{ borderColor: '#EFE7DA' }}>
          <button
            type="button"
            onClick={() => setShowRead((v) => !v)}
            className="text-left text-[11px] font-semibold"
            style={{ color: '#6A0FC2' }}
            aria-expanded={showRead}
          >
            {showRead ? '▲' : '▼'} Pythia’s read on who’s under-heard (from the signals)
          </button>
          {showRead && (
            <ul className="mt-1.5 space-y-1.5">
              {findings.map((f, i) => (
                <li key={i} className="text-[12px] leading-snug" style={{ color: '#6A5F74' }}>
                  <span className="font-semibold" style={{ color: '#2E2438' }}>{f.title}.</span> {f.detail}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
