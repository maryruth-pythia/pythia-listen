/**
 * Community views for GENERAL boards (e.g. Hawaiʻi community priorities): what people
 * raised BY ISSUE, and how that differs BY ISLAND.
 *
 * Rule-based and transparent, no AI: a signal counts toward an issue when one of its
 * issue tags uses that issue's words (tags are split into words, diacritics stripped),
 * so one signal can count toward several issues. Counts are signals, not people.
 * "What people raised" = community voice + public record; background (report findings,
 * community profiles) is counted separately and never mixed into the stance mix.
 */
import type { Signal, SignalStance } from '../types';

export type CommunityViewKey = 'issues' | 'islands' | 'vibrant';

interface IssueDef { id: string; label: string; words: string[] }

export const ISSUES: IssueDef[] = [
  { id: 'costs', label: 'Energy costs, bills & saving energy', words: ['affordability', 'affordable', 'bills', 'bill', 'costs', 'cost', 'rebates', 'incentives', 'savings', 'conservation', 'efficiency', 'kwh', 'finances', 'money', 'expensive', 'prices'] },
  { id: 'outages', label: 'Outages, the grid & backup power', words: ['outages', 'outage', 'reliability', 'backup', 'grid', 'microgrids', 'microgrid', 'generators', 'batteries', 'battery', 'storage', 'interconnection', 'utility', 'monopoly', 'gatekeeping'] },
  { id: 'hazards', label: 'Disasters, hazards & preparedness', words: ['vegetation', 'wildfire', 'fire', 'lava', 'eruption', 'storms', 'hurricane', 'preparedness', 'prepared', 'evacuation', 'emergency', 'emergencies', 'hubs', 'hub', 'disaster', 'disasters', 'drought', 'flooding', 'hazards', 'tsunami', 'resilience', 'adaptation', 'survival'] },
  { id: 'geothermal', label: 'Geothermal', words: ['geothermal', 'pele', 'sulfide', 'pgv'] },
  { id: 'wind', label: 'Wind', words: ['wind', 'turbines', 'turbine', 'bat'] },
  { id: 'solar', label: 'Solar', words: ['solar', 'agrivoltaics', 'pv'] },
  { id: 'fuels', label: 'Biomass, fuels & other technologies', words: ['biomass', 'hydrogen', 'biofuel', 'fossil', 'oil', 'lng', 'gas', 'coal', 'nuclear', 'pellets', 'ocean_thermal', 'thermal', 'ev', 'evs', 'transportation', 'transport', 'transit', 'charging'] },
  { id: 'siting', label: 'Where projects go & how they are designed', words: ['siting', 'setbacks', 'proximity', 'visual', 'cumulative', 'design', 'existing', 'sites', 'noise', 'traffic', 'facilities', 'burden', 'scale'] },
  { id: 'aina', label: 'ʻĀina, land & culture', words: ['aina', 'land', 'lands', 'culture', 'cultural', 'wahi', 'sacred', 'ahupuaa', 'preservation', 'iwi', 'burials', 'language', 'homesteading', 'hawaiian', 'legacy', 'way'] },
  { id: 'environment', label: 'Water, environment & health', words: ['water', 'environment', 'environmental', 'wildlife', 'forests', 'pollution', 'emissions', 'health', 'natural', 'ocean', 'reef', 'watershed', 'air', 'invasive', 'climate', 'coast', 'nature'] },
  { id: 'food', label: 'Food, farming & fishing', words: ['food', 'agriculture', 'agricultural', 'farming', 'farmers', 'farm', 'fishing', 'farmland', 'ranching', 'subsistence', 'gathering', 'breadfruit'] },
  { id: 'jobs', label: 'Jobs, training & the local economy', words: ['hiring', 'jobs', 'job', 'workforce', 'wage', 'training', 'apprenticeships', 'economy', 'economic', 'careers', 'business'] },
  { id: 'education', label: 'Information & energy education', words: ['education', 'awareness', 'information', 'literacy', 'schools', 'youth', 'expertise', 'experts', 'tools', 'familiarity', 'rights', 'knowledge'] },
  { id: 'benefits', label: 'Community benefits, ownership & fairness', words: ['ownership', 'benefits', 'benefit', 'profit', 'compensation', 'community_renewables', 'self', 'sufficiency', 'independence', 'reliance', 'equity', 'inequity', 'opportunity', 'fairness', 'stake', 'funding', 'justice', 'underinvestment'] },
  { id: 'voice', label: 'Trust, consent & having a say', words: ['participation', 'trust', 'distrust', 'transparency', 'engagement', 'consent', 'representation', 'consultation', 'relationships', 'determination', 'sovereignty', 'accountability', 'follow', 'listening', 'inclusion', 'planning', 'talk', 'voices', 'voice', 'decision', 'governance', 'control', 'input', 'grassroots', 'advocacy', 'protest', 'litigation', 'resistance', 'opposition', 'activism', 'regulatory', 'regulation', 'policy', 'puc', 'process', 'integrity', 'top', 'developer', 'developers'] },
  { id: 'housing', label: 'Housing, cost of living & staying in place', words: ['housing', 'displacement', 'poverty', 'living', 'gentrification', 'homelessness', 'houselessness', 'growth', 'development', 'staying', 'stability', 'homeownership'] },
  { id: 'ohana', label: 'Kūpuna, keiki, ʻohana & neighbors', words: ['kupuna', 'keiki', 'ohana', 'elders', 'families', 'family', 'mutual', 'aid', 'household', 'older', 'neighbors', 'volunteer', 'lending', 'safety'] },
  { id: 'reach', label: 'How to reach and involve people', words: ['outreach', 'channels', 'virtual', 'zoom', 'word', 'mouth', 'accessibility', 'fatigue', 'media', 'meetings', 'meeting', 'introductions', 'attendance', 'turnout', 'promotion', 'messengers', 'networks', 'association', 'hub_info', 'methods', 'communication', 'social'] },
];

/** Island outlines in a 525×350 box (equirectangular at 20.6°N). Source: © OpenStreetMap
 * contributors (ODbL), via @geo-maps/countries-land-1km, simplified. */
export const ISLAND_SHAPES: { id: string; name: string; d: string }[] = [
  { id: 'kauai', name: 'Kauaʻi', d: 'M75.9,46.3L71.0,44.6L69.7,45.8L63.8,39.7L55.2,37.0L52.6,32.7L53.1,28.4L56.7,25.1L58.7,20.0L63.9,18.2L72.0,12.6L74.8,12.5L78.5,14.7L80.9,12.0L86.3,13.4L88.7,11.7L93.6,13.5L98.9,20.7L98.7,24.5L94.9,30.5L95.4,39.1L91.4,40.3L93.8,39.7L94.0,41.3L84.9,48.2L75.9,46.3Z' },
  { id: 'niihau', name: 'Niʻihau', d: 'M23.0,46.8L17.4,49.3L15.8,47.6L13.9,48.9L16.3,51.2L14.2,56.4L10.9,55.8L9.6,50.8L11.7,49.5L11.3,46.5L15.3,42.5L21.1,39.5L22.5,35.6L26.3,34.8L28.1,36.8L25.6,39.6L25.8,45.3L23.0,46.8Z' },
  { id: 'molokai', name: 'Molokaʻi', d: 'M284.6,124.9L286.3,120.7L290.0,117.3L289.8,112.6L313.5,117.1L316.3,113.5L318.8,117.7L322.8,118.9L335.3,117.4L340.7,119.3L334.6,126.8L332.0,128.3L330.2,128.5L328.9,129.6L327.6,130.1L327.1,129.3L325.4,130.5L310.9,127.0L310.5,125.6L306.5,124.3L290.2,126.6L284.6,124.9Z' },
  { id: 'oahu', name: 'Oʻahu', d: 'M209.2,101.8L203.5,95.0L202.2,90.4L198.4,86.8L198.3,81.3L193.8,77.5L208.8,76.8L216.4,66.9L221.5,63.8L226.2,67.6L228.2,70.2L227.4,72.3L231.6,79.2L233.8,79.3L235.3,81.9L235.4,84.0L233.8,84.6L235.0,89.4L237.2,89.5L240.4,93.9L242.1,92.4L242.1,93.8L243.6,93.8L240.8,90.6L241.2,89.3L245.9,89.1L244.2,94.1L247.5,97.0L248.7,101.8L252.8,104.6L248.1,109.0L246.2,105.6L244.8,107.6L237.4,109.4L234.4,106.8L235.0,106.1L232.1,105.5L232.5,103.6L230.2,103.6L229.7,101.6L224.3,102.0L228.7,104.0L224.7,104.6L223.0,100.0L227.6,98.1L226.1,98.6L226.2,97.4L223.6,96.2L222.8,98.0L222.1,96.1L221.8,97.1L220.7,96.3L222.7,100.8L219.4,97.8L218.0,97.7L217.9,99.1L221.7,100.2L222.1,103.3L210.0,105.4L209.2,101.8Z' },
  { id: 'lanai', name: 'Lānaʻi', d: 'M323.9,161.5L316.8,161.7L314.3,156.9L314.6,152.6L312.6,149.7L308.7,147.7L308.2,144.0L314.7,142.1L321.5,143.0L329.6,149.4L331.7,154.4L328.9,158.9L323.9,161.5Z' },
  { id: 'kahoolawe', name: 'Kahoʻolawe', d: 'M355.4,180.5L357.4,182.1L356.2,183.8L352.3,184.2L351.1,182.6L350.6,183.7L347.3,184.5L346.7,183.4L344.2,184.9L341.7,182.6L343.8,179.5L353.5,174.6L356.7,177.3L355.4,180.5Z' },
  { id: 'maui', name: 'Maui', d: 'M347.2,132.6L352.1,131.9L356.4,134.8L362.8,145.9L377.0,140.3L384.8,141.5L391.6,148.9L395.0,149.2L396.4,152.4L399.2,152.2L407.1,155.8L409.1,158.5L408.3,164.2L402.7,169.9L397.1,170.9L394.1,173.2L389.2,172.1L379.3,176.7L368.5,176.7L364.9,171.6L365.9,169.9L365.3,163.4L362.8,155.3L356.9,157.6L348.9,154.1L342.8,146.8L342.4,140.2L344.8,134.3L347.5,133.7L347.2,132.6Z' },
  { id: 'hawaii', name: 'Hawaiʻi Island', d: 'M418.3,330.4L414.9,323.5L418.0,301.7L413.9,289.1L414.8,287.7L411.9,286.4L409.5,274.6L407.7,271.0L404.3,269.8L404.7,267.4L401.4,262.2L403.5,256.2L409.8,250.1L414.6,249.5L417.7,241.8L423.2,237.0L423.8,232.2L418.0,224.4L416.2,215.5L417.7,209.8L421.1,208.2L428.8,210.5L433.7,215.7L445.2,222.9L448.7,222.1L459.8,225.8L481.0,237.7L493.0,249.8L492.0,254.0L493.0,262.9L497.1,261.1L500.7,261.5L502.8,266.1L502.8,271.4L505.8,272.7L505.9,274.8L509.6,278.0L518.9,283.4L516.2,288.7L501.6,301.1L482.7,309.4L476.5,307.9L473.3,308.6L458.7,320.1L453.6,321.4L448.8,327.1L448.9,330.5L444.7,338.0L442.9,338.0L437.7,343.8L433.1,338.3L429.7,337.2L426.2,334.0L420.2,332.5L418.3,330.4Z' },
];

/** Where each island's label sits on the map (same 525×350 box). */
export const ISLAND_LABEL: Record<string, { x: number; y: number; anchor: 'start' | 'middle' | 'end' }> = {
  niihau: { x: 18, y: 72, anchor: 'start' },
  kauai: { x: 78, y: 66, anchor: 'middle' },
  oahu: { x: 223, y: 128, anchor: 'middle' },
  molokai: { x: 313, y: 93, anchor: 'middle' },
  lanai: { x: 300, y: 178, anchor: 'end' },
  kahoolawe: { x: 340, y: 202, anchor: 'end' },
  maui: { x: 412, y: 122, anchor: 'start' },
  hawaii: { x: 395, y: 300, anchor: 'end' },
};

/**
 * Community (the last " — " part of a signal's actor) → island. Statewide and
 * multi-island voices map to none and are left off the island view.
 */
const COMMUNITY_ISLAND: Record<string, string> = {
  // Hawaiʻi Island
  puna: 'hawaii', 'lower puna': 'hawaii', pahoa: 'hawaii', kau: 'hawaii', 'wao kele o puna': 'hawaii',
  'hawaii island': 'hawaii', 'hawaii island (survey)': 'hawaii', waikoloa: 'hawaii', hilo: 'hawaii', kona: 'hawaii',
  // Oʻahu
  oahu: 'oahu', 'oahu (survey)': 'oahu', kahuku: 'oahu', waianae: 'oahu', ewa: 'oahu', 'ewa beach': 'oahu',
  'kunia village': 'oahu', 'royal kunia': 'oahu', mililani: 'oahu', 'mililani mauka': 'oahu', 'mililani town': 'oahu',
  kalaeloa: 'oahu', 'central oahu': 'oahu', kapolei: 'oahu', waipio: 'oahu', 'pearl city': 'oahu',
  'makua valley': 'oahu', honouliuli: 'oahu', kawailoa: 'oahu', 'north shore': 'oahu', honolulu: 'oahu',
  // Maui
  maui: 'maui', 'maui (survey)': 'maui', kihei: 'maui', lahaina: 'maui', 'south maui': 'maui', 'west maui': 'maui',
  // Molokaʻi
  molokai: 'molokai', 'molokai (survey)': 'molokai', 'laau point': 'molokai',
  // Kauaʻi
  kauai: 'kauai', 'kauai (survey)': 'kauai',
  // Lānaʻi
  lanai: 'lanai',
};

function norm(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯʻ‘’']/g, '').toLowerCase().trim();
}

function tagWords(s: Signal): Set<string> {
  const out = new Set<string>();
  for (const t of s.themes ?? []) {
    if (t.startsWith('vh_')) continue; // Vibrant indicator tags have their own view
    for (const w of norm(t).split(/[^a-z0-9]+/)) if (w) out.add(w);
  }
  return out;
}

export function communityOf(s: Signal): string | undefined {
  const parts = (s.actor ?? '').split(' — ');
  return parts.length > 1 ? parts[parts.length - 1].trim() : undefined;
}

export function islandOf(s: Signal): string | undefined {
  const c = communityOf(s);
  return c ? COMMUNITY_ISLAND[norm(c)] : undefined;
}

/** A community needs at least this many signals to get its own column in the grid. */
export const MIN_COMMUNITY_SIGNALS = 15;

const emptyStance = (): Record<SignalStance, number> => ({ opposition: 0, concern: 0, mixed: 0, support: 0, neutral: 0 });
const isVoice = (s: Signal) => s.source === 'pythia' || s.source === 'civic';
const yearOf = (s: Signal) => (s.observedAt ?? '').slice(0, 4);

export interface IssueRow {
  id: string;
  label: string;
  /** Community voice + public record signals on this issue. */
  raised: number;
  community: number;
  record: number;
  /** Background signals (report findings, profiles) on this issue — not in the stance mix. */
  background: number;
  stance: Record<SignalStance, number>;
  years: Record<string, number>;
  communities: { name: string; n: number }[];
  /** Up to three example titles (community voice first), for the hover. */
  examples: string[];
}

export interface IslandRow {
  id: string;
  name: string;
  raised: number;
  community: number;
  record: number;
  stance: Record<SignalStance, number>;
  years: Record<string, number>;
  communities: { name: string; n: number }[];
  /** Most-raised issues here (share of this island's signals). */
  topIssues: { id: string; label: string; n: number; share: number }[];
  /** Issues raised here much more than on the other islands (percentage points). */
  standsOut: { id: string; label: string; share: number; elsewhere: number }[];
}

/** One column of the issues-by-community grid: a community we heard enough from. */
export interface CommunityColumn {
  name: string;
  island?: string;
  /** Community voice + public record signals from this community. */
  n: number;
  years: string[];
}

export interface IssueByCommunityRow {
  id: string;
  label: string;
  /** Raised across the shown communities. */
  total: number;
  /** One cell per column, same order. */
  cells: { n: number; share: number; stance: Record<SignalStance, number> }[];
}

export interface CommunityViews {
  issues: IssueRow[];
  /** Issues × communities grid (communities with at least MIN_COMMUNITY_SIGNALS). */
  columns: CommunityColumn[];
  grid: IssueByCommunityRow[];
  islands: IslandRow[];
  years: string[];
  /** Signals that match no issue (mostly demographics, history and outreach logistics). */
  unmatched: number;
  total: number;
  /** Voice signals with no island (statewide or multi-island). */
  noIsland: number;
}

/** The issue groups (ISSUES ids) a signal's tags fall into. Shared with the concern view. */
export function issueIdsOf(s: Signal): string[] {
  const w = tagWords(s);
  return ISSUES.filter((d) => d.words.some((x) => w.has(x))).map((d) => d.id);
}

/** Accent- and ʻokina-insensitive key for place names. */
export function placeKey(s: string): string {
  return norm(s);
}

function topCommunities(list: Signal[], k = 3) {
  const m = new Map<string, number>();
  for (const s of list) {
    const c = communityOf(s);
    if (c) m.set(c, (m.get(c) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, k).map(([name, n]) => ({ name, n }));
}

export function computeCommunityViews(signals: Signal[]): CommunityViews {
  const words = new Map<string, Set<string>>();
  for (const s of signals) words.set(s.id, tagWords(s));
  const issuesOf = (s: Signal) => ISSUES.filter((d) => d.words.some((w) => words.get(s.id)!.has(w)));

  const byIssue = new Map<string, Signal[]>();
  let unmatched = 0;
  for (const s of signals) {
    const hits = issuesOf(s);
    if (!hits.length) unmatched++;
    for (const d of hits) byIssue.set(d.id, [...(byIssue.get(d.id) ?? []), s]);
  }

  const issues: IssueRow[] = ISSUES.map((d) => {
    const all = byIssue.get(d.id) ?? [];
    const voice = all.filter(isVoice);
    const stance = emptyStance();
    const years: Record<string, number> = {};
    for (const s of voice) {
      stance[s.stance] = (stance[s.stance] ?? 0) + 1;
      const y = yearOf(s);
      if (y) years[y] = (years[y] ?? 0) + 1;
    }
    const examples = voice
      .filter((s) => s.stance !== 'neutral')
      .sort((a, b) => (b.salience ?? 0) - (a.salience ?? 0))
      .slice(0, 3)
      .map((s) => s.title);
    return {
      id: d.id,
      label: d.label,
      raised: voice.length,
      community: voice.filter((s) => s.source === 'pythia').length,
      record: voice.filter((s) => s.source === 'civic').length,
      background: all.length - voice.length,
      stance,
      years,
      communities: topCommunities(voice),
      examples,
    };
  })
    .filter((r) => r.raised + r.background > 0)
    .sort((a, b) => b.raised - a.raised || b.background - a.background);

  // Islands: community voice + public record only.
  const voiceAll = signals.filter(isVoice);
  const onIsland = new Map<string, Signal[]>();
  let noIsland = 0;
  for (const s of voiceAll) {
    const i = islandOf(s);
    if (!i) { noIsland++; continue; }
    onIsland.set(i, [...(onIsland.get(i) ?? []), s]);
  }
  const issueCount = (list: Signal[], id: string) => {
    const d = ISSUES.find((x) => x.id === id)!;
    return list.filter((s) => d.words.some((w) => words.get(s.id)!.has(w))).length;
  };
  const islands: IslandRow[] = ISLAND_SHAPES.map((shape) => {
    const list = onIsland.get(shape.id) ?? [];
    const others = voiceAll.filter((s) => { const i = islandOf(s); return i && i !== shape.id; });
    const stance = emptyStance();
    const years: Record<string, number> = {};
    for (const s of list) {
      stance[s.stance] = (stance[s.stance] ?? 0) + 1;
      const y = yearOf(s);
      if (y) years[y] = (years[y] ?? 0) + 1;
    }
    const perIssue = ISSUES.map((d) => {
      const n = issueCount(list, d.id);
      const o = issueCount(others, d.id);
      return {
        id: d.id,
        label: d.label,
        n,
        share: list.length ? n / list.length : 0,
        elsewhere: others.length ? o / others.length : 0,
      };
    });
    const topIssues = perIssue.filter((x) => x.n > 0).sort((a, b) => b.n - a.n).slice(0, 4)
      .map(({ id, label, n, share }) => ({ id, label, n, share }));
    const standsOut = list.length >= 8
      ? perIssue
          .filter((x) => x.n >= 3 && x.share - x.elsewhere >= 0.08)
          .sort((a, b) => (b.share - b.elsewhere) - (a.share - a.elsewhere))
          .slice(0, 2)
          .map(({ id, label, share, elsewhere }) => ({ id, label, share, elsewhere }))
      : [];
    return {
      id: shape.id,
      name: shape.name,
      raised: list.length,
      community: list.filter((s) => s.source === 'pythia').length,
      record: list.filter((s) => s.source === 'civic').length,
      stance,
      years,
      communities: topCommunities(list, 4),
      topIssues,
      standsOut,
    };
  });

  // Issues × communities: which issues each community raised, as a share of what we
  // heard from that community. Only communities with enough signal to compare.
  const byCommunity = new Map<string, Signal[]>();
  for (const s of voiceAll) {
    const c = communityOf(s);
    if (c) byCommunity.set(c, [...(byCommunity.get(c) ?? []), s]);
  }
  const islandOrder = ISLAND_SHAPES.map((x) => x.id);
  const columnsRaw = [...byCommunity.entries()]
    .filter(([, list]) => list.length >= MIN_COMMUNITY_SIGNALS)
    .map(([name, list]) => ({
      name,
      islandId: islandOf(list[0]),
      island: ISLAND_SHAPES.find((x) => x.id === islandOf(list[0]))?.name,
      n: list.length,
      years: [...new Set(list.map(yearOf).filter(Boolean))].sort(),
      list,
    }))
    .sort((a, b) =>
      (islandOrder.indexOf(b.islandId ?? '') - islandOrder.indexOf(a.islandId ?? '')) || b.n - a.n
    );
  const grid: IssueByCommunityRow[] = ISSUES.map((d) => {
    const cells = columnsRaw.map((c) => {
      const hits = c.list.filter((s) => d.words.some((w) => words.get(s.id)!.has(w)));
      const stance = emptyStance();
      for (const s of hits) stance[s.stance] = (stance[s.stance] ?? 0) + 1;
      return { n: hits.length, share: c.n ? hits.length / c.n : 0, stance };
    });
    return { id: d.id, label: d.label, total: cells.reduce((a, c) => a + c.n, 0), cells };
  })
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total);
  const columns: CommunityColumn[] = columnsRaw.map(({ name, island, n, years }) => ({ name, island, n, years }));

  const years = [...new Set(voiceAll.map(yearOf).filter(Boolean))].sort();
  return { issues, columns, grid, islands, years, unmatched, total: signals.length, noIsland };
}
