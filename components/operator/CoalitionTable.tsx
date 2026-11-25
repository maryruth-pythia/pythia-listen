'use client';

import { Fragment, useState } from 'react';
import type {
  CoalitionAnalysis,
  CoalitionArchetype,
  CoalitionMember,
  CoalitionSignalRef,
} from '@/lib/analysis/coalition';
import type { SignalSource, SignalStance } from '@/lib/types';

const C = {
  plum: '#1F1330',
  ink: '#2E2438',
  muted: '#6A5F74',
  subtle: '#9A8FA6',
  rule: '#E7DCD0',
  shadow: '0 1px 2px rgba(59,42,78,.05),0 6px 22px rgba(59,42,78,.07)',
};
const CARD: React.CSSProperties = {
  background: '#fff',
  border: `1px solid ${C.rule}`,
  borderRadius: 16,
  boxShadow: C.shadow,
};

const ARCH_META: Record<CoalitionArchetype, { label: string; color: string; bg: string; blurb: string }> = {
  official: { label: 'Official / lawmaker', color: '#5A3E8C', bg: '#EEE9F6', blurb: 'Elected officials, state/county reps, board or council members, agencies.' },
  organization: { label: 'Organized group', color: '#EC2BFC', bg: '#F7E9F1', blurb: 'Coalitions, HOAs, advocacy orgs and trusts acting together.' },
  connector: { label: 'Community connector', color: '#B26A1E', bg: '#FaEEDD', blurb: 'The well-connected hub who knows everyone — whose word travels.' },
  expert: { label: 'Local expert', color: '#2F6F5A', bg: '#E4F1EB', blurb: 'A knowledgeable resident tracking the issue and helping others understand it.' },
  frontline: { label: 'Frontline resident', color: '#B23A2E', bg: '#F7E6E3', blurb: 'Those most directly impacted — nearest the site, whose story carries weight.' },
  proponent: { label: 'Project / developer', color: '#3E6E9E', bg: '#E5EEF6', blurb: 'The project or developer side.' },
};
const ARCH_ORDER: CoalitionArchetype[] = ['official', 'organization', 'connector', 'expert', 'frontline', 'proponent'];

const STANCE_META: Record<SignalStance, { label: string; color: string }> = {
  opposition: { label: 'Opposition', color: '#B23A2E' },
  concern: { label: 'Concern', color: '#C77D2A' },
  mixed: { label: 'Mixed', color: '#7A6E88' },
  support: { label: 'Support', color: '#4F8A5C' },
  neutral: { label: 'Neutral', color: '#9A8FA6' },
};
const SOURCE_LABEL: Record<SignalSource, string> = {
  desk: 'Internal docs',
  civic: 'Civic record',
  pythia: 'Internal docs',
  survey: 'Survey responses',
};
const REACH_META: Record<'high' | 'medium' | 'low', { label: string; dots: number }> = {
  high: { label: 'High', dots: 3 },
  medium: { label: 'Medium', dots: 2 },
  low: { label: 'Low', dots: 1 },
};

export default function CoalitionTable({ data, density }: { data: CoalitionAnalysis; density?: 'skimmable' | 'balanced' | 'detailed' }) {
  const [open, setOpen] = useState<number | null>(null);
  const [topPick, setTopPick] = useState<string | null>(null);
  const staticMode = !!density;

  if (!data.generated) {
    return (
      <div className="p-5" style={{ ...CARD, color: C.subtle }}>
        <p className="text-sm">{data.note ?? 'Not enough signal yet to map the community coalition.'}</p>
      </div>
    );
  }

  // Rank by perceived power (reach) then mentions; the operator's own pick, if
  // set, is pinned to the top.
  const rank = { high: 0, medium: 1, low: 2 };
  const members = [...data.members].sort((a, b) => {
    if (topPick) {
      if (a.name === topPick && b.name !== topPick) return -1;
      if (b.name === topPick && a.name !== topPick) return 1;
    }
    return rank[a.reach] - rank[b.reach] || b.mentions - a.mentions;
  });

  return (
    <div style={CARD}>
      {!staticMode && (
      <div className="flex flex-wrap items-center gap-2 px-4 pt-4 text-[12.5px]" style={{ color: '#6A5F74' }}>
        <span className="font-medium" style={{ color: '#1F1330' }}>In your view, who holds the most power to shift this?</span>
        <select
          value={topPick ?? ''}
          onChange={(e) => setTopPick(e.target.value || null)}
          className="rounded-md border px-2 py-1 text-[12.5px] outline-none"
          style={{ borderColor: '#E4DACB', color: '#1F1330' }}
        >
          <option value="">— use Pythia’s ranking —</option>
          {data.members.map((m) => (
            <option key={m.name} value={m.name}>{m.name}</option>
          ))}
        </select>
      </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr style={{ borderBottom: `1.5px solid ${C.rule}` }}>
              <Th>Stakeholder</Th>
              <Th>Type</Th>
              <Th className="hidden md:table-cell">Why they matter</Th>
              <Th>Power</Th>
              <Th>Mentions</Th>
            </tr>
          </thead>
          <tbody>
            {members.map((m, i) => {
              const a = ARCH_META[m.archetype];
              const isOpen = open === i;
              const showDetail = staticMode ? density === 'detailed' || (density === 'balanced' && i < 3) : isOpen;
              return (
                <Fragment key={`r${i}`}>
                  <tr
                    onClick={staticMode ? undefined : () => setOpen(isOpen ? null : i)}
                    className="cursor-pointer align-top transition"
                    style={{ borderBottom: `1px solid ${C.rule}`, background: isOpen ? '#FBF7F0' : 'transparent' }}
                  >
                    <td className="px-3 py-2">
                      <div className="font-serif text-[15px] font-semibold" style={{ color: C.plum }}>
                        {m.name}
                        {m.name === topPick && (
                          <span className="ml-1.5 rounded-full px-1.5 py-0.5 align-middle text-[10px] font-semibold" style={{ background: '#FaF0E2', color: '#B26A1E' }}>★ your call</span>
                        )}
                      </div>
                      {m.role && <div className="text-[12px]" style={{ color: C.muted }}>{m.role}</div>}
                      <div className="mt-1 text-[11px] md:hidden" style={{ color: C.muted }}>{m.influence}</div>
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: a.bg, color: a.color }}>
                        {a.label}
                      </span>
                    </td>
                    <td className="hidden px-3 py-2 text-[12.5px] leading-snug md:table-cell" style={{ color: C.ink, maxWidth: 300 }}>
                      <span style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{m.influence}</span>
                    </td>
                    <td className="px-3 py-2">
                      <Reach reach={m.reach} />
                    </td>
                    <td className="px-3 py-2 text-[13px]" style={{ color: C.muted }}>
                      {m.mentions > 0 ? `${m.mentions}×` : '—'}
                    </td>
                  </tr>
                  {showDetail && (
                    <tr key={`d${i}`} style={{ background: '#FBF7F0' }}>
                      <td colSpan={5} className="px-3 pb-3">
                        <p className="mb-1.5 text-[12.5px] leading-snug" style={{ color: C.ink }}>{m.influence}</p>
                        <div className="text-[12px]" style={{ color: C.muted }}>
                          <span className="font-semibold" style={{ color: C.plum }}>Dominant stance: </span>
                          <span style={{ color: STANCE_META[m.stance].color, fontWeight: 600 }}>{STANCE_META[m.stance].label}</span>
                        </div>
                        {m.signals.length ? (
                          <ul className="mt-1.5 space-y-1.5">
                            {m.signals.map((s: CoalitionSignalRef, j) => {
                              const st = STANCE_META[s.stance];
                              return (
                                <li key={j} className="flex items-start gap-2 text-[12.5px]" style={{ color: C.ink }}>
                                  <span className="mt-0.5 inline-block flex-none rounded-full px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: `${st.color}22`, color: st.color }}>{st.label}</span>
                                  <span className="min-w-0 flex-1">
                                    {s.url ? (
                                      <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2" style={{ color: C.plum }}>{s.title}</a>
                                    ) : s.title}
                                    <span className="ml-1 text-[11px]" style={{ color: C.subtle }}>· {SOURCE_LABEL[s.source]}</span>
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        ) : (
                          <p className="mt-1.5 text-[12px]" style={{ color: C.subtle }}>
                            A described role the signals point to — not tied to a single named source.
                          </p>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Archetype legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-4 py-3" style={{ borderTop: `1px solid ${C.rule}` }}>
        {ARCH_ORDER.map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: C.muted }} title={ARCH_META[k].blurb}>
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: ARCH_META[k].color }} />
            {ARCH_META[k].label}
          </span>
        ))}
      </div>
      <p className="px-4 pb-3 text-[11px]" style={{ color: C.subtle }}>
        Click a row to see the signals behind it. Named individuals are excluded from signals to protect privacy, so residents show as descriptive roles rather than personal names.
      </p>
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] ${className ?? ''}`} style={{ color: C.subtle }}>
      {children}
    </th>
  );
}

function Reach({ reach }: { reach: 'high' | 'medium' | 'low' }) {
  const r = REACH_META[reach];
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px]" style={{ color: C.muted }}>
      <span className="inline-flex gap-0.5">
        {[0, 1, 2].map((i) => (
          <span key={i} className="inline-block h-2 w-2 rounded-full" style={{ background: i < r.dots ? '#6A0FC2' : '#E0D6EA' }} />
        ))}
      </span>
      {r.label}
    </span>
  );
}
