import type { SignalStance } from '@/lib/types';
import type { CommunityViews, IslandRow } from '@/lib/dashboard/community-views';
import { ISLAND_LABEL, ISLAND_SHAPES } from '@/lib/dashboard/community-views';
import {
  VIBRANT_INDICATORS,
  lowShare,
  ratingTotal,
  vibrantShare,
  type IndicatorRatings,
} from '@/lib/dashboard/vibrant-indicators';

const INK = '#1F1330';
const MUTED = '#6B5F7A';
const LINE = '#E7E1F0';
const TRACK = '#F1EDF7';

// Same stance palette as the place map (OriginationMap).
const STANCE_COLORS: Record<SignalStance, string> = {
  support: '#6A0FC2',
  mixed: '#EC2BFC',
  neutral: '#CFC6DC',
  concern: '#F26D93',
  opposition: '#FCC029',
};
const STANCE_ORDER: SignalStance[] = ['support', 'mixed', 'neutral', 'concern', 'opposition'];

const pct = (n: number, d: number) => (d ? Math.round((100 * n) / d) : 0);

function StanceBar({ stance, total, height = 8 }: { stance: Record<SignalStance, number>; total: number; height?: number }) {
  const t = Math.max(1, total);
  const label = STANCE_ORDER.filter((k) => stance[k]).map((k) => `${k} ${stance[k]}`).join(' · ');
  return (
    <div className="flex w-full overflow-hidden rounded-full" style={{ height, background: TRACK }} title={label} aria-label={label}>
      {STANCE_ORDER.map((k) =>
        stance[k] ? <span key={k} style={{ width: `${(stance[k] / t) * 100}%`, background: STANCE_COLORS[k] }} /> : null
      )}
    </div>
  );
}

export function StanceLegend({ note }: { note?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[11.5px]" style={{ color: MUTED }}>
      {STANCE_ORDER.map((k) => (
        <span key={k} className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: STANCE_COLORS[k] }} />
          {k}
        </span>
      ))}
      {note && <span>· {note}</span>}
    </div>
  );
}

const yearText = (years: Record<string, number>, all: string[]) =>
  all.filter((y) => years[y]).map((y) => `${y}: ${years[y]}`).join(' · ');

/* --------------------------- Issues by community --------------------------- */

// Share of a community's signals that touch an issue → one of five steps.
const SHARE_STEPS = [
  { min: 0.3, fill: '#6A0FC2', text: '#FFFFFF', label: '30%+' },
  { min: 0.2, fill: '#9B5BE0', text: '#FFFFFF', label: '20–29%' },
  { min: 0.1, fill: '#C9A9F2', text: INK, label: '10–19%' },
  { min: 0.0001, fill: '#EBDFFB', text: INK, label: '1–9%' },
];
const shareStep = (share: number) => SHARE_STEPS.find((st) => share >= st.min);

/**
 * Issues × communities heatmap. Each column is a community we heard enough from; each
 * cell is the share of that community's signals that raise the issue. Read down a column
 * for a community's priorities, across a row for where an issue matters most.
 */
export function IssuesView({ view }: { view: CommunityViews }) {
  const cols = view.columns;
  if (!cols.length || !view.grid.length) {
    return <div className="text-[13px]" style={{ color: MUTED }}>Not enough signal from any one community to compare yet.</div>;
  }
  return (
    <div className="rounded-xl border bg-white p-4" style={{ borderColor: LINE }}>
      <p className="max-w-3xl text-[13px] leading-relaxed" style={{ color: INK }}>
        <strong>What each community raised most.</strong> Each column is one community; the darker the square, the bigger the
        share of what people there raised touches that issue. Read <em>down</em> a column for a community&rsquo;s priorities,
        <em> across</em> a row to see where an issue matters most.
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full border-separate text-[12.5px]" style={{ borderSpacing: 3 }}>
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-white pb-1 pr-2 text-left align-bottom text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: MUTED }}>
                Issue
              </th>
              {cols.map((c) => (
                <th key={c.name} className="min-w-[78px] pb-1 text-center align-bottom font-medium" style={{ color: INK }}>
                  <div className="text-[12.5px] leading-tight">{c.name}</div>
                  <div className="text-[10.5px] font-normal leading-tight" style={{ color: MUTED }}>
                    {[c.island, c.years.join('–')].filter(Boolean).join(' · ')}
                  </div>
                  <div className="text-[10.5px] font-normal leading-tight" style={{ color: MUTED }}>{c.n} signals</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.grid.map((r) => (
              <tr key={r.id}>
                <td className="sticky left-0 z-10 whitespace-nowrap bg-white py-0.5 pr-2" style={{ color: INK }}>{r.label}</td>
                {r.cells.map((cell, i) => {
                  const st = shareStep(cell.share);
                  const tone = STANCE_ORDER.filter((k) => cell.stance[k]).map((k) => `${k} ${cell.stance[k]}`).join(', ');
                  return (
                    <td
                      key={cols[i].name}
                      className="h-8 rounded-md text-center tabular-nums"
                      style={{ background: st?.fill ?? '#F7F5FB', color: st?.text ?? '#B9B0C6' }}
                      title={
                        cell.n
                          ? `${cols[i].name}: ${cell.n} of ${cols[i].n} signals (${pct(cell.n, cols[i].n)}%) raise ${r.label.toLowerCase()} — ${tone}`
                          : `${cols[i].name}: not raised`
                      }
                    >
                      {cell.n ? `${pct(cell.n, cols[i].n)}%` : '–'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11.5px]" style={{ color: MUTED }}>
        <span>Share of a community&rsquo;s signals that raise the issue:</span>
        {SHARE_STEPS.slice().reverse().map((st) => (
          <span key={st.label} className="flex items-center gap-1">
            <span className="inline-block h-3 w-4 rounded-sm" style={{ background: st.fill }} />
            {st.label}
          </span>
        ))}
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-4 rounded-sm border" style={{ background: '#F7F5FB', borderColor: LINE }} />
          not raised
        </span>
      </div>
      <div className="mt-2 text-[11.5px]" style={{ color: MUTED }}>
        Communities with {cols.length ? 'at least 15' : 'enough'} signals from community voice or the public record. One signal can raise
        several issues, so a column adds up to more than 100%. Hover a square for the count and how people there feel. The
        2022 and 2026 columns come from different engagements, so compare what was raised rather than exact sizes. For how
        each source (public record vs direct listening) lands on each issue, see section 04.
      </div>
    </div>
  );
}

/* ------------------------------ By island ------------------------------ */

// How much we heard from an island → one of four steps (shown in the map's legend).
const VOLUME_STEPS = [
  { min: 100, fill: '#6A0FC2', label: '100+ signals' },
  { min: 50, fill: '#9B5BE0', label: '50–99' },
  { min: 1, fill: '#C9A9F2', label: '1–49' },
  { min: 0, fill: '#ECE7F2', label: 'no data on this board' },
];
const islandFill = (n: number) => (VOLUME_STEPS.find((st) => n >= st.min) ?? VOLUME_STEPS[3]).fill;

function IslandMapSvg({ islands }: { islands: IslandRow[] }) {
  const byId = new Map(islands.map((i) => [i.id, i]));
  return (
    <svg viewBox="0 0 525 350" className="h-auto w-full" role="img" aria-label="Map of the main Hawaiian Islands, shaded by how many signals came from each island">
      {ISLAND_SHAPES.map((s) => {
        const row = byId.get(s.id);
        return (
          <path key={s.id} d={s.d} fill={islandFill(row?.raised ?? 0)} stroke="#FFFFFF" strokeWidth={0.8}>
            <title>{`${s.name}: ${row?.raised ? `${row.raised} signals` : 'no signals on this board'}`}</title>
          </path>
        );
      })}
      {ISLAND_SHAPES.map((s) => {
        const row = byId.get(s.id);
        const pos = ISLAND_LABEL[s.id];
        if (!pos) return null;
        const n = row?.raised ?? 0;
        const barW = 52;
        const x0 = pos.anchor === 'start' ? pos.x : pos.anchor === 'end' ? pos.x - barW : pos.x - barW / 2;
        let acc = 0;
        return (
          <g key={`l-${s.id}`}>
            <text x={pos.x} y={pos.y} textAnchor={pos.anchor} fontSize={n ? 11 : 9} fontWeight={n ? 600 : 400} fill={n ? INK : '#9A8FA6'}>
              {s.name}
            </text>
            <text x={pos.x} y={pos.y + 11} textAnchor={pos.anchor} fontSize={8.5} fill={MUTED}>
              {n ? `${n} signals` : 'no data'}
            </text>
            {n > 0 && row && (
              <g transform={`translate(${x0},${pos.y + 15})`}>
                <rect width={barW} height={5} rx={2} fill={TRACK} />
                {STANCE_ORDER.map((k) => {
                  const w = (row.stance[k] / n) * barW;
                  const el = w > 0 ? <rect key={k} x={acc} width={w} height={5} fill={STANCE_COLORS[k]} /> : null;
                  acc += w;
                  return el;
                })}
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function IslandCard({ r, years }: { r: IslandRow; years: string[] }) {
  return (
    <div className="rounded-xl border bg-white p-3.5" style={{ borderColor: LINE }}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[14px] font-semibold" style={{ color: INK }}>{r.name}</span>
        <span className="text-[12px] tabular-nums" style={{ color: MUTED }}>{r.raised} signals</span>
      </div>
      <div className="mt-0.5 text-[11.5px]" style={{ color: MUTED }}>
        {[yearText(r.years, years), r.communities.map((c) => c.name).join(', ')].filter(Boolean).join(' · ')}
      </div>
      <div className="mt-2"><StanceBar stance={r.stance} total={r.raised} height={7} /></div>
      {r.standsOut.length > 0 && (
        <div className="mt-2.5 text-[12.5px]" style={{ color: INK }}>
          <span className="font-semibold">Stands out here: </span>
          {r.standsOut.map((s, i) => (
            <span key={s.id}>
              {i > 0 && '; '}
              {s.label.toLowerCase()} ({pct(s.share, 1)}% of signals here vs {pct(s.elsewhere, 1)}% on other islands)
            </span>
          ))}
        </div>
      )}
      <div className="mt-2.5 text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: MUTED }}>Raised most here</div>
      <ul className="mt-1 space-y-1">
        {r.topIssues.map((t) => (
          <li key={t.id} className="grid grid-cols-[minmax(0,1fr)_80px_34px] items-center gap-2 text-[12px]" style={{ color: INK }}>
            <span className="truncate" title={t.label}>{t.label}</span>
            <span className="h-1.5 rounded-full" style={{ background: TRACK }}>
              <span className="block h-1.5 rounded-full" style={{ width: `${Math.min(100, Math.round(t.share * 250))}%`, background: '#6A0FC2' }} />
            </span>
            <span className="text-right tabular-nums" style={{ color: MUTED }}>{Math.round(t.share * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function IslandView({ view }: { view: CommunityViews }) {
  const withData = view.islands.filter((i) => i.raised > 0).sort((a, b) => b.raised - a.raised);
  const mixedYears = withData.some((i) => Object.keys(i.years).length > 0) &&
    new Set(withData.map((i) => Object.entries(i.years).sort((a, b) => b[1] - a[1])[0]?.[0])).size > 1;
  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-white p-3" style={{ borderColor: LINE }}>
        <IslandMapSvg islands={view.islands} />
        <div className="mt-2 grid gap-3 border-t pt-3 md:grid-cols-2" style={{ borderColor: LINE }}>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: MUTED }}>Island colour = how much we heard there</div>
            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11.5px]" style={{ color: MUTED }}>
              {VOLUME_STEPS.filter((st) =>
                // only the shades actually on the map
                view.islands.some((i) => islandFill(i.raised) === st.fill)
              ).map((st) => (
                <span key={st.label} className="flex items-center gap-1">
                  <span className="inline-block h-3 w-4 rounded-sm" style={{ background: st.fill }} />
                  {st.label}
                </span>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: MUTED }}>Bar under each name = how people there feel</div>
            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11.5px]" style={{ color: MUTED }}>
              {STANCE_ORDER.map((k) => (
                <span key={k} className="flex items-center gap-1">
                  <span className="inline-block h-2 w-4 rounded-sm" style={{ background: STANCE_COLORS[k] }} />
                  {k}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-2 text-right text-[10.5px]" style={{ color: '#9A8FA6' }}>Island outlines © OpenStreetMap contributors</div>
      </div>
      {mixedYears && (
        <div className="rounded-lg px-3 py-2 text-[12.5px]" style={{ background: '#FFF7E0', color: '#5A4A1E' }}>
          Read across islands with care: the evidence differs by place and year (for example, 2026 surveys on Hawaiʻi Island
          and 2022 workshops and interviews elsewhere). Differences in <em>what</em> people raised are more reliable than
          differences in tone.
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {withData.map((r) => <IslandCard key={r.id} r={r} years={view.years} />)}
      </div>
      <div className="text-[11.5px]" style={{ color: MUTED }}>
        Community voice and public record only; background findings are left out. {view.noIsland > 0 && `${view.noIsland} statewide or multi-island signals aren't placed on an island. `}
        &ldquo;Stands out&rdquo; = an issue at least 8 points more common here than across the other islands (islands with 8+ signals).
      </div>
    </div>
  );
}

/* ------------------------- Vibrant Hawaiʻi indicators ------------------------- */

// Diverging scale: left side 0–50% (bad + terrible), right side 0–100% (good + vibrant).
const LEFT = 50;
const RIGHT = 100;
const SPAN = LEFT + RIGHT;
const RATING_COLORS = { terrible: '#D9480F', bad: '#F7A35C', good: '#B48CE8', vibrant: '#6A0FC2' };

function DivergingBar({ r }: { r: IndicatorRatings }) {
  const n = ratingTotal(r);
  const p = (k: number) => (100 * k) / n;
  const w = (v: number) => `${(v / SPAN) * 100}%`;
  const low = p(r.terrible + r.bad);
  const high = p(r.good + r.vibrant);
  const title = `${r.community}: terrible ${r.terrible}, bad ${r.bad}, good ${r.good}, vibrant ${r.vibrant} (n=${n}; ${r.cite})`;
  return (
    <div className="grid grid-cols-[44px_minmax(0,1fr)_40px] items-center gap-2" title={title}>
      <span className="text-[12px]" style={{ color: MUTED }}>{r.community}</span>
      <div className="relative h-4">
        {/* bad + terrible, growing leftward from the centre line */}
        <div className="absolute inset-y-0 flex justify-end" style={{ left: 0, width: w(LEFT) }}>
          <span className="h-full" style={{ width: `${(p(r.terrible) / LEFT) * 100}%`, background: RATING_COLORS.terrible, order: 0 }} />
          <span className="h-full" style={{ width: `${(p(r.bad) / LEFT) * 100}%`, background: RATING_COLORS.bad, order: 1 }} />
        </div>
        {/* good + vibrant, growing rightward */}
        <div className="absolute inset-y-0 flex" style={{ left: w(LEFT), width: w(RIGHT) }}>
          <span className="h-full" style={{ width: `${(p(r.good) / RIGHT) * 100}%`, background: RATING_COLORS.good }} />
          <span className="h-full" style={{ width: `${(p(r.vibrant) / RIGHT) * 100}%`, background: RATING_COLORS.vibrant }} />
        </div>
        <div className="absolute inset-y-[-3px] w-px" style={{ left: w(LEFT), background: INK }} />
        <span className="absolute top-1/2 -translate-y-1/2 pr-1 text-right text-[10.5px] tabular-nums" style={{ right: `calc(${w(RIGHT)} + ${(low / SPAN) * 100}% )`, color: MUTED }}>
          {Math.round(low)}%
        </span>
        <span className="absolute top-1/2 -translate-y-1/2 pl-1 text-[10.5px] tabular-nums" style={{ left: `calc(${w(LEFT)} + ${(high / SPAN) * 100}%)`, color: MUTED }}>
          {Math.round(high)}%
        </span>
      </div>
      <span className="text-right text-[12.5px] font-semibold tabular-nums" style={{ color: INK }}>{r.avg.toFixed(2)}</span>
    </div>
  );
}

function explain(ratings: IndicatorRatings[]): string {
  const parts = ratings.map((r) => `${lowShare(r)}% in ${r.community}`);
  const vib = ratings.map((r) => `${vibrantShare(r)}%`);
  return `${parts.join(' and ')} rated it bad or terrible; ${vib.join(' and ')} called it vibrant.`;
}

export function VibrantIndicatorsView() {
  const rows = [...VIBRANT_INDICATORS].sort(
    (a, b) => b.ratings.reduce((s, r) => s + r.avg, 0) - a.ratings.reduce((s, r) => s + r.avg, 0)
  );
  const top = rows[0];
  const bottom = rows.slice(-2);
  const communities = top.ratings.map((r) => r.community).join(' and ');
  const lows = bottom.flatMap((b) => b.ratings.map(lowShare));
  return (
    <div className="rounded-xl border bg-white p-4" style={{ borderColor: LINE }}>
      <div className="text-[13.5px] font-semibold" style={{ color: INK }}>How residents rate their community — Vibrant Hawaiʻi indicators</div>
      <p className="mt-1 max-w-3xl text-[12.5px] leading-relaxed" style={{ color: MUTED }}>
        Survey respondents in {communities} (2026) rated seven conditions Vibrant Hawaiʻi developed with Hawaiʻi Island communities,
        from 1 = terrible to 4 = vibrant. Across both places {top.label} rates strongest and {bottom.map((b) => b.label).join(' and ')} weakest:{' '}
        {Math.min(...lows)}–{Math.max(...lows)}% rate those two bad or terrible.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11.5px]" style={{ color: MUTED }}>
        {(['terrible', 'bad', 'good', 'vibrant'] as const).map((k) => (
          <span key={k} className="flex items-center gap-1">
            <span className="inline-block h-2 w-3 rounded-sm" style={{ background: RATING_COLORS[k] }} />
            {k}
          </span>
        ))}
        <span>· Left of the line: bad or terrible. Right: good or vibrant. Number on the right: average score.</span>
      </div>
      <ul className="mt-4 divide-y" style={{ borderColor: LINE }}>
        {rows.map((ind) => (
          <li key={ind.id} className="py-3" style={{ borderColor: LINE }}>
            <div className="text-[13.5px] font-semibold" style={{ color: INK }}>{ind.label}</div>
            <div className="mt-0.5 text-[12.5px] leading-snug" style={{ color: MUTED }}>
              <span style={{ color: INK }}>{ind.definition}</span> {explain(ind.ratings)}
            </div>
            <div className="mt-2 space-y-1.5">
              {ind.ratings.map((r) => <DivergingBar key={r.community} r={r} />)}
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-2 text-[11px]" style={{ color: '#9A8FA6' }}>
        Source: Vibrant Hawaiʻi / KōCreate 2026 Puna (pp. 12–13) and Kaʻū (pp. 10–11) reports; definitions as printed. Respondents per
        indicator: Puna 307–320, Kaʻū 129–135.
      </div>
    </div>
  );
}
