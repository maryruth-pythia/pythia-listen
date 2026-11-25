import type { MutualGainsAnalysis, GainStrength } from '@/lib/analysis/mutual-gains';

const CARD: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #E7DCD0',
  borderRadius: 16,
  boxShadow: '0 1px 2px rgba(59,42,78,.05),0 6px 22px rgba(59,42,78,.07)',
};

const STRENGTH: Record<GainStrength, { label: string; bg: string; color: string }> = {
  strong: { label: 'Strong overlap', bg: '#DDEBDD', color: '#2F6B3C' },
  moderate: { label: 'Some overlap', bg: '#FBF3DF', color: '#9A7B2A' },
  emerging: { label: 'Emerging', bg: '#F1EAF6', color: '#6A0FC2' },
};

export default function MutualGains({ data }: { data: MutualGainsAnalysis }) {
  if (!data.generated) {
    return (
      <div className="p-6 text-sm" style={{ ...CARD, color: '#6A5F74' }}>
        {data.note ?? 'Not enough signal to find common ground yet.'}
      </div>
    );
  }

  return (
    <div className="p-5" style={CARD}>
      <p className="mb-4 max-w-2xl text-[13px]" style={{ color: '#6A5F74' }}>
        Where what the community wants and what the developer needs point the
        same way — the overlaps a durable agreement can be built on. Drawn only
        from the signals, and shown only where the overlap is real.
      </p>
      <ul className="space-y-3">
        {data.gains.map((g) => {
          const s = STRENGTH[g.strength];
          return (
            <li
              key={g.id}
              className="rounded-xl p-4"
              style={{ background: '#F7FAF5', border: '1px solid #DDE8D9' }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="text-[14px] font-semibold" style={{ color: '#1F1330' }}>
                  {g.community}
                </div>
                <span
                  className="flex-none rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                  style={{ background: s.bg, color: s.color }}
                >
                  {s.label}
                </span>
              </div>

              {g.developer && (
                <div className="mt-1 text-[13px]" style={{ color: '#6A5F74' }}>
                  <span style={{ color: '#4F8A5C' }}>↔ also serves the developer:</span>{' '}
                  {g.developer}
                </div>
              )}

              <div
                className="mt-2 rounded-lg px-3 py-2 text-[13px]"
                style={{ background: '#FBF3DF', border: '1px solid #EFE0BE', color: '#2E2438' }}
              >
                <span className="font-semibold" style={{ color: '#C77D2A' }}>
                  Shared move:
                </span>{' '}
                {g.move}
              </div>

              {g.exampleTitles.length > 0 && (
                <div className="mt-2 text-[11px]" style={{ color: '#9488A0' }}>
                  from: {g.exampleTitles.join(' · ')}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
