'use client';

import type { SurveyFinding } from '@/lib/analysis/survey-findings';

const PLUM = '#1F1330';
const AGREE = '#4F8A5C';
const DISAGREE = '#B23A2E';
const MIX = '#9A8FA6';

function short(pole: string): string {
  // Trim long pole labels to a compact chip.
  return pole.length > 22 ? pole.slice(0, 21).trimEnd() + '…' : pole;
}

/**
 * Survey-sourced agree/disagree. Each dyad statement is a diverging bar:
 * a marker at the community mean between the two named poles, plus the
 * real split (lean high / mixed / lean low). Never averaged across
 * statements — every row stands on its own.
 *
 * density: skimmable = the most decisive few + the pre/post shift;
 *          balanced  = more rows; detailed = all rows.
 */
export default function SurveyFindings({
  finding,
  density = 'balanced',
}: {
  finding: SurveyFinding;
  density?: 'skimmable' | 'balanced' | 'detailed';
}) {
  const limit = density === 'skimmable' ? 3 : density === 'balanced' ? 6 : 99;
  const rows = finding.statements.slice(0, limit);
  const hidden = finding.statements.length - rows.length;

  return (
    <div>
      <p className="mb-3 text-[12.5px]" style={{ color: '#6A5F74' }}>
        From <b>{finding.n}</b> anonymous responses to <i>{finding.title}</i>.
        {finding.purpose ? ` ${finding.purpose}` : ''} Each row below shows where
        the community leans between two poles — not a single score.
      </p>

      {finding.stanceShift && (
        <div
          className="mb-4 flex items-center gap-3 rounded-lg border px-3 py-2.5"
          style={{ borderColor: '#E7DCD0', background: '#FBF7F0' }}
        >
          <div className="text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: '#9A8FA6' }}>
            Sentiment shift
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-lg font-semibold" style={{ color: PLUM }}>
              {finding.stanceShift.before}
            </span>
            <span style={{ color: MIX }}>→</span>
            <span className="font-serif text-lg font-semibold" style={{ color: PLUM }}>
              {finding.stanceShift.after}
            </span>
            <span className="text-[11.5px]" style={{ color: '#6A5F74' }}>
              /100 · before vs after taking the survey
              {finding.stanceShift.after > finding.stanceShift.before
                ? ' (warmer after)'
                : finding.stanceShift.after < finding.stanceShift.before
                ? ' (cooler after)'
                : ''}
            </span>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {rows.map((s) => {
          const lean =
            s.mean > 55 ? 'high' : s.mean < 45 ? 'low' : 'mixed';
          const leanColor = lean === 'high' ? AGREE : lean === 'low' ? DISAGREE : MIX;
          return (
            <div key={s.id}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[13px] font-medium" style={{ color: PLUM }}>
                  {s.label}
                </span>
                <span className="text-[11px] font-semibold" style={{ color: leanColor }}>
                  {lean === 'high'
                    ? `${s.agreePct}% lean ${short(s.poleHigh)}`
                    : lean === 'low'
                    ? `${s.disagreePct}% lean ${short(s.poleLow)}`
                    : 'Split down the middle'}
                </span>
              </div>
              {/* diverging track with mean marker */}
              <div className="relative mt-1.5 h-2.5 rounded-full" style={{ background: '#EEE7DC' }}>
                <div
                  className="absolute top-1/2 h-4 w-1.5 -translate-y-1/2 rounded-full"
                  style={{ left: `calc(${s.mean}% - 3px)`, background: leanColor }}
                  title={`mean ${s.mean}/100`}
                />
              </div>
              <div className="mt-1 flex justify-between text-[10.5px]" style={{ color: '#9A8FA6' }}>
                <span>{s.poleLow}</span>
                <span>
                  {s.agreePct}% / {s.mixedPct}% / {s.disagreePct}%
                </span>
                <span>{s.poleHigh}</span>
              </div>
            </div>
          );
        })}
      </div>

      {hidden > 0 && (
        <p className="mt-2 text-[11px]" style={{ color: '#9A8FA6' }}>
          + {hidden} more statement{hidden === 1 ? '' : 's'} at a higher density.
        </p>
      )}
    </div>
  );
}
