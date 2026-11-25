'use client';

import { useMemo, useState } from 'react';
import type { ConcernView, VennData } from '@/lib/dashboard/concerns';

const VENN_MIN = 2;
const C = { plum: '#1F1330', ink: '#2E2438', muted: '#6A5F74', subtle: '#9A8FA6', rule: '#E7DCD0', purple: '#6A0FC2' };
const CARD: React.CSSProperties = {
  background: '#fff',
  border: `1px solid ${C.rule}`,
  borderRadius: 16,
  boxShadow: '0 1px 2px rgba(59,42,78,.05),0 6px 22px rgba(59,42,78,.07)',
};
const OPP = '#D9822B';
const CON = '#E8B04A';
const MIX = '#B9A9CE';
/**
 * Circle colours per Venn view, so "By income" and "By place" never look alike, and
 * the three circles in each view are clearly different hues (fill = circle, text =
 * a darker shade that stays readable on white).
 */
type Swatch = { fill: string; text: string };
const PALETTES: Record<string, Swatch[]> = {
  // Income: warm-to-cool, higher poverty first.
  income: [
    { fill: '#E8590C', text: '#C2410C' },
    { fill: '#F2B807', text: '#8A6500' },
    { fill: '#0B8A7A', text: '#0B6F63' },
  ],
  place: [
    { fill: '#D61FE6', text: '#A3179F' },
    { fill: '#1C6FD6', text: '#1858A8' },
    { fill: '#2F9E44', text: '#237A35' },
  ],
};
const DEFAULT_PALETTE = PALETTES.place;
const paletteOf = (key: string): Swatch[] => PALETTES[key] ?? DEFAULT_PALETTE;

/** "Energy costs, bills & saving energy" -> "Energy costs". */
function short(label: string): string {
  const s = label.split(/,| & /)[0].trim();
  return s.length > 24 ? `${s.slice(0, 22)}…` : s;
}

export function ConcernClusters({ view }: { view: ConcernView }) {
  const [all, setAll] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  if (!view.total) {
    return (
      <div className="p-5 text-[13px]" style={{ ...CARD, color: C.muted }}>
        No concerns on record yet: no signal here is marked as a concern, an objection or a mixed view.
      </div>
    );
  }
  const list = all ? view.clusters : view.clusters.slice(0, 8);
  const max = Math.max(...view.clusters.map((c) => c.n), 1);
  return (
    <div className="p-5" style={CARD}>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px]" style={{ color: C.muted }}>
        <span>
          <b style={{ color: C.plum }}>{view.total}</b> signals raise a concern, an objection or mixed feelings
          {view.unmatched ? ` (${view.unmatched} don’t fit a shared concern)` : ''}.
        </span>
        <span className="inline-flex items-center gap-1"><span className="inline-block h-2.5 w-3 rounded-sm" style={{ background: OPP }} />opposed</span>
        <span className="inline-flex items-center gap-1"><span className="inline-block h-2.5 w-3 rounded-sm" style={{ background: CON }} />concerned</span>
        <span className="inline-flex items-center gap-1"><span className="inline-block h-2.5 w-3 rounded-sm" style={{ background: MIX }} />mixed</span>
      </div>
      <ol>
        {list.map((c, i) => {
          const isOpen = open === c.key;
          const w = (n: number) => `${(100 * n) / max}%`;
          return (
            <li key={c.key} className="py-2.5" style={{ borderTop: `1px solid ${C.rule}` }}>
              <button type="button" onClick={() => setOpen(isOpen ? null : c.key)} className="w-full text-left" aria-expanded={isOpen}>
                <div className="flex items-baseline gap-2">
                  <span className="w-5 flex-none text-right font-serif text-[13px]" style={{ color: C.subtle }}>{i + 1}</span>
                  <span className="min-w-0 flex-1 text-[14px] font-semibold" style={{ color: C.plum }}>{c.label}</span>
                  <span className="flex-none text-[11.5px]" style={{ color: C.muted }}>
                    {c.n} signal{c.n === 1 ? '' : 's'} · {c.sources} source{c.sources === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="ml-7 mt-1 flex h-2.5 overflow-hidden rounded-full" style={{ background: '#F4EFF8' }}>
                  <div style={{ width: w(c.opposition), background: OPP }} />
                  <div style={{ width: w(c.concern), background: CON }} />
                  <div style={{ width: w(c.mixed), background: MIX }} />
                </div>
                {view.descriptions?.[c.key] && (
                  <p className="ml-7 mt-1 text-[12.5px]" style={{ color: C.ink }}>{view.descriptions[c.key]}</p>
                )}
                {c.communities.length > 0 && (
                  <p className="ml-7 mt-1 text-[11.5px]" style={{ color: C.subtle }}>
                    Raised most in {c.communities.map((x) => `${x.name} (${x.n})`).join(', ')}
                  </p>
                )}
              </button>
              {isOpen && (
                <div className="ml-7 mt-2 space-y-1.5 text-[12.5px]" style={{ color: C.ink }}>
                  {c.parts.length > 0 && (
                    <p style={{ color: C.muted }}>
                      Includes: {c.parts.map((p) => `${p.label} (${p.n})`).join(', ')}
                    </p>
                  )}
                  {c.examples.map((e, j) => (
                    <p key={j}>
                      “{e.title}”{e.community ? <span style={{ color: C.subtle }}> · {e.community}</span> : null}
                      {e.url && (
                        <a href={e.url} target="_blank" rel="noopener noreferrer" className="ml-1.5 text-[11.5px] underline underline-offset-2" style={{ color: C.purple }}>
                          source →
                        </a>
                      )}
                    </p>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {view.clusters.length > 8 && (
        <button type="button" onClick={() => setAll(!all)} className="mt-2 text-[12px] underline underline-offset-2" style={{ color: C.purple }}>
          {all ? 'Show the top 8' : `Show all ${view.clusters.length} concerns`}
        </button>
      )}
      <p className="mt-3 text-[11px]" style={{ color: C.subtle }}>
        {view.method === 'ai'
          ? 'Grouped by AI from the signals themselves, so the groups follow what people raise; the counts are the signals it put in each group. '
          : 'Grouped by keyword rules (the AI grouping was unavailable). '}
        One signal can raise more than one concern, so the counts can add up to more than {view.total}. Click a concern for examples and sources.
      </p>
    </div>
  );
}

/** Region label anchors for a 3-circle layout, keyed by membership bitmask (bit i = group i). */
const ANCHOR3: Record<number, [number, number]> = {
  1: [150, 130], //  A only
  2: [450, 130], //  B only
  4: [300, 352], //  C only
  3: [300, 92], //   A ∩ B
  5: [212, 252], //  A ∩ C
  6: [388, 252], //  B ∩ C
  7: [300, 196], //  all three
};
const ANCHOR2: Record<number, [number, number]> = { 1: [170, 190], 2: [430, 190], 3: [300, 190] };

function regionName(mask: number, names: string[]): string {
  const ins = names.filter((_, i) => mask & (1 << i));
  if (ins.length === names.length && names.length > 1) return `All ${names.length}`;
  if (ins.length === 1) return `${ins[0]} only`;
  return ins.join(' + ');
}

function VennDiagram({ venn, labelOf }: { venn: VennData; labelOf: Map<string, string> }) {
  const k = venn.groups.length;
  const pal = paletteOf(venn.key);
  const rows = useMemo(
    () =>
      Object.entries(venn.counts)
        .map(([key, cs]) => {
          let mask = 0;
          cs.forEach((n, i) => {
            if (n >= VENN_MIN) mask |= 1 << i;
          });
          return { key, label: labelOf.get(key) ?? key, cs, mask, total: cs.reduce((a, b) => a + b, 0) };
        })
        .sort((a, b) => b.total - a.total),
    [venn, labelOf]
  );
  const placed = rows.filter((r) => r.mask);
  const thin = rows.filter((r) => !r.mask);
  const byMask = new Map<number, typeof rows>();
  for (const r of placed) byMask.set(r.mask, [...(byMask.get(r.mask) ?? []), r]);

  const circles: [number, number][] = k === 3 ? [[230, 160], [370, 160], [300, 262]] : [[230, 190], [370, 190]];
  const anchors = k === 3 ? ANCHOR3 : ANCHOR2;
  const R = k === 3 ? 128 : 150;

  return (
    <div>
      <svg viewBox="0 -34 600 470" className="mx-auto block w-full" style={{ maxWidth: 640 }} role="img" aria-label={`Venn diagram of concerns ${venn.label.toLowerCase()}`}>
        {circles.map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={R} fill={pal[i].fill} fillOpacity={0.16} stroke={pal[i].fill} strokeWidth={2} />
        ))}
        {/* Group names outside the circles: top-left, top-right, bottom; two lines so long names don't collide. */}
        {venn.groups.map((g, i) => {
          const [cx, cy] = circles[i];
          type Pos = [number, number, 'start' | 'end' | 'middle'];
          const three: Pos[] = [[8, -14, 'start'], [592, -14, 'end'], [cx, cy + R + 22, 'middle']];
          const two: Pos[] = [[8, -14, 'start'], [592, -14, 'end']];
          const [x, y, anchor] = (k === 3 ? three : two)[i];
          return (
            <text key={i} x={x} y={y} textAnchor={anchor} fontSize={12} fill={C.plum}>
              <tspan fontWeight={700} fill={pal[i].text}>{g.name}</tspan>
              <tspan x={x} dy={15} fill={C.muted}>{g.n} concern signal{g.n === 1 ? '' : 's'}</tspan>
            </text>
          );
        })}
        {[...byMask.entries()].map(([mask, list]) => {
          const a = anchors[mask];
          if (!a) return null;
          const shown = list.slice(0, 4);
          const startY = a[1] - ((shown.length - 1) * 14) / 2;
          return (
            <g key={mask}>
              {shown.map((r, j) => (
                <text key={r.key} x={a[0]} y={startY + j * 14} textAnchor="middle" fontSize={11} fill={C.ink}>
                  <title>{`${r.label}: ${venn.groups.map((g, i) => `${g.name} ${r.cs[i]}`).join(' · ')}`}</title>
                  {short(r.label)}
                </text>
              ))}
              {list.length > 4 && (
                <text x={a[0]} y={startY + shown.length * 14} textAnchor="middle" fontSize={10} fill={C.subtle}>
                  +{list.length - 4} more
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* The same thing as a table: exact counts, and the issues raised too rarely to place. */}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-[12px]">
          <thead>
            <tr className="text-left text-[10.5px] uppercase tracking-wide" style={{ color: C.subtle }}>
              <th className="pb-1.5 pr-3 font-semibold">Issue</th>
              {venn.groups.map((g, i) => (
                <th key={i} className="pb-1.5 pr-3 font-semibold" style={{ color: pal[i].text }}>
                  {g.name}
                </th>
              ))}
              <th className="pb-1.5 font-semibold">Where it sits</th>
            </tr>
          </thead>
          <tbody>
            {[...placed, ...thin].map((r) => (
              <tr key={r.key} style={{ borderTop: `1px solid ${C.rule}`, color: r.mask ? C.ink : C.subtle }}>
                <td className="py-1 pr-3">{r.label}</td>
                {r.cs.map((n, i) => (
                  <td key={i} className="py-1 pr-3 tabular-nums" style={{ fontWeight: n >= VENN_MIN ? 600 : 400 }}>
                    {n || '–'}
                  </td>
                ))}
                <td className="py-1">{r.mask ? regionName(r.mask, venn.groups.map((g) => g.name)) : 'Too few mentions to place'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ConcernVenn({ view }: { view: ConcernView }) {
  const [which, setWhich] = useState(view.venns[0]?.key ?? '');
  const labelOf = useMemo(() => new Map(view.clusters.map((c) => [c.key, c.label])), [view.clusters]);
  const venn = view.venns.find((v) => v.key === which) ?? view.venns[0];
  if (!venn) {
    return (
      <div className="p-5 text-[13px]" style={{ ...CARD, color: C.muted }}>
        Not enough concerns from different communities to compare yet (it needs at least two communities with three or more each).
      </div>
    );
  }
  return (
    <div className="p-5" style={CARD}>
      {view.venns.length > 1 && (
        <div className="mb-3 inline-flex rounded-lg p-0.5" style={{ background: '#F4EFF8' }}>
          {view.venns.map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => setWhich(v.key)}
              className="rounded-md px-3 py-1 text-[12.5px] font-semibold"
              style={v.key === venn.key ? { background: '#fff', color: C.purple, boxShadow: '0 1px 2px rgba(0,0,0,.08)' } : { color: C.muted }}
            >
              {v.label}
            </button>
          ))}
        </div>
      )}
      <VennDiagram venn={venn} labelOf={labelOf} />
      <div className="mt-3 space-y-1 text-[11.5px]" style={{ color: C.muted }}>
        {venn.groups.map((g, i) =>
          g.profile ? (
            <p key={i}>
              <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: paletteOf(venn.key)[i].fill }} />
              <b style={{ color: C.ink }}>{g.name}:</b> {g.profile}
            </p>
          ) : null
        )}
        <p style={{ color: C.subtle }}>
          An issue counts for a group when at least {VENN_MIN} of that group’s concern signals raise it; circles aren’t drawn to scale. {venn.note}
          {venn.unplaced ? ` ${venn.unplaced} concern signal${venn.unplaced === 1 ? ' isn’t' : 's aren’t'} from a place in any group.` : ''}
        </p>
      </div>
    </div>
  );
}
