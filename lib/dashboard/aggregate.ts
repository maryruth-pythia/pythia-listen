/**
 * Live dashboard aggregation.
 *
 * Reads the real Signal records for a campaign and computes the numbers the
 * dashboard shows — the social-licence score, source breakdown, stance mix,
 * top themes (opinion clusters), coalition actors, and a simple sentiment
 * trend. All derived from live data; nothing fabricated.
 */

import { loadLensedSignals } from './signals';
import { NEW_ISSUE_DAYS, type LensRole } from '../analysis/lens';
import type { Signal, SignalSource, SignalStance } from '../types';

const STANCE_SCORE: Record<SignalStance, number> = {
  opposition: 8,
  concern: 30,
  mixed: 50,
  support: 78,
  neutral: 50,
};

/** CSIRO-style social-licence band from a 0–100 score. */
export function licenceBand(score: number): { key: string; label: string } {
  if (score < 25) return { key: 'opposition', label: 'Opposition' };
  if (score < 45) return { key: 'contested', label: 'Contested' };
  if (score < 62) return { key: 'acceptance', label: 'Acceptance' };
  if (score < 80) return { key: 'approval', label: 'Approval' };
  return { key: 'coownership', label: 'Co-ownership' };
}

/** A compact reference to a signal, for "what's behind this number" popovers. */
export interface SignalRef {
  title: string;
  source: SignalSource;
  stance: SignalStance;
  url?: string;
}

export interface ThemeCount {
  theme: string;
  count: number;
  /** Issue added to this dashboard's list recently (after the first build). */
  isNew?: boolean;
  /** Earliest observed date among the views on this issue (ISO). */
  firstSeen?: string;
}
export interface ActorCount {
  actor: string;
  count: number;
  /** The signals that mention this actor (for a click-through detail). */
  signals: SignalRef[];
}
export interface StanceCounts {
  opposition: number;
  concern: number;
  mixed: number;
  support: number;
  neutral: number;
}
export interface SourceSummary {
  source: SignalSource;
  count: number;
  stance: StanceCounts;
  score: number;
}
export interface TrendPoint {
  period: string; // YYYY-MM
  score: number;
  count: number;
  /** Distinct documents behind this period (by citation URL, else title): how much it rests on. */
  docs?: number;
  /** Score per source in this period (only sources with a signal that month). */
  sources: Partial<Record<SignalSource, number>>;
}
/** A local place plotted on the origination map, sized/colored by signal. */
export interface PlacePoint {
  name: string;
  x: number; // 0–100 schematic position
  y: number;
  count: number;
  score: number | null;
  /** The signals that reference this place (for a click-through detail). */
  signals: SignalRef[];
}

/** Compact reference for the "what's behind this" popovers. */
function toRef(s: Signal): SignalRef {
  return {
    title: s.title,
    source: s.source,
    stance: s.stance,
    url: s.citations?.[0]?.url,
  };
}

/** Known local places per campaign + their schematic map positions. */
const PLACE_MAP: Record<
  string,
  { name: string; aliases: string[]; x: number; y: number }[]
> = {
  'frasier-solar-knox-oh': [
    { name: 'Miller Township', aliases: ['miller'], x: 34, y: 42 },
    { name: 'Clinton Township', aliases: ['clinton'], x: 60, y: 58 },
    { name: 'Mount Vernon', aliases: ['mount vernon'], x: 74, y: 28 },
    { name: 'Project area', aliases: ['project area', '840 acre', 'array', 'frasier'], x: 48, y: 50 },
    { name: 'Knox County (rural)', aliases: ['knox'], x: 22, y: 72 },
  ],
  'cedar-ridge-solar-madison-oh': [
    { name: 'Somerford Township', aliases: ['somerford'], x: 34, y: 44 },
    { name: 'Deer Creek Township', aliases: ['deer creek'], x: 58, y: 60 },
    { name: 'London', aliases: ['london'], x: 72, y: 28 },
    { name: 'Cedar Ridge Road', aliases: ['cedar ridge'], x: 46, y: 50 },
    { name: 'Madison County (rural)', aliases: ['madison'], x: 22, y: 72 },
  ],
  'pw-digital-gateway-va': [
    { name: 'Pageland Lane', aliases: ['pageland'], x: 46, y: 48 },
    { name: 'Manassas Battlefield', aliases: ['manassas battlefield', 'battlefield', 'manassas national'], x: 60, y: 28 },
    { name: 'Gainesville', aliases: ['gainesville'], x: 30, y: 34 },
    { name: 'Haymarket', aliases: ['haymarket'], x: 22, y: 18 },
    { name: 'Bristow', aliases: ['bristow'], x: 40, y: 74 },
    { name: 'Manassas', aliases: ['manassas'], x: 76, y: 60 },
    { name: 'Project area', aliases: ['digital gateway', 'project area', '2,100 acre', 'corridor'], x: 48, y: 52 },
  ],
};

/** One issue (theme) with where each source lands on the 0–100 spectrum. */
export interface SpectrumRow {
  theme: string;
  total: number;
  isNew?: boolean;
  points: Partial<Record<SignalSource, { score: number; count: number }>>;
  /** Family rows only: the specific issues inside this family. */
  children?: SpectrumRow[];
}
export interface HeatCell {
  count: number;
  stance: SignalStance | null;
  intensity: 'strong' | 'some' | null;
}
export interface HeatRow {
  theme: string;
  total: number;
  isNew?: boolean;
  cells: Record<SignalSource, HeatCell>;
}
export interface DashboardData {
  campaignId: string;
  total: number;
  score: number;
  band: { key: string; label: string };
  stance: StanceCounts;
  sources: SourceSummary[];
  themes: ThemeCount[];
  heatmap: HeatRow[];
  actors: ActorCount[];
  trend: TrendPoint[];
  spectrum: SpectrumRow[];
  /**
   * The issue chart grouped by FAMILY (e.g. Environment → wildlife, water,
   * noise), with every specific issue inside its family. Present once the
   * signal lens has grouped this dashboard's issues; otherwise absent and the
   * flat top-issues `spectrum` is used. `spectrum` is unchanged for reports
   * and other pages.
   */
  spectrumFamilies?: SpectrumRow[];
  places: PlacePoint[];
  recent: Signal[];
  /** Signal lens summary (absent when the lens is off or hasn't sorted anything yet). */
  lens?: LensSummary;
  updatedAt: string;
}

/** What the signal lens did for this dashboard — shown so operators can check it. */
export interface LensSummary {
  /** Signals that express a view (used for sentiment, issues and analyses). */
  views: number;
  setAside: Record<Exclude<LensRole, 'view'>, number>;
  /** Signals not sorted yet (counted as views until they are). */
  pending: number;
  /** The dashboard's current issue list, biggest first. */
  issues: { label: string; views: number; firstSeen?: string; isNew: boolean; family?: string }[];
  /** A sample of what was set aside, for checking. */
  setAsideSample: (SignalRef & { role: Exclude<LensRole, 'view'> })[];
  /** Recent changes to the issue list (newest first). */
  log: { at: string; kind: string; detail: string }[];
  newIssueDays: number;
  /** True while nothing is sorted yet (the dashboard shows pre-lens numbers meanwhile). */
  sorting?: boolean;
  /** True while a sorting run is in progress (it continues after the page loads). */
  building?: boolean;
  /** True while a re-sort runs and the previous sort is shown meanwhile. */
  rebuilding?: boolean;
  /** Why the lens couldn't load at all, if it failed. */
  error?: string;
  /** The most recent sorting runs (newest first), so failures are visible. */
  runs?: { at: string; trigger: string; ms: number; pendingAfter: number; error?: string; steps: { step: string; ms: number; ok: boolean; note?: string }[] }[];
}

const HEAT_SOURCES: SignalSource[] = ['civic', 'pythia', 'survey'];

function dominantStance(signals: Signal[]): SignalStance | null {
  if (signals.length === 0) return null;
  const sc = emptyStance();
  for (const s of signals) sc[s.stance]++;
  return (Object.keys(sc) as SignalStance[]).reduce((a, b) =>
    sc[b] > sc[a] ? b : a
  );
}

function emptyStance(): StanceCounts {
  return { opposition: 0, concern: 0, mixed: 0, support: 0, neutral: 0 };
}

function scoreOf(signals: Signal[]): number {
  if (signals.length === 0) return 0;
  // Neutral signals are "just information" — they don't take a position on the
  // opposition→support spectrum, so they're excluded from the sentiment score.
  // Otherwise a corpus of descriptive notes (meetings, briefers) washes every
  // score to ~50. Fall back to the full set only if NOTHING expressed a view.
  const withView = signals.filter((s) => s.stance !== 'neutral');
  const pool = withView.length ? withView : signals;
  const sum = pool.reduce((a, s) => a + (STANCE_SCORE[s.stance] ?? 50), 0);
  return Math.round(sum / pool.length);
}

export async function computeDashboard(
  campaignId: string
): Promise<DashboardData> {
  // The signal lens: sentiment, issues and sources are built from VIEWS only;
  // context / process / off-topic signals are set aside (and listed), not deleted.
  const lensed = await loadLensedSignals(campaignId);
  const signals = lensed.views;

  const stance = emptyStance();
  for (const s of signals) stance[s.stance]++;

  // Per-source summaries.
  const bySource = new Map<SignalSource, Signal[]>();
  for (const s of signals) {
    const arr = bySource.get(s.source) ?? [];
    arr.push(s);
    bySource.set(s.source, arr);
  }
  const sources: SourceSummary[] = Array.from(bySource.entries()).map(
    ([source, list]) => {
      const sc = emptyStance();
      for (const s of list) sc[s.stance]++;
      return { source, count: list.length, stance: sc, score: scoreOf(list) };
    }
  );

  // Issues — frequency over views. With the lens on, `themes` already holds the
  // dashboard's evolving issue labels; new issues stay visible even when small.
  const newLabels = new Set<string>();
  if (lensed.lens) for (const id of lensed.lens.newIssueIds) {
    const l = lensed.lens.labelOf.get(id);
    if (l) newLabels.add(l);
  }
  const themeMap = new Map<string, number>();
  const firstSeenMap = new Map<string, string>();
  for (const s of signals)
    for (const t of s.themes) {
      themeMap.set(t, (themeMap.get(t) ?? 0) + 1);
      const d = s.observedAt ?? s.ingestedAt;
      const prev = firstSeenMap.get(t);
      if (d && (!prev || d < prev)) firstSeenMap.set(t, d);
    }
  const allThemes: ThemeCount[] = Array.from(themeMap.entries())
    .map(([theme, count]) => ({ theme, count, isNew: newLabels.has(theme), firstSeen: firstSeenMap.get(theme) }))
    .sort((a, b) => b.count - a.count);
  const pickTop = (n: number, maxNew: number): ThemeCount[] => {
    const top = allThemes.slice(0, n);
    const extraNew = allThemes.filter((t) => t.isNew && !top.includes(t)).slice(0, maxNew);
    return extraNew.length ? [...top.slice(0, n - extraNew.length), ...extraNew] : top;
  };
  const themes: ThemeCount[] = pickTop(12, 3);
  const chartThemes: ThemeCount[] = pickTop(8, 2);

  // Coalition — actors by frequency (orgs/roles only; PII already excluded).
  const actorSignals = new Map<string, SignalRef[]>();
  for (const s of signals) {
    if (!s.actor) continue;
    const arr = actorSignals.get(s.actor) ?? [];
    arr.push(toRef(s));
    actorSignals.set(s.actor, arr);
  }
  const actors: ActorCount[] = Array.from(actorSignals.entries())
    .map(([actor, refs]) => ({ actor, count: refs.length, signals: refs.slice(0, 10) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Sentiment over time — by month of observedAt (fallback ingestedAt).
  const periodMap = new Map<string, Signal[]>();
  for (const s of signals) {
    const d = new Date(s.observedAt ?? s.ingestedAt);
    if (isNaN(d.getTime())) continue;
    const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const arr = periodMap.get(period) ?? [];
    arr.push(s);
    periodMap.set(period, arr);
  }
  const trend: TrendPoint[] = Array.from(periodMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([period, list]) => {
      const perSource: Partial<Record<SignalSource, number>> = {};
      for (const src of HEAT_SOURCES) {
        const sub = list.filter((s) => s.source === src);
        if (sub.length) perSource[src] = scoreOf(sub);
      }
      return {
        period,
        score: scoreOf(list),
        count: list.length,
        docs: new Set(list.map((s) => s.citations?.[0]?.url || s.title)).size,
        sources: perSource,
      };
    });

  // Heat map — top themes × source, with dominant stance and intensity.
  const heatmap: HeatRow[] = chartThemes.map((t) => {
    const cells = {} as Record<SignalSource, HeatCell>;
    let total = 0;
    for (const src of HEAT_SOURCES) {
      const inCell = signals.filter(
        (s) => s.source === src && s.themes.includes(t.theme)
      );
      total += inCell.length;
      cells[src] = {
        count: inCell.length,
        stance: dominantStance(inCell),
        intensity:
          inCell.length >= 3 ? 'strong' : inCell.length >= 1 ? 'some' : null,
      };
    }
    return { theme: t.theme, total, cells, isNew: t.isNew };
  });

  const spectrumRow = (theme: string, inRow: (s: Signal) => boolean, isNew?: boolean): SpectrumRow => {
    const points: SpectrumRow['points'] = {};
    let total = 0;
    for (const src of HEAT_SOURCES) {
      const sub = signals.filter((s) => s.source === src && inRow(s));
      if (sub.length) {
        points[src] = { score: scoreOf(sub), count: sub.length };
        total += sub.length;
      }
    }
    return { theme, total, points, isNew };
  };

  // Issue families — every issue under its family; a family row counts each
  // signal once even if it touches several of the family's issues.
  let spectrumFamilies: SpectrumRow[] | undefined;
  const familyOf = lensed.lens?.familyOf;
  if (familyOf && familyOf.size && allThemes.length) {
    const fams = new Map<string, ThemeCount[]>();
    for (const t of allThemes) {
      const f = familyOf.get(t.theme) ?? 'Other';
      fams.set(f, [...(fams.get(f) ?? []), t]);
    }
    const famList = Array.from(fams.entries()).map(([family, issues]) => {
      const labels = new Set(issues.map((i) => i.theme));
      const inFam = (s: Signal) => s.themes.some((t) => labels.has(t));
      const anyNew = issues.some((i) => i.isNew);
      return {
        spectrum: {
          ...spectrumRow(family, inFam, anyNew),
          children: issues.map((i) => spectrumRow(i.theme, (s) => s.themes.includes(i.theme), i.isNew)),
        },
      };
    });
    famList.sort((a, b) => b.spectrum.total - a.spectrum.total);
    spectrumFamilies = famList.map((f) => f.spectrum);
  }

  // Issue spectrum — top themes, where each source lands on the 0–100 scale.
  const spectrum: SpectrumRow[] = chartThemes.map((t) => {
    const points: SpectrumRow['points'] = {};
    let total = 0;
    for (const src of HEAT_SOURCES) {
      const sub = signals.filter(
        (s) => s.source === src && s.themes.includes(t.theme)
      );
      if (sub.length) {
        points[src] = { score: scoreOf(sub), count: sub.length };
        total += sub.length;
      }
    }
    return { theme: t.theme, total, points, isNew: t.isNew };
  });

  // Origination map — count/score signals mentioning each known local place.
  const placeDefs = PLACE_MAP[campaignId] ?? [];
  const places: PlacePoint[] = placeDefs.map((pd) => {
    const hits = signals.filter((s) => {
      const t = `${s.title} ${s.summary}`.toLowerCase();
      return pd.aliases.some((a) => t.includes(a));
    });
    return {
      name: pd.name,
      x: pd.x,
      y: pd.y,
      count: hits.length,
      score: hits.length ? scoreOf(hits) : null,
      signals: hits.slice(0, 10).map(toRef),
    };
  });

  const recent = [...signals]
    .sort((a, b) => (b.observedAt ?? b.ingestedAt).localeCompare(a.observedAt ?? a.ingestedAt))
    .slice(0, 6);

  const score = scoreOf(signals);

  let lens: LensSummary | undefined;
  const runs = lensed.lens?.runs.slice(0, 5);
  const building = lensed.lens?.building;
  if (!lensed.lens && lensed.lensError) {
    lens = {
      views: signals.length,
      setAside: { context: 0, process: 0, off_topic: 0 },
      pending: lensed.all.length,
      issues: [],
      setAsideSample: [],
      log: [],
      newIssueDays: NEW_ISSUE_DAYS,
      sorting: true,
      error: lensed.lensError,
    };
  } else if (lensed.lens && lensed.lens.empty && lensed.lens.pending > 0) {
    lens = {
      views: signals.length,
      setAside: { context: 0, process: 0, off_topic: 0 },
      pending: lensed.lens.pending,
      issues: [],
      setAsideSample: [],
      log: lensed.lens.log.slice(0, 30),
      newIssueDays: NEW_ISSUE_DAYS,
      sorting: true,
      building,
      rebuilding: lensed.lens?.rebuilding,
      runs,
    };
  } else if (lensed.lens && !lensed.lens.empty) {
    const setAside = { context: 0, process: 0, off_topic: 0 };
    for (const s of lensed.setAside) setAside[s.lensRole as keyof typeof setAside]++;
    lens = {
      views: signals.length,
      setAside,
      pending: lensed.lens.pending,
      issues: allThemes.map((t) => ({ label: t.theme, views: t.count, firstSeen: t.firstSeen, isNew: !!t.isNew, family: lensed.lens?.familyOf.get(t.theme) })),
      setAsideSample: lensed.setAside.slice(0, 120).map((s) => ({ ...toRef(s), role: s.lensRole as Exclude<LensRole, 'view'> })),
      log: lensed.lens.log.slice(0, 30),
      newIssueDays: NEW_ISSUE_DAYS,
      building,
      rebuilding: lensed.lens?.rebuilding,
      runs,
    };
  }

  return {
    campaignId,
    total: lensed.all.length,
    score,
    band: licenceBand(score),
    stance,
    sources,
    themes,
    heatmap,
    actors,
    trend,
    spectrum,
    spectrumFamilies,
    places,
    recent,
    lens,
    updatedAt: new Date().toISOString(),
  };
}
