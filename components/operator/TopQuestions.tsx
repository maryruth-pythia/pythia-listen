'use client';

import { useState } from 'react';
import type { QuestionAnalysis, QuestionFrequency } from '@/lib/analysis/questions';

const FREQ: Record<QuestionFrequency, { label: string; color: string; frac: number; blurb: string }> = {
  common: { label: 'Asked most', color: '#6A0FC2', frac: 1, blurb: 'Comes up across many signals and sources — a top thing the community wants answered.' },
  recurring: { label: 'Recurring', color: '#6A0FC2', frac: 0.62, blurb: 'Shows up repeatedly, though not in every conversation.' },
  occasional: { label: 'Occasional', color: '#8A5A00', frac: 0.4, blurb: 'Raised by a smaller share, but specific and worth answering.' },
};

const CARD: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #E7DCD0',
  borderRadius: 16,
  boxShadow: '0 1px 2px rgba(59,42,78,.05),0 6px 22px rgba(59,42,78,.07)',
};

function prettify(t: string): string {
  const s = t.replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function TopQuestions({ data, density }: { data: QuestionAnalysis; density?: 'skimmable' | 'balanced' | 'detailed' }) {
  const [open, setOpen] = useState<number | null>(null);
  const staticMode = !!density;

  if (!data.generated) {
    return (
      <div className="p-5" style={{ ...CARD, color: '#9A8FA6' }}>
        <p className="text-sm">{data.note ?? 'Not enough signal yet to surface recurring questions.'}</p>
      </div>
    );
  }
  const hasCounts = data.questions.every((q) => typeof q.mentions === 'number' && q.mentions > 0);
  const maxM = hasCounts ? Math.max(...data.questions.map((q) => q.mentions), 1) : 1;
  return (
    <div className="px-5 py-2" style={CARD}>
      {data.questions.map((q, i) => {
        const f = FREQ[q.frequency];
        const isOpen = open === i;
        const showDetail = staticMode ? density === 'detailed' || (density === 'balanced' && i < 3) : isOpen;
        return (
          <div key={i} style={{ borderBottom: i === data.questions.length - 1 ? 'none' : '1px dashed #E7DCD0' }}>
            <button
              type="button"
              onClick={staticMode ? undefined : () => setOpen(isOpen ? null : i)}
              className="flex w-full items-center gap-3 py-2.5 text-left"
              aria-expanded={isOpen}
            >
              <div className="flex-none" style={{ width: 150 }}>
                <div className="h-2.5 rounded-full" style={{ width: `${hasCounts ? Math.max(8, Math.round((q.mentions / maxM) * 100)) : Math.max(18, f.frac * 100)}%`, background: f.color }} />
              </div>
              <p className="min-w-0 flex-1 text-[13.5px]" style={{ color: '#2E2438' }}>{q.question}</p>
              <span className="flex-none tabular-nums text-[11px]" style={{ color: '#9A8FA6' }}>{hasCounts ? `~${q.mentions} signal${q.mentions === 1 ? '' : 's'}` : f.label}</span>
              {!staticMode && <span className="flex-none text-[11px]" style={{ color: '#B9A9CE' }}>{isOpen ? '▲' : '▼'}</span>}
            </button>
            {showDetail && (
              <div className="pb-3 pl-[162px] pr-2 text-[12.5px]" style={{ color: '#6A5F74' }}>
                {q.note && (
                  <p className="mb-1.5">
                    <span className="font-semibold" style={{ color: '#1F1330' }}>Why it matters: </span>{q.note}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px]">
                  <span>
                    <span className="font-semibold" style={{ color: '#1F1330' }}>Theme:</span> {prettify(q.theme)}
                  </span>
                  <span>
                    <span className="font-semibold" style={{ color: '#1F1330' }}>Frequency:</span> {f.blurb}
                  </span>
                </div>
                <p className="mt-1.5 text-[11px]" style={{ color: '#9A8FA6' }}>
                  Derived by Pythia from {data.analyzed} signal{data.analyzed === 1 ? '' : 's'} across desk research, the civic record, and direct listening — near-duplicate questions merged into one.
                </p>
              </div>
            )}
          </div>
        );
      })}
      {!staticMode && <p className="py-2 text-[11px]" style={{ color: '#B9A9CE' }}>Click any question to see what’s behind it.</p>}
    </div>
  );
}
