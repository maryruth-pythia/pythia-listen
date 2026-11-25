'use client';

import { useState } from 'react';
import type { PlacePoint, SignalRef } from '@/lib/dashboard/aggregate';
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
  opposition: { label: 'Opposition', color: '#FCC029' },
  concern: { label: 'Concern', color: '#F26D93' },
  mixed: { label: 'Mixed', color: '#EC2BFC' },
  support: { label: 'Support', color: '#6A0FC2' },
  neutral: { label: 'Neutral', color: '#9A8FA6' },
};
const SOURCE_LABEL: Record<SignalSource, string> = {
  desk: 'Internal docs',
  civic: 'Civic record',
  pythia: 'Internal docs',
  survey: 'Survey responses',
};

function scoreColor(s: number | null): string {
  if (s == null) return '#C9BEB2';
  if (s < 35) return '#FCC029';
  if (s < 45) return '#F26D93';
  if (s < 55) return '#EC2BFC';
  if (s < 65) return '#9B2ED6';
  return '#6A0FC2';
}
function scoreWord(s: number | null): string {
  if (s == null) return 'no sentiment yet';
  if (s < 35) return 'leans opposition';
  if (s < 45) return 'leans concern';
  if (s < 55) return 'mixed / neutral';
  if (s < 65) return 'leans support';
  return 'strong support';
}

interface GeoContext {
  region: string;
  near: string;
  refTowns: { name: string; x: number; y: number }[];
  roads: { label: string; x: number; y: number }[];
}
const GEO_CONTEXT: Record<string, GeoContext> = {
  'frasier-solar-knox-oh': {
    region: 'Knox County, Ohio',
    near: 'Miller & Clinton Townships · near Mount Vernon',
    refTowns: [
      { name: 'Fredericktown', x: 18, y: 12 },
      { name: 'Gambier', x: 90, y: 52 },
      { name: 'Centerburg', x: 12, y: 90 },
      { name: 'Danville', x: 92, y: 86 },
    ],
    roads: [
      { label: 'US-36', x: 12, y: 40 },
      { label: 'SR-13', x: 55, y: 8 },
      { label: 'SR-229', x: 82, y: 66 },
    ],
  },
  'cedar-ridge-solar-madison-oh': {
    region: 'Madison County, Ohio',
    near: 'Somerford & Deer Creek Townships · near London',
    refTowns: [
      { name: 'West Jefferson', x: 88, y: 14 },
      { name: 'Plain City', x: 14, y: 12 },
      { name: 'Mount Sterling', x: 16, y: 90 },
      { name: 'South Solon', x: 90, y: 88 },
    ],
    roads: [
      { label: 'US-42', x: 12, y: 40 },
      { label: 'US-40', x: 55, y: 8 },
      { label: 'SR-38', x: 82, y: 66 },
    ],
  },
  'pw-digital-gateway-va': {
    region: 'Prince William County, Virginia',
    near: 'Pageland Lane · adjacent to Manassas National Battlefield',
    refTowns: [
      { name: 'Haymarket', x: 16, y: 14 },
      { name: 'Gainesville', x: 30, y: 34 },
      { name: 'Manassas', x: 90, y: 60 },
      { name: 'Bristow', x: 40, y: 90 },
    ],
    roads: [
      { label: 'I-66', x: 14, y: 26 },
      { label: 'US-29 (Lee Hwy)', x: 55, y: 8 },
      { label: 'Pageland Ln', x: 82, y: 50 },
    ],
  },
};

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: C.muted }}>
      <span className="inline-block h-3 w-3 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

export default function OriginationMap({
  places,
  campaignId,
}: {
  places: PlacePoint[];
  campaignId: string;
}) {
  const [selected, setSelected] = useState<PlacePoint | null>(null);
  const geo = GEO_CONTEXT[campaignId];

  if (!places.length || !geo) {
    return (
      <div className="p-6 text-sm" style={{ ...CARD, color: C.muted }}>
        This is a general, non-local campaign — there’s no single project area to map.
        The origination map appears for specific projects.
      </div>
    );
  }

  return (
    <div className="p-4" style={CARD}>
      <div
        className="relative w-full overflow-hidden rounded-xl"
        style={{ height: 380, background: 'linear-gradient(160deg,#E9F1E3 0%,#F2F5EC 55%,#F6EFE2 100%)', border: '1px solid #E1E6D8' }}
      >
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" style={{ opacity: 0.55 }}>
          <line x1="0" y1="35" x2="100" y2="48" stroke="#C4B79B" strokeWidth="0.7" />
          <line x1="50" y1="0" x2="42" y2="100" stroke="#C4B79B" strokeWidth="0.7" />
          <line x1="0" y1="72" x2="100" y2="60" stroke="#B8CBA6" strokeWidth="0.7" />
        </svg>

        <div className="absolute" style={{ left: 12, top: 10 }}>
          <div className="font-serif text-[15px] font-semibold" style={{ color: C.plum }}>{geo.region}</div>
          <div className="text-[11px]" style={{ color: C.muted }}>{geo.near}</div>
        </div>
        <div className="absolute flex flex-col items-center" style={{ right: 14, top: 10, color: C.muted }}>
          <span style={{ fontSize: 14 }}>▲</span>
          <span className="text-[10px] font-semibold">N</span>
        </div>

        {geo.roads.map((rd) => (
          <span key={rd.label} className="absolute rounded px-1 text-[10px] font-semibold" style={{ left: `${rd.x}%`, top: `${rd.y}%`, transform: 'translate(-50%,-50%)', background: 'rgba(255,255,255,.7)', color: '#9A7B4A' }}>
            {rd.label}
          </span>
        ))}

        {geo.refTowns.map((t) => (
          <div key={t.name} className="absolute flex items-center gap-1" style={{ left: `${t.x}%`, top: `${t.y}%`, transform: 'translate(-50%,-50%)' }}>
            <span className="inline-block rounded-full" style={{ width: 6, height: 6, background: '#9A8FA6' }} />
            <span className="text-[10.5px]" style={{ color: C.muted }}>{t.name}</span>
          </div>
        ))}

        {/* signal-weighted place pins — now clickable */}
        {places.map((p) => {
          const r = 12 + Math.min(p.count, 24) * 1.1;
          const color = scoreColor(p.score);
          const active = selected?.name === p.name;
          return (
            <button
              key={p.name}
              type="button"
              onClick={() => setSelected(active ? null : p)}
              className="absolute cursor-pointer border-0 bg-transparent p-0"
              style={{ left: `${p.x}%`, top: `${p.y}%`, transform: 'translate(-50%,-100%)' }}
              aria-label={`${p.name}: ${p.count} signals — click for detail`}
            >
              <div className="whitespace-nowrap text-center text-[11px] font-semibold" style={{ color: C.plum, marginBottom: 2 }}>
                {p.name}{p.count > 0 ? ` · ${p.count}` : ''}
              </div>
              <div
                className="mx-auto"
                style={{
                  width: r, height: r, background: color,
                  border: active ? '3px solid #1F1330' : '2.5px solid #fff',
                  borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)',
                  boxShadow: active ? '0 0 0 3px rgba(122,79,192,.35), 0 3px 6px rgba(0,0,0,.28)' : '0 3px 6px rgba(0,0,0,.28)',
                  opacity: p.count > 0 ? 1 : 0.4,
                }}
              />
            </button>
          );
        })}
      </div>

      {/* Legend — what the colors mean */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="text-[11px] font-semibold" style={{ color: C.plum }}>Sentiment where signal clusters:</span>
        <LegendSwatch color="#FCC029" label="opposition" />
        <LegendSwatch color="#F26D93" label="concern" />
        <LegendSwatch color="#EC2BFC" label="mixed" />
        <LegendSwatch color="#9B2ED6" label="leaning support" />
        <LegendSwatch color="#6A0FC2" label="support" />
        <span className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: C.muted }}>
          <span className="inline-block rounded-full" style={{ width: 6, height: 6, background: '#9A8FA6' }} /> grey = reference town (context, not signal)
        </span>
      </div>
      <p className="mt-1.5 text-[11px]" style={{ color: C.subtle }}>
        Pin size = how much community signal references that place. Grey dots are real nearby
        towns for orientation. <strong>Click a pin</strong> to see the signals behind it. Schematic, not to scale.
      </p>

      {/* Detail panel for the selected pin */}
      {selected && (
        <div className="mt-3 rounded-xl border p-4" style={{ borderColor: C.rule, background: '#FBF7F0' }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-serif text-[16px] font-semibold" style={{ color: C.plum }}>{selected.name}</div>
              <div className="text-[12px]" style={{ color: C.muted }}>
                {selected.count} signal{selected.count === 1 ? '' : 's'} reference this place ·{' '}
                <span style={{ color: scoreColor(selected.score), fontWeight: 600 }}>{scoreWord(selected.score)}</span>
                {selected.score != null ? ` (${selected.score}/100)` : ''}
              </div>
            </div>
            <button type="button" onClick={() => setSelected(null)} className="text-[12px] underline underline-offset-2" style={{ color: C.subtle }}>
              close
            </button>
          </div>
          <SignalList signals={selected.signals} />
        </div>
      )}
    </div>
  );
}

function SignalList({ signals }: { signals: SignalRef[] }) {
  if (!signals.length) {
    return <p className="mt-2 text-[12px]" style={{ color: C.subtle }}>No individual signals attached.</p>;
  }
  return (
    <ul className="mt-2 space-y-1.5">
      {signals.map((s, i) => {
        const st = STANCE_META[s.stance];
        return (
          <li key={i} className="flex items-start gap-2 text-[12.5px]" style={{ color: C.ink }}>
            <span className="mt-0.5 inline-block flex-none rounded-full px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: `${st.color}22`, color: st.color }}>
              {st.label}
            </span>
            <span className="min-w-0 flex-1">
              {s.url ? (
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2" style={{ color: C.plum }}>
                  {s.title}
                </a>
              ) : (
                s.title
              )}
              <span className="ml-1 text-[11px]" style={{ color: C.subtle }}>· {SOURCE_LABEL[s.source]}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
