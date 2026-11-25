import type { ClusterAnalysis } from '@/lib/analysis/clusters';

const CARD: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #E7DCD0',
  borderRadius: 16,
  boxShadow: '0 1px 2px rgba(59,42,78,.05),0 6px 22px rgba(59,42,78,.07)',
};
const CAMP_COLORS = ['#FCC029', '#4F8A5C', '#6A0FC2', '#3E7CB1', '#9A8FA6'];

export default function OpinionClusters({ data, visualOnly = false }: { data: ClusterAnalysis; visualOnly?: boolean }) {
  if (!data.generated) {
    return (
      <div className="p-6 text-sm" style={{ ...CARD, color: '#6A5F74' }}>
        {data.note ?? 'Not enough signal to cluster opinion yet.'}
      </div>
    );
  }

  const camps = data.camps;
  const r = 70, sw = 28, circ = 2 * Math.PI * r;
  let offset = 0;
  const segs = camps.map((c, i) => {
    const len = (c.share / 100) * circ;
    const seg = { color: CAMP_COLORS[i % CAMP_COLORS.length], len, offset };
    offset += len;
    return seg;
  });

  return (
    <div className="p-5" style={CARD}>
      <div className="grid items-center gap-6 md:grid-cols-[200px_1fr]">
        {/* Donut */}
        <svg viewBox="0 0 200 200" className="mx-auto w-[200px]">
          <g transform="rotate(-90 100 100)">
            {segs.map((s, i) => (
              <circle key={i} cx={100} cy={100} r={r} fill="none" stroke={s.color} strokeWidth={sw}
                strokeDasharray={`${s.len} ${circ - s.len}`} strokeDashoffset={-s.offset} />
            ))}
          </g>
        </svg>
        {/* Legend */}
        <div>
          <ul className="space-y-2">
            {camps.map((c, i) => (
              <li key={c.id} className="flex items-center gap-3 text-[14px]">
                <span className="inline-block h-3 w-3 rounded-sm" style={{ background: CAMP_COLORS[i % CAMP_COLORS.length] }} />
                <span className="flex-1" style={{ color: '#2E2438' }}>{c.label}</span>
                <span className="font-semibold" style={{ color: '#1F1330' }}>{c.share}%</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Common ground */}
      {!visualOnly && data.consensus.length > 0 && (
        <div className="mt-5 rounded-xl p-4" style={{ background: '#FBF3DF', border: '1px solid #EFE0BE' }}>
          <div className="mb-2 text-[12px] font-bold uppercase tracking-[0.06em]" style={{ color: '#4F8A5C' }}>
            ✦ What a super-majority agrees on — across every camp
          </div>
          <ul className="space-y-1.5">
            {data.consensus.map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-[14px]" style={{ color: '#2E2438' }}>
                <span style={{ color: '#4F8A5C' }}>✓</span>
                <span>{c.statement}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Divides */}
      {!visualOnly && data.divides.length > 0 && (
        <div className="mt-3">
          <div className="mb-1 text-[12px] font-semibold uppercase tracking-[0.06em]" style={{ color: '#C77D2A' }}>
            Still unresolved
          </div>
          <ul className="space-y-1">
            {data.divides.map((d, i) => (
              <li key={i} className="text-[13px]" style={{ color: '#6A5F74' }}>• {d.statement}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
