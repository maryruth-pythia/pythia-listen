import Link from 'next/link';
import LensAutoRefresh from './LensAutoRefresh';
import type {
  DashboardData,
  StanceCounts,
  TrendPoint,
  HeatRow,
  SpectrumRow,
  SourceSummary,
  PlacePoint,
} from '@/lib/dashboard/aggregate';
import type { SignalSource } from '@/lib/types';

/* Shared brand tokens (match the concept mockup). */
const C = {
  grad: 'linear-gradient(90deg,#FCC029 0%,#EC2BFC 52%,#6A0FC2 100%)',
  cream: '#FCF6C4',
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

const STANCE_META: Record<keyof StanceCounts, { label: string; color: string }> = {
  opposition: { label: 'Opposition', color: '#FCC029' },
  concern: { label: 'Concern', color: '#F26D93' },
  mixed: { label: 'Mixed', color: '#EC2BFC' },
  support: { label: 'Support', color: '#6A0FC2' },
  neutral: { label: 'Neutral', color: '#9A8FA6' },
};

const SOURCE_META: Record<
  SignalSource,
  { label: string; color: string; real?: boolean; href: string; manage: string }
> = {
  desk: { label: 'Internal docs', color: '#6A0FC2', href: '/operator/channels', manage: 'Open internal docs' },
  civic: { label: 'Civic record', color: '#EC2BFC', real: true, href: '/operator/civic', manage: 'Open civic record' },
  pythia: { label: 'Internal docs', color: '#6A0FC2', href: '/operator/channels', manage: 'Open internal docs' },
  survey: { label: 'Survey responses', color: '#2F8F6B', real: true, href: '/operator/surveys', manage: 'Open surveys' },
};
const SOURCE_ORDER: SignalSource[] = ['civic', 'pythia', 'survey'];

function prettify(t: string): string {
  const s = t.replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function StanceBar({ stance }: { stance: StanceCounts }) {
  const total = Object.values(stance).reduce((a, b) => a + b, 0) || 1;
  const order: (keyof StanceCounts)[] = ['opposition', 'concern', 'mixed', 'support', 'neutral'];
  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full" style={{ background: '#EFE7DA' }}>
      {order.map((k) =>
        stance[k] > 0 ? (
          <div key={k} style={{ width: `${(stance[k] / total) * 100}%`, backgroundColor: STANCE_META[k].color }} title={`${STANCE_META[k].label}: ${stance[k]}`} />
        ) : null
      )}
    </div>
  );
}

/* ── Hero: score + social-licence spectrum ───────────────────────── */
export function DashHero({ data }: { data: DashboardData }) {
  const drift = data.trend.length >= 2 ? data.trend[data.trend.length - 1].score - data.trend[0].score : 0;
  const driftDir = drift < 0 ? 'opposition' : 'support';
  return (
    <div className="grid items-center gap-6 p-6 md:grid-cols-[200px_1fr]" style={CARD}>
      <div className="text-center">
        <div className="text-[10.5px] uppercase tracking-[0.12em]" style={{ color: C.subtle }}>Project sentiment</div>
        <div className="font-serif text-[52px] font-semibold leading-none" style={{ color: C.plum }}>{data.score}</div>
        <div className="text-sm font-semibold" style={{ color: '#6A0FC2' }}>{data.band.label}</div>
        {Math.abs(drift) >= 1 && (
          <div className="mt-1.5 text-xs font-medium" style={{ color: drift < 0 ? '#FCC029' : '#6A0FC2' }}>
            {drift < 0 ? '▼' : '▲'} {Math.abs(drift)} pts toward {driftDir}
          </div>
        )}
      </div>
      <div>
        <div className="relative rounded-lg" title={`Social-licence bands (0–100): Opposition 0–24 · Contested 25–44 · Acceptance 45–61 · Approval 62–79 · Co-ownership 80–100. This project: ${data.score}, ${data.band.label}.`} style={{ height: 38, background: 'linear-gradient(90deg,#FCC029,#F26D93,#EC2BFC,#9B2ED6,#6A0FC2)' }}>
          <span className="absolute" style={{ left: `calc(${Math.max(1, Math.min(99, data.score))}% - 1.5px)`, top: -9, width: 3, height: 56, background: C.plum }} />
        </div>
        <div className="mt-3 flex justify-between text-[10.5px]" style={{ color: C.muted }}>
          {([
            ['Opposition', '0–24'],
            ['Contested', '25–44'],
            ['Acceptance', '45–61'],
            ['Approval', '62–79'],
            ['Co-ownership', '80–100'],
          ] as const).map(([name, range]) => (
            <span key={name} className="flex flex-col leading-tight" title={`${name}: sentiment score ${range} out of 100`}>
              <span>{name}</span>
              <span className="text-[9.5px]" style={{ color: C.subtle }}>{range}</span>
            </span>
          ))}
        </div>
        <p className="mt-3 text-[12.5px]" style={{ color: C.muted }}>
          {data.lens ? (
            <>
              {data.total} signals; {data.lens.views} express a view and are used here,
              across {data.sources.length} source{data.sources.length !== 1 ? 's' : ''} — compared, never averaged into one number.
              {' '}{data.total - data.lens.views} background or process signals are set aside (see “What counts as a view”).
              {data.stance.neutral > 0 && <> Score reflects the {data.lens.views - data.stance.neutral} views that take a position.</>}
            </>
          ) : (
            <>
              {data.total} signals across {data.sources.length} source{data.sources.length !== 1 ? 's' : ''} — compared, never averaged into one number.
              {data.stance.neutral > 0 && (
                <>
                  {' '}Score reflects the {data.total - data.stance.neutral} that
                  expressed a view; {data.stance.neutral} informational signals are
                  excluded.
                </>
              )}
            </>
          )}
        </p>
      </div>
    </div>
  );
}

/* ── Signal lens: what counts as a view, the issue list, its history ── */
const ROLE_LABEL: Record<string, string> = { context: 'Background', process: 'Process', off_topic: 'Off-topic' };
function fmtDay(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
type LensRunView = NonNullable<NonNullable<DashboardData['lens']>['runs']>[number];
function fmtTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
/** One line per sorting run: when, how long, what each step did, and any error. */
function LensRuns({ runs, open }: { runs?: LensRunView[]; open?: boolean }) {
  if (!runs || runs.length === 0) return null;
  const failed = (r: LensRunView) => !!r.error || r.steps.some((x) => !x.ok);
  return (
    <details className="mt-3 rounded-lg border p-3" style={{ borderColor: C.rule }} open={open}>
      <summary className="cursor-pointer text-[12.5px] font-semibold" style={{ color: C.plum }}>
        Sorting runs ({runs.length}){failed(runs[0]) ? ' · last run had a problem' : ''}
      </summary>
      <ul className="mt-2 space-y-2 text-[12px]" style={{ color: C.ink }}>
        {runs.map((r, i) => (
          <li key={i}>
            <div style={{ color: C.subtle }}>
              {fmtTime(r.at)} · {Math.round(r.ms / 1000)}s · {r.trigger} · {r.pendingAfter} left unsorted
            </div>
            {r.steps.length === 0 && !r.error && <div style={{ color: C.subtle }}>Nothing to do (or stopped before any step).</div>}
            {r.steps.map((x, j) => (
              <div key={j} style={{ color: x.ok ? C.ink : '#A3123A' }}>
                {x.ok ? '✓' : '✗'} {x.step} ({Math.round(x.ms / 1000)}s){x.note ? ` — ${x.note}` : ''}
              </div>
            ))}
            {r.error && <div style={{ color: '#A3123A' }}>✗ {r.error}</div>}
          </li>
        ))}
      </ul>
    </details>
  );
}

/**
 * One-line notice for the TOP of the dashboard, shown only while the lens is
 * still sorting (or has failed) — so readers know the numbers below aren't
 * final yet. The full "What counts as a view" panel sits at the bottom.
 * This line owns the auto-refresh while it's showing.
 */
export function LensStatusLine({ data }: { data: DashboardData }) {
  const L = data.lens;
  if (!L) return null;
  const active = L.sorting || L.building || L.pending > 0 || !!L.error || !!L.rebuilding;
  if (!active) return null;
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-xl px-4 py-2.5 text-[12.5px]" style={{ background: L.error ? '#FBECEA' : '#FCF6C4', color: L.error ? '#8A2B22' : '#6B5200' }}>
      <span className="font-semibold">{L.error ? 'Signal sorting is unavailable.' : L.rebuilding ? 'Re-sorting with updated rules…' : 'Sorting signals…'}</span>
      <span>
        {L.error
          ? 'The numbers below include every signal, not just views.'
          : L.rebuilding
            ? 'Showing the previous sort until the new one is finished.'
            : `${L.pending ? `${L.pending} signals still to sort — ` : 'Tidying the issue list — '}the numbers below aren’t final yet.`}{' '}
        <a href="#what-counts" className="underline underline-offset-2">Details at the bottom</a>.
      </span>
      {!L.error && <LensAutoRefresh />}
    </div>
  );
}

export function LensPanel({ data }: { data: DashboardData }) {
  const L = data.lens;
  if (!L) return null;
  if (L.sorting) {
    return (
      <div className="p-5" style={CARD}>
        <div className="flex flex-wrap items-baseline gap-x-3">
          <div className="text-[13px] font-semibold" style={{ color: C.plum }}>
            {L.error ? 'Signal sorting is unavailable' : L.building ? 'Sorting signals…' : 'Signals not sorted yet'}
          </div>
        </div>
        {L.error ? (
          <p className="mt-1 text-[12.5px]" style={{ color: '#A3123A' }}>{L.error}</p>
        ) : (
          <p className="mt-1 text-[12.5px]" style={{ color: C.muted }}>
            Pythia is separating views from background and process for {L.pending} signals and building this dashboard’s issue list.
            It keeps working on its own until every signal is sorted — you don’t need to stay on this page. Until it’s done the numbers above include everything; this page updates itself as it goes.
          </p>
        )}
        <LensRuns runs={L.runs} open />
      </div>
    );
  }
  const setAsideTotal = L.setAside.context + L.setAside.process + L.setAside.off_topic;
  const newCount = L.issues.filter((i) => i.isNew).length;
  return (
    <div className="p-5" style={CARD}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <div className="text-[13px] font-semibold" style={{ color: C.plum }}>What counts as a view</div>
        <div className="text-[12.5px]" style={{ color: C.muted }}>
          {L.views} of {data.total} signals express a view · {setAsideTotal} set aside
          ({L.setAside.context} background, {L.setAside.process} process{L.setAside.off_topic ? `, ${L.setAside.off_topic} off-topic` : ''})
          · {L.issues.length} issues{newCount ? ` (${newCount} new)` : ''}
          {L.pending > 0 && <> · {L.pending} still being sorted (counted as views for now)</>}
          {L.pending === 0 && L.building && <> · tidying the issue list</>}
        </div>
      </div>
      <p className="mt-1 text-[11.5px]" style={{ color: C.subtle }}>
        Sentiment, issues and the AI analyses use views only. Background facts are given to the analyses as context; nothing is deleted.
        The issue list grows as new data arrives — new issues are marked “new” for {L.newIssueDays} days.
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <details className="rounded-lg border p-3" style={{ borderColor: C.rule }}>
          <summary className="cursor-pointer text-[12.5px] font-semibold" style={{ color: C.plum }}>Issue list ({L.issues.length})</summary>
          <ul className="mt-2 max-h-72 space-y-1 overflow-y-auto text-[12px]" style={{ color: C.ink }}>
            {[...L.issues]
              .sort((a, b) => (a.family ?? '~').localeCompare(b.family ?? '~') || b.views - a.views)
              .map((i, idx, arr) => (
              <li key={i.label} className="flex items-baseline justify-between gap-2" style={i.family && arr[idx - 1]?.family !== i.family ? { marginTop: idx ? 8 : 0 } : undefined}>
                <span>
                  {i.family && arr[idx - 1]?.family !== i.family && (
                    <span className="block text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: C.subtle }}>{i.family}</span>
                  )}
                  {i.label}
                  {i.isNew && <span className="ml-1.5 rounded-full px-1.5 text-[9.5px] font-semibold uppercase" style={{ background: '#FCF6C4', color: '#8A6A00' }}>new</span>}
                </span>
                <span className="shrink-0 text-[11px]" style={{ color: C.subtle }}>{i.views}{i.firstSeen ? ` · since ${fmtDay(i.firstSeen)}` : ''}</span>
              </li>
            ))}
          </ul>
        </details>
        <details className="rounded-lg border p-3" style={{ borderColor: C.rule }}>
          <summary className="cursor-pointer text-[12.5px] font-semibold" style={{ color: C.plum }}>Set aside ({setAsideTotal})</summary>
          <ul className="mt-2 max-h-72 space-y-1 overflow-y-auto text-[12px]" style={{ color: C.ink }}>
            {L.setAsideSample.map((r, idx) => (
              <li key={idx}>
                <span className="mr-1.5 rounded px-1.5 text-[10px] font-semibold uppercase" style={{ background: '#F1EBF7', color: '#5b3f86' }}>{ROLE_LABEL[r.role] ?? r.role}</span>
                {r.url ? <a href={r.url} target="_blank" rel="noreferrer" className="hover:underline">{r.title}</a> : r.title}
              </li>
            ))}
            {setAsideTotal > L.setAsideSample.length && <li style={{ color: C.subtle }}>…and {setAsideTotal - L.setAsideSample.length} more</li>}
          </ul>
        </details>
        <details className="rounded-lg border p-3" style={{ borderColor: C.rule }}>
          <summary className="cursor-pointer text-[12.5px] font-semibold" style={{ color: C.plum }}>Issue list history</summary>
          <ul className="mt-2 max-h-72 space-y-1 overflow-y-auto text-[12px]" style={{ color: C.ink }}>
            {L.log.length === 0 && <li style={{ color: C.subtle }}>No changes yet.</li>}
            {L.log.map((e, idx) => (
              <li key={idx}><span style={{ color: C.subtle }}>{fmtDay(e.at)} · </span>{e.detail}</li>
            ))}
          </ul>
        </details>
      </div>
      <LensRuns runs={L.runs} />
    </div>
  );
}

/* ── Trend (multi-line) ──────────────────────────────────────────── */
const TREND_SERIES: { key: SignalSource | 'overall'; label: string; color: string; width: number; dash?: string }[] = [
  { key: 'overall', label: 'All sources', color: '#1F1330', width: 3 },
  { key: 'civic', label: 'Civic record', color: '#EC2BFC', width: 2 },
  { key: 'pythia', label: 'Internal docs', color: '#6A0FC2', width: 2 },
  { key: 'survey', label: 'Survey responses', color: '#2F8F6B', width: 2 },
];
const TREND_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtPeriod(p: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(p || '');
  if (!m) return p || '';
  const mi = parseInt(m[2], 10) - 1;
  return `${TREND_MONTHS[mi] ?? m[2]} \u2019${m[1].slice(2)}`;
}

export function TrendCard({ trend, stance, total }: { trend: TrendPoint[]; stance?: StanceCounts; total?: number }) {
  if (trend.length < 2) {
    if (stance && total && total > 0) {
      const order: (keyof StanceCounts)[] = ['opposition', 'concern', 'mixed', 'support', 'neutral'];
      return (
        <div className="p-5" style={CARD}>
          <div className="mb-3 flex items-baseline justify-between">
            <span className="font-serif text-[15px] font-semibold" style={{ color: C.plum }}>Sentiment snapshot</span>
            <span className="text-[11px]" style={{ color: C.subtle }}>{total} signal{total === 1 ? '' : 's'} · point-in-time</span>
          </div>
          <div className="space-y-2">
            {order.map((k) => {
              const pct = Math.round((stance[k] / total) * 100);
              return (
                <div key={k} className="flex items-center gap-3">
                  <span className="flex-none text-[12px]" style={{ width: 82, color: C.muted }}>{STANCE_META[k].label}</span>
                  <div className="h-3 flex-1 overflow-hidden rounded-full" style={{ background: '#F1EAE0' }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: STANCE_META[k].color }} />
                  </div>
                  <span className="flex-none text-right text-[12px] tabular-nums" style={{ width: 62, color: C.muted }}>{stance[k]} · {pct}%</span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[11px]" style={{ color: C.subtle }}>
            A time trend needs signals with dates, and many messages don’t carry one — so this shows where sentiment stands right now. The line chart appears automatically once signals span two dated periods.
          </p>
        </div>
      );
    }
    return <div className="p-5" style={CARD}><p className="text-xs" style={{ color: C.subtle }}>Not enough dated signal yet to chart a trend.</p></div>;
  }
  const hasDocs = trend.some((t) => t.docs != null);
  const W = 660, H = hasDocs ? 212 : 200, padL = 30, padR = 14, padT = 12, padB = hasDocs ? 42 : 30;
  const xs = (i: number) => padL + (i * (W - padL - padR)) / (trend.length - 1);
  const ys = (v: number) => padT + (1 - v / 100) * (H - padT - padB);
  const scoreAt = (t: TrendPoint, k: SignalSource | 'overall') => (k === 'overall' ? t.score : t.sources[k]);
  const active = TREND_SERIES.filter((s) => trend.filter((t) => scoreAt(t, s.key) != null).length >= 2);
  return (
    <div className="p-5" style={CARD}>
      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto block w-full" style={{ maxHeight: 240 }}>
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line x1={padL} y1={ys(v)} x2={W - padR} y2={ys(v)} stroke={C.rule} />
            <text x={padL - 6} y={ys(v) + 3} textAnchor="end" fontSize={10} fill={C.subtle}>{v}</text>
          </g>
        ))}
        {/* X-axis: time scale (period labels; thinned so they don't crowd) */}
        {(() => {
          // Keep labels evenly spaced FROM THE RIGHT so the last month always
          // shows and the final two (e.g. Jul '26 / Aug '26) never collide.
          const usableW = W - padL - padR;
          const maxLabels = Math.max(2, Math.floor(usableW / 54));
          const stepX = Math.max(1, Math.ceil(trend.length / maxLabels));
          const keep = new Set<number>();
          for (let i = trend.length - 1; i >= 0; i -= stepX) keep.add(i);
          if (Math.min(...keep) >= Math.ceil(stepX * 0.6)) keep.add(0);
          return trend.map((t, i) =>
            keep.has(i) ? (
              <text
                key={`x${i}`}
                x={xs(i)}
                y={H - padB + 16}
                textAnchor={i === 0 ? 'start' : i === trend.length - 1 ? 'end' : 'middle'}
                fontSize={9.5}
                fill={C.subtle}
              >
                {fmtPeriod(t.period)}
              </text>
            ) : null
          );
        })()}
        {/* How many distinct sources each month rests on (a partner's validation ask). */}
        {hasDocs &&
          trend.map((t, i) => (
            <text
              key={`d${i}`}
              x={xs(i)}
              y={H - padB + 29}
              textAnchor={i === 0 ? 'start' : i === trend.length - 1 ? 'end' : 'middle'}
              fontSize={8.5}
              fill={(t.docs ?? 0) <= 1 ? '#B26B00' : C.subtle}
            >
              {t.docs ?? 0}
            </text>
          ))}
        {active.map((s) => {
          const pts = trend.map((t, i) => ({ i, v: scoreAt(t, s.key) })).filter((p) => p.v != null) as { i: number; v: number }[];
          return (
            <g key={s.key}>
              <polyline points={pts.map((p) => `${xs(p.i)},${ys(p.v)}`).join(' ')} fill="none" stroke={s.color} strokeWidth={s.width} strokeLinejoin="round" strokeDasharray={s.dash} />
              {pts.map((p) => {
                const t = trend[p.i];
                const thin = hasDocs && (t.docs ?? 0) <= 1;
                return (
                  <circle key={p.i} cx={xs(p.i)} cy={ys(p.v)} r={3.5} fill={thin ? '#F5C77E' : '#fff'} stroke={s.color} strokeWidth={2}>
                    <title>{`${fmtPeriod(t.period)}: ${t.count} signal${t.count === 1 ? '' : 's'}${t.docs != null ? ` from ${t.docs} source${t.docs === 1 ? '' : 's'}` : ''}`}</title>
                  </circle>
                );
              })}
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {active.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: C.muted }}>
            <span className="inline-block h-2.5 w-4 rounded-full" style={{ background: s.color }} />{s.label}
          </span>
        ))}
      </div>
      <p className="mt-1 text-[11px]" style={{ color: C.subtle }}>
        Monthly &middot; measured from {fmtPeriod(trend[0].period)} to {fmtPeriod(trend[trend.length - 1].period)}.
        {hasDocs && <> The small number under each month is how many distinct sources that point rests on; amber dots rest on a single source, so read them as thin.</>}
      </p>
      {TREND_SERIES.filter((s) => s.key !== 'overall' && !active.includes(s)).length > 0 && (
        <p className="mt-2 text-[11px]" style={{ color: C.subtle }}>
          A line is drawn only for sources with signal across two or more dated periods. Not enough dated signal to trend yet:{' '}
          {TREND_SERIES.filter((s) => s.key !== 'overall' && !active.includes(s)).map((s) => s.label).join(', ')}.
        </p>
      )}
    </div>
  );
}

/* ── Concern heat-map ────────────────────────────────────────────── */
export function HeatMapCard({ rows }: { rows: HeatRow[] }) {
  const STANCE_LABEL: Record<string, string> = { opposition: 'Opposed', concern: 'Concerned', mixed: 'Mixed', support: 'Supportive', neutral: 'Neutral' };
  if (!rows.length) return <div className="p-5" style={CARD}><p className="text-xs" style={{ color: C.subtle }}>No themes tagged yet.</p></div>;
  return (
    <div className="overflow-x-auto p-5" style={CARD}>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="pb-2 text-left text-[11px] font-semibold uppercase tracking-wide" style={{ color: C.subtle }}>Theme</th>
            {SOURCE_ORDER.map((s) => <th key={s} className="pb-2 text-center text-[11px] font-semibold uppercase tracking-wide" style={{ color: C.subtle }}>{SOURCE_META[s].label.split(' ')[0]}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.theme} style={{ borderTop: `1px solid ${C.rule}` }}>
              <td className="py-1.5 pr-3 text-[13px]" style={{ color: C.plum }}>{prettify(r.theme)}{r.isNew && <span className="ml-1.5 rounded-full px-1.5 py-0.5 align-middle text-[9.5px] font-semibold uppercase tracking-wide" style={{ background: '#FCF6C4', color: '#8A6A00' }} title="Added to this dashboard's issue list recently">new</span>}</td>
              {SOURCE_ORDER.map((s) => {
                const cell = r.cells[s];
                if (!cell || !cell.stance) return <td key={s} className="py-1 text-center" style={{ color: '#C9BEB2' }}>—</td>;
                const color = STANCE_META[cell.stance].color;
                return (
                  <td key={s} className="py-1 text-center">
                    <span className="inline-block rounded px-2 py-0.5 text-[11.5px] font-semibold" style={{ background: `${color}1A`, color }}>
                      {STANCE_LABEL[cell.stance]}
                      <span className="font-normal" style={{ color: C.subtle }}> · {cell.intensity}</span>
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── The three signal sources ────────────────────────────────────── */
export function SourceCards({ sources, campaignId, only }: { sources: SourceSummary[]; campaignId?: string; only?: SignalSource[] }) {
  // Source pages open on the same project as this dashboard.
  const withProject = (href: string) => (campaignId ? `${href}?campaign=${encodeURIComponent(campaignId)}` : href);
  const byKey = new Map(sources.map((s) => [s.source, s]));
  return (
    <div className={`grid gap-4 ${only && only.length < 3 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
      {(only ?? SOURCE_ORDER).map((key) => {
        const m = SOURCE_META[key];
        const s = byKey.get(key);
        return (
          <div key={key} style={{ ...CARD, overflow: 'hidden' }}>
            <div style={{ height: 5, background: m.color }} />
            <div className="p-5">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-bold uppercase tracking-[0.08em]" style={{ color: m.color }}>{m.label}</span>
                {m.real && s && s.count > 0 && (
                  <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase" style={{ background: C.cream, color: '#6A0FC2' }}>Real</span>
                )}
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-serif text-[34px] font-semibold leading-none" style={{ color: C.plum }}>{s?.count ?? 0}</span>
                <span className="text-sm" style={{ color: C.subtle }}>signals</span>
              </div>
              {s && s.count > 0 ? (
                <>
                  <p className="mt-1 text-xs" style={{ color: C.subtle }}>score {s.score}/100</p>
                  <div className="mt-2"><StanceBar stance={s.stance} /></div>
                </>
              ) : (
                <p className="mt-2 text-xs" style={{ color: C.subtle }}>
                  {key === 'desk' ? 'Add desk research + refresh to populate.' : 'No signal yet.'}
                </p>
              )}
              <Link href={withProject(m.href)} className="mt-3 inline-block text-[12px] font-medium underline underline-offset-2" style={{ color: m.color }}>
                {m.manage} →
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Coalition & trusted messengers (network) ────────────────────── */
export function StakeholderMap({ actors }: { actors: { actor: string; count: number }[] }) {
  const top = actors.slice(0, 6);
  if (top.length === 0) return <div className="p-5" style={CARD}><p className="text-xs" style={{ color: C.subtle }}>No named organisations or roles yet.</p></div>;
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
          <line key={i} x1={cx} y1={cy} x2={n.x} y2={n.y} stroke={n.trusted ? '#FCC029' : '#D8CCBE'} strokeWidth={n.trusted ? 3 : 1.5} />
        ))}
        {/* center CBO */}
        <circle cx={cx} cy={cy} r={40} fill="#6A0FC2" />
        <text x={cx} y={cy + 5} textAnchor="middle" fontSize={15} fontWeight={700} fill="#fff">CBO</text>
        {nodes.map((n, i) => (
          <g key={i}>
            <circle cx={n.x} cy={n.y} r={n.r} fill={n.trusted ? C.cream : '#fff'} stroke={n.trusted ? '#FCC029' : '#C9B8DE'} strokeWidth={n.trusted ? 3 : 2} />
            <text x={n.x} y={n.y + 4} textAnchor="middle" fontSize={12} fill={C.muted}>{n.count}×</text>
            <text x={n.x} y={n.y - n.r - 6} textAnchor="middle" fontSize={11} fill={C.plum}>{n.actor.length > 18 ? n.actor.slice(0, 17) + '…' : n.actor}</text>
          </g>
        ))}
      </svg>
      <p className="text-center text-[11px]" style={{ color: C.subtle }}>
        Node size = how often each is mentioned · <span style={{ color: '#8A5A00' }}>gold = most-cited (proxy for trusted messenger)</span>
      </p>
    </div>
  );
}

/* ── Issue spectrum — where each source lands per issue ──────────── */
function SpectrumPin({ color, score, label }: { color: string; score: number; label: string }) {
  const L = Math.max(3, Math.min(97, score));
  return (
    <div className="absolute" style={{ left: `${L}%`, bottom: 6, transform: 'translateX(-50%)', height: 22, width: 2 }} title={label}>
      {/* stem */}
      <div style={{ width: 2, height: '100%', background: color, opacity: 0.55, margin: '0 auto' }} />
      {/* head */}
      <div
        style={{
          position: 'absolute', top: -7, left: '50%', transform: 'translateX(-50%)',
          width: 17, height: 17, borderRadius: '50%',
          background: color, border: '2.5px solid #fff',
          boxShadow: '0 2px 4px rgba(0,0,0,.32)',
        }}
      />
    </div>
  );
}

const NEW_BADGE = (
  <span className="ml-1.5 rounded-full px-1.5 py-0.5 align-middle text-[9.5px] font-semibold uppercase tracking-wide" style={{ background: '#FCF6C4', color: '#8A6A00' }} title="Added to this dashboard's issue list recently">new</span>
);

/** One issue (or family) bar with a pin per source. */
function SpectrumBar({ r, sub }: { r: SpectrumRow; sub?: boolean }) {
  return (
    <div className="relative" style={{ height: sub ? 18 : 22 }}>
      <div className="absolute inset-x-0 rounded-full" style={{ bottom: 0, height: sub ? 10 : 14, background: 'linear-gradient(90deg,#FCC029,#F26D93,#EC2BFC,#9B2ED6,#6A0FC2)', opacity: sub ? 0.75 : 1 }} />
      {SOURCE_ORDER.map((src) => {
        const p = r.points[src];
        if (!p) return null;
        return <SpectrumPin key={src} color={SOURCE_META[src].color} score={p.score} label={`${SOURCE_META[src].label}: ${p.score}/100 (${p.count})`} />;
      })}
    </div>
  );
}

/**
 * Where each source lands, per issue. With `families`, shows one row per issue
 * family (e.g. Environment); click a family to open its specific issues.
 * Without, shows the flat top-issues list (reports and older data).
 */
export function IssueSpectrum({ rows, families, emptyNote }: { rows: SpectrumRow[]; families?: SpectrumRow[]; emptyNote?: string }) {
  const grouped = !!families && families.length > 0;
  if (!grouped && !rows.length) return <div className="p-5" style={CARD}><p className="text-xs" style={{ color: C.subtle }}>{emptyNote ?? 'No issues tagged yet.'}</p></div>;
  return (
    <div className="p-5" style={CARD}>
      {grouped ? (
        <>
          <p className="mb-3 text-[11.5px]" style={{ color: C.subtle }}>
            {families!.length} issue families · {families!.reduce((n, f) => n + (f.children?.length ?? 0), 0)} specific issues — click a family to see its issues.
          </p>
          <div className="space-y-2.5">
            {families!.map((f) =>
              (f.children?.length ?? 0) === 1 ? (
                // A family with a single issue: show the issue itself, no drop-down.
                <div key={f.theme}>
                  <div className="mb-0.5 flex items-baseline gap-1.5 text-[13px] font-semibold" style={{ color: C.plum }}>
                    <span className="inline-block w-3" />
                    {prettify(f.children![0].theme)}
                    {f.children![0].theme.toLowerCase() !== f.theme.toLowerCase() && (
                      <span className="text-[11px] font-normal" style={{ color: C.subtle }}>{prettify(f.theme)}</span>
                    )}
                    <span className="text-[11px] font-normal" style={{ color: C.subtle }}>· {f.children![0].total} views</span>
                    {f.children![0].isNew && NEW_BADGE}
                  </div>
                  <SpectrumBar r={f.children![0]} />
                </div>
              ) : (
              <details key={f.theme} className="group">
                <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <div className="mb-0.5 flex items-baseline gap-1.5 text-[13px] font-semibold" style={{ color: C.plum }}>
                    <span className="inline-block w-3 text-[10px] transition-transform group-open:rotate-90" style={{ color: C.subtle }}>▶</span>
                    {prettify(f.theme)}
                    <span className="text-[11px] font-normal" style={{ color: C.subtle }}>
                      {f.children?.length ?? 0} issue{(f.children?.length ?? 0) === 1 ? '' : 's'} · {f.total} views
                    </span>
                    {f.isNew && NEW_BADGE}
                  </div>
                  <SpectrumBar r={f} />
                </summary>
                <div className="mb-2 ml-5 mt-2 space-y-1.5 border-l-2 pl-3" style={{ borderColor: C.rule }}>
                  {(f.children ?? []).map((c) => (
                    <div key={c.theme}>
                      <div className="text-[12px]" style={{ color: C.ink }}>
                        {prettify(c.theme)} <span style={{ color: C.subtle }}>· {c.total}</span>
                        {c.isNew && NEW_BADGE}
                      </div>
                      <SpectrumBar r={c} sub />
                    </div>
                  ))}
                </div>
              </details>
              )
            )}
          </div>
        </>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.theme}>
              <div className="mb-0.5 text-[13px] font-medium" style={{ color: C.plum }}>{prettify(r.theme)}{r.isNew && NEW_BADGE}</div>
              <SpectrumBar r={r} />
            </div>
          ))}
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1">
        {SOURCE_ORDER.map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: C.muted }}>
            <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-white" style={{ background: SOURCE_META[s].color, boxShadow: '0 1px 2px rgba(0,0,0,.3)' }} />{SOURCE_META[s].label}
          </span>
        ))}
        <span className="text-[11px]" style={{ color: C.subtle }}>— pins show where each source lands (opposition → support)</span>
      </div>
    </div>
  );
}

/* ── Origination — where solar could actually go ─────────────────── */
function scoreColor(s: number | null): string {
  if (s == null) return '#C9BEB2';
  if (s < 35) return '#FCC029';
  if (s < 45) return '#F26D93';
  if (s < 55) return '#EC2BFC';
  if (s < 65) return '#9B2ED6';
  return '#6A0FC2';
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

export function OriginationMap({ places, campaignId }: { places: PlacePoint[]; campaignId: string }) {
  const geo = GEO_CONTEXT[campaignId];
  if (!places.length || !geo) {
    return (
      <div className="p-6 text-sm" style={{ ...CARD, color: C.muted }}>
        This is a general, non-local campaign — there’s no single project area to map. The origination map appears for specific projects (Frasier, Cedar Ridge).
      </div>
    );
  }
  return (
    <div className="p-4" style={CARD}>
      <div
        className="relative w-full overflow-hidden rounded-xl"
        style={{ height: 380, background: 'linear-gradient(160deg,#E9F1E3 0%,#F2F5EC 55%,#F6EFE2 100%)', border: '1px solid #E1E6D8' }}
      >
        {/* faint schematic roads */}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" style={{ opacity: 0.55 }}>
          <line x1="0" y1="35" x2="100" y2="48" stroke="#C4B79B" strokeWidth="0.7" />
          <line x1="50" y1="0" x2="42" y2="100" stroke="#C4B79B" strokeWidth="0.7" />
          <line x1="0" y1="72" x2="100" y2="60" stroke="#B8CBA6" strokeWidth="0.7" />
        </svg>

        {/* region label */}
        <div className="absolute" style={{ left: 12, top: 10 }}>
          <div className="font-serif text-[15px] font-semibold" style={{ color: C.plum }}>{geo.region}</div>
          <div className="text-[11px]" style={{ color: C.muted }}>{geo.near}</div>
        </div>
        {/* compass */}
        <div className="absolute flex flex-col items-center" style={{ right: 14, top: 10, color: C.muted }}>
          <span style={{ fontSize: 14 }}>▲</span>
          <span className="text-[10px] font-semibold">N</span>
        </div>

        {/* road labels */}
        {geo.roads.map((rd) => (
          <span key={rd.label} className="absolute rounded px-1 text-[10px] font-semibold" style={{ left: `${rd.x}%`, top: `${rd.y}%`, transform: 'translate(-50%,-50%)', background: 'rgba(255,255,255,.7)', color: '#9A7B4A' }}>
            {rd.label}
          </span>
        ))}

        {/* real reference towns (context, not signal) */}
        {geo.refTowns.map((t) => (
          <div key={t.name} className="pointer-events-none absolute flex items-center gap-1" style={{ left: `${t.x}%`, top: `${t.y}%`, transform: 'translate(-50%,-50%)' }}>
            <span className="inline-block flex-none rounded-full" style={{ width: 6, height: 6, background: '#9A8FA6' }} />
            <span className="whitespace-nowrap rounded px-1 text-[10.5px]" style={{ color: C.muted, background: 'rgba(255,255,255,.7)' }}>{t.name}</span>
          </div>
        ))}

        {/* signal-weighted place pins */}
        {places.map((p) => {
          const r = 12 + Math.min(p.count, 24) * 1.1;
          const color = scoreColor(p.score);
          return (
            <div key={p.name} className="pointer-events-none absolute" style={{ left: `${p.x}%`, top: `${p.y}%`, transform: 'translate(-50%,-100%)', zIndex: 10 + Math.min(p.count, 40) }}>
              <div className="mx-auto whitespace-nowrap rounded px-1 text-center text-[11px] font-semibold" style={{ color: C.plum, marginBottom: 2, background: 'rgba(255,255,255,.72)', width: 'fit-content' }}>
                {p.name}{p.count > 0 ? ` · ${p.count}` : ''}
              </div>
              <div className="pointer-events-auto mx-auto cursor-default" title={`${p.name}: ${p.count} signals${p.score != null ? `, ${p.score}/100` : ''}`} style={{ width: r, height: r, background: color, border: '2.5px solid #fff', borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)', boxShadow: '0 3px 6px rgba(0,0,0,.28)', opacity: p.count > 0 ? 1 : 0.4 }} />
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[11px]" style={{ color: C.subtle }}>
        {geo.region} · grey dots are real nearby towns for orientation; colored pins are project-area places sized by signal volume and colored by sentiment (red opposition → green support). Schematic, not to scale.
      </p>
    </div>
  );
}

/* ── Engagement memory (illustrative CBO log) ────────────────────── */
const MEMORY = [
  { date: 'Mar 3', title: 'Talk-story at the Grange', note: '18 attendees · drainage & decommissioning top of mind' },
  { date: 'Feb 24', title: 'Call w/ township trustee', note: 'shared the setback ask; open to a benefit agreement' },
  { date: 'Feb 18', title: 'Community survey', note: '74 responses collected · summary attached' },
  { date: 'Feb 9', title: 'Email from developer', note: 'offered a site visit; awaiting community reply' },
];
export function EngagementMemory() {
  return (
    <div className="p-5" style={CARD}>
      <ul>
        {MEMORY.map((m, i) => (
          <li key={i} className="flex gap-4 py-3" style={{ borderTop: i === 0 ? 'none' : `1px solid ${C.rule}` }}>
            <span className="w-14 flex-none text-[13px]" style={{ color: C.subtle }}>{m.date}</span>
            <span className="text-[14px]" style={{ color: C.ink }}>
              <strong style={{ color: C.plum }}>{m.title}</strong> — {m.note}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px]" style={{ background: '#F1EAF6', color: '#6A0FC2' }}>
        🔒 CBO-owned · shared only with explicit permission · <span style={{ color: C.subtle }}>illustrative</span>
      </div>
    </div>
  );
}

/* ── Compare Projects ───────────────────────────────────────────── */
export function CompareCampaigns({ a, b }: { a: { name: string; data: DashboardData }; b: { name: string; data: DashboardData } | null }) {
  const col = (x: { name: string; data: DashboardData }, right?: boolean) => {
    const d = x.data;
    const drift = d.trend.length >= 2 ? d.trend[d.trend.length - 1].score - d.trend[0].score : 0;
    const topTheme = d.themes[0]?.theme ? prettify(d.themes[0].theme) : '—';
    return (
      <div className={right ? 'md:border-l md:pl-6' : ''} style={{ borderColor: C.rule }}>
        <div className="text-[11px] uppercase tracking-[0.1em]" style={{ color: C.subtle }}>{right ? 'Compared with' : 'This Project'}</div>
        <div className="font-serif text-lg font-semibold" style={{ color: C.plum }}>{x.name}</div>
        <dl className="mt-3 space-y-2 text-sm">
          {[
            ['Sentiment score', `${d.score} · ${d.band.label}`],
            ['Trend', `${drift >= 0 ? '+' : ''}${drift} pts`],
            ['Top shared concern', topTheme],
            ['Signals', String(d.total)],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3" style={{ borderBottom: `1px solid ${C.rule}`, paddingBottom: 6 }}>
              <dt style={{ color: C.muted }}>{k}</dt>
              <dd className="text-right font-semibold" style={{ color: C.ink }}>{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    );
  };
  if (!b) return <div className="p-5" style={CARD}><p className="text-sm" style={{ color: C.muted }}>Set up a second Project to compare a specific project against general solar sentiment.</p></div>;
  const gap = Math.abs(a.data.score - b.data.score);
  return (
    <div>
      <div className="grid gap-6 p-6 md:grid-cols-2" style={CARD}>{col(a)}{col(b, true)}</div>
      <div className="mt-3 rounded-lg p-4" style={{ background: '#FBF3DF', borderLeft: '4px solid #FCC029' }}>
        <p className="text-[13.5px]" style={{ color: C.ink }}>
          <strong>The {gap}-point gap is the headline.</strong> Comparing a specific project against general solar sentiment shows whether opposition is about solar itself or about trust, siting, and process on this project — the most constructive thing a CBO can bring to a developer.
        </p>
      </div>
    </div>
  );
}
