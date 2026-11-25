'use client';

import { useState } from 'react';
import type { ActorCount, SignalRef } from '@/lib/dashboard/aggregate';
import type { SignalSource, SignalStance } from '@/lib/types';

const C = {
  plum: '#1F1330',
  ink: '#2E2438',
  muted: '#6A5F74',
  subtle: '#9A8FA6',
  rule: '#E7DCD0',
  cream: '#FCF6C4',
  shadow: '0 1px 2px rgba(59,42,78,.05),0 6px 22px rgba(59,42,78,.07)',
};
const CARD: React.CSSProperties = {
  background: '#fff',
  border: `1px solid ${C.rule}`,
  borderRadius: 16,
  boxShadow: C.shadow,
};
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

export default function StakeholderMap({ actors }: { actors: ActorCount[] }) {
  const [selected, setSelected] = useState<ActorCount | null>(null);
  const top = actors.slice(0, 6);
  if (top.length === 0) {
    return (
      <div className="p-5" style={CARD}>
        <p className="text-xs" style={{ color: C.subtle }}>No named organisations or roles yet.</p>
      </div>
    );
  }
  const W = 720, H = 380, cx = W / 2, cy = H / 2, R = 135;
  const max = Math.max(...top.map((t) => t.count), 1);
  const trustedCount = Math.min(2, top.length);
  const nodes = top.map((t, i) => {
    const ang = (-90 + (i * 360) / top.length) * (Math.PI / 180);
    const r = 20 + (t.count / max) * 22;
    return { ...t, x: cx + R * Math.cos(ang), y: cy + R * Math.sin(ang), r, trusted: i < trustedCount };
  });

  return (
    <div className="p-4" style={CARD}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {nodes.map((n, i) => (
          <line key={`l${i}`} x1={cx} y1={cy} x2={n.x} y2={n.y} stroke={n.trusted ? '#FCC029' : '#D8CCBE'} strokeWidth={n.trusted ? 3 : 1.5} />
        ))}
        <circle cx={cx} cy={cy} r={40} fill="#6A0FC2" />
        <text x={cx} y={cy + 5} textAnchor="middle" fontSize={15} fontWeight={700} fill="#fff">CBO</text>
        {nodes.map((n, i) => {
          const active = selected?.actor === n.actor;
          return (
            <g key={`n${i}`} style={{ cursor: 'pointer' }} onClick={() => setSelected(active ? null : n)}>
              <circle
                cx={n.x} cy={n.y} r={n.r}
                fill={n.trusted ? C.cream : '#fff'}
                stroke={active ? '#1F1330' : n.trusted ? '#FCC029' : '#C9B8DE'}
                strokeWidth={active ? 4 : n.trusted ? 3 : 2}
              />
              <text x={n.x} y={n.y + 4} textAnchor="middle" fontSize={12} fill={C.muted}>{n.count}×</text>
              <text x={n.x} y={n.y - n.r - 6} textAnchor="middle" fontSize={11} fill={C.plum}>
                {n.actor.length > 18 ? n.actor.slice(0, 17) + '…' : n.actor}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="text-center text-[11px]" style={{ color: C.subtle }}>
        Node size = how often each is mentioned · <span style={{ color: '#8A5A00' }}>gold = most-cited (proxy for trusted messenger)</span> · <strong>click a bubble</strong> for the signals behind it
      </p>

      {selected && (
        <div className="mt-3 rounded-xl border p-4" style={{ borderColor: C.rule, background: '#FBF7F0' }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-serif text-[16px] font-semibold" style={{ color: C.plum }}>{selected.actor}</div>
              <div className="text-[12px]" style={{ color: C.muted }}>
                Mentioned in {selected.count} signal{selected.count === 1 ? '' : 's'} across the record
              </div>
            </div>
            <button type="button" onClick={() => setSelected(null)} className="text-[12px] underline underline-offset-2" style={{ color: C.subtle }}>
              close
            </button>
          </div>
          {selected.signals.length ? (
            <ul className="mt-2 space-y-1.5">
              {selected.signals.map((s: SignalRef, i) => {
                const st = STANCE_META[s.stance];
                return (
                  <li key={i} className="flex items-start gap-2 text-[12.5px]" style={{ color: C.ink }}>
                    <span className="mt-0.5 inline-block flex-none rounded-full px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: `${st.color}22`, color: st.color }}>
                      {st.label}
                    </span>
                    <span className="min-w-0 flex-1">
                      {s.url ? (
                        <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2" style={{ color: C.plum }}>{s.title}</a>
                      ) : (
                        s.title
                      )}
                      <span className="ml-1 text-[11px]" style={{ color: C.subtle }}>· {SOURCE_LABEL[s.source]}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-2 text-[12px]" style={{ color: C.subtle }}>No individual signals attached.</p>
          )}
        </div>
      )}
    </div>
  );
}
