'use client';

import { SWVA_MAP, SWVA_SHAPES } from '@/lib/watch/va-county-shapes';
import type { Lead, LeadStage } from '@/lib/watch/types';

export interface MapCounty {
  name: string;
  label: string;
  tier?: 'core' | 'nearby';
}

/** Projects found (all stages) -> shade. Stepped, so the legend can name every colour. */
const STEPS = [
  { min: 6, label: '6 or more', fill: '#6A0FC2' },
  { min: 3, label: '3–5', fill: '#A46BE0' },
  { min: 1, label: '1–2', fill: '#D7C1F2' },
  { min: 0, label: 'none found', fill: '#F6F2FA' },
];
const shade = (n: number) => STEPS.find((s) => n >= s.min)!.fill;

/** Small cities need their label moved off the shape so it doesn't sit on a county name. */
const LABEL_OFFSET: Record<string, [number, number]> = { Norton: [-44, 30], Bristol: [-36, 18] };

const STAGE_COLOR: Record<LeadStage, string> = {
  grid: '#FCC029',
  local: '#F08A24',
  state: '#EC2BFC',
  permitted: '#9B3FD6',
  built: '#3B0A78',
};

export default function WatchMap({
  counties,
  leads,
  selected,
  onSelect,
  showNearby,
}: {
  counties: MapCounty[];
  leads: Lead[];
  selected: string;
  onSelect: (county: string) => void;
  showNearby: boolean;
}) {
  const H = SWVA_MAP.height + 10;
  const drawn = counties.filter((c) => SWVA_SHAPES[c.name]);
  // Cities on top so their small shapes stay clickable.
  const order = [...drawn].sort((a, b) => SWVA_SHAPES[b.name].area - SWVA_SHAPES[a.name].area);
  const usedSteps = new Set(
    drawn.filter((c) => c.tier !== 'nearby' || showNearby).map((c) => shade(leads.filter((l) => l.county === c.name).length))
  );

  return (
    <div>
      <svg viewBox={`0 0 ${SWVA_MAP.width} ${H}`} className="block w-full" role="img" aria-label="Map of watched counties, shaded by how many projects were found">
        {order.map((c) => {
          const s = SWVA_SHAPES[c.name];
          const mine = leads.filter((l) => l.county === c.name);
          const nearby = c.tier === 'nearby';
          const dim = nearby && !showNearby;
          const on = selected === c.name;
          return (
            <path
              key={c.name}
              d={s.d}
              fill={dim ? '#FAFAFB' : shade(mine.length)}
              fillOpacity={nearby && !dim ? 0.55 : 1}
              stroke={on ? '#1F1330' : nearby ? '#B9A9CE' : '#FFFFFF'}
              strokeWidth={on ? 2.2 : nearby ? 1 : 1.4}
              strokeDasharray={nearby && !on ? '4 3' : undefined}
              className={dim ? '' : 'cursor-pointer'}
              onClick={() => !dim && onSelect(on ? 'all' : c.name)}
            >
              <title>{`${c.label}${nearby ? ' (nearby)' : ''}: ${mine.length} project${mine.length === 1 ? '' : 's'} found`}</title>
            </path>
          );
        })}
        {drawn.map((c) => {
          const s = SWVA_SHAPES[c.name];
          const mine = leads.filter((l) => l.county === c.name);
          const nearby = c.tier === 'nearby';
          if (nearby && !showNearby) {
            return (
              <text key={`t${c.name}`} x={s.label[0]} y={s.label[1]} textAnchor="middle" fontSize={10} fill="#C4B8D2" pointerEvents="none">
                {c.name}
              </text>
            );
          }
          const off = LABEL_OFFSET[c.name];
          const [x, y] = off ? [s.label[0] + off[0], s.label[1] + off[1]] : s.label;
          const dark = shade(mine.length) === STEPS[0].fill;
          const stages = (Object.keys(STAGE_COLOR) as LeadStage[]).filter((k) => mine.some((l) => l.stage === k));
          return (
            <g key={`t${c.name}`} pointerEvents="none">
              {off && <line x1={s.label[0]} y1={s.label[1]} x2={x} y2={y - 9} stroke="#9A8FA6" strokeWidth={0.8} />}
              <text x={x} y={y} textAnchor="middle" fontSize={off ? 9.5 : 11} fontWeight={600} fill={dark && !off ? '#fff' : '#1F1330'}>
                {c.name}
              </text>
              <text x={x} y={y + 13} textAnchor="middle" fontSize={10} fill={dark && !off ? '#EFE6FA' : '#6A5F74'}>
                {mine.length}
              </text>
              {stages.map((k, i) => (
                <circle key={k} cx={x - ((stages.length - 1) * 8) / 2 + i * 8} cy={y + 21} r={3} fill={STAGE_COLOR[k]} stroke="#fff" strokeWidth={0.8} />
              ))}
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]" style={{ color: '#6A5F74' }}>
        <span className="font-semibold">Shade = projects found:</span>
        {STEPS.filter((s) => usedSteps.has(s.fill)).map((s) => (
          <span key={s.label} className="inline-flex items-center gap-1">
            <span className="inline-block h-3 w-4 rounded-sm" style={{ background: s.fill, border: '1px solid #E7DCD0' }} />
            {s.label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: STAGE_COLOR.state }} />
          dots = stages present
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-3 w-4 rounded-sm" style={{ border: '1.5px dashed #B9A9CE' }} />
          nearby, not yet confirmed
        </span>
        <span>Click a county to filter.</span>
      </div>
      <p className="mt-1 text-[10.5px]" style={{ color: '#9A8FA6' }}>County outlines: U.S. Census Bureau.</p>
    </div>
  );
}
