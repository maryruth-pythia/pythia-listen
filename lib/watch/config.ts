/**
 * Which counties a watch covers and where each one publishes meeting agendas.
 * Kept separate from lib/campaigns.ts so the collectors don't import the campaign list.
 */

export type AgendaSource =
  /** CivicPlus "Agenda Center": an RSS feed of every agenda/minutes post on the site. */
  | { kind: 'civicplus'; base: string; label: string }
  /** A plain web page that links agenda packets as PDFs (e.g. WordPress uploads). */
  | { kind: 'page-pdfs'; url: string; label: string };

export interface WatchCounty {
  /** Normalised name as the sources spell it, without "County" (e.g. "Wise", "Norton"). */
  name: string;
  /** Display name. */
  label: string;
  agendas: AgendaSource[];
  /** Shown in the coverage panel when there's no online agenda source. */
  agendaNote?: string;
  /** 'core' = the client's own counties; 'nearby' = neighbours shown separately until confirmed. */
  tier?: 'core' | 'nearby';
}

export interface WatchConfig {
  /** Two-letter state; the state-level collectors are Virginia-only for now. */
  state: 'VA';
  counties: WatchCounty[];
  /** PJM fuel types to keep (case-insensitive substring match). */
  fuels: string[];
  /** Env var holding comma-separated digest recipients (kept out of the repo). */
  digestEnv?: string;
}

const NEARBY = 'Nearby locality: watched through the grid queue and state filings only (no agenda reading yet).';

const NO_AGENDAS =
  'No online agenda source found yet. If agendas aren’t posted, this county can only be watched through state filings and the grid queue.';

/**
 * Southwest Virginia coalfield localities (the VCEDA region: Buchanan, Dickenson, Lee,
 * Russell, Scott, Tazewell and Wise counties and the City of Norton).
 */
export const SWVA_WATCH: WatchConfig = {
  state: 'VA',
  fuels: ['solar', 'storage', 'wind', 'hybrid'],
  digestEnv: 'PYTHIA_WATCH_DIGEST_SWVA',
  counties: [
    { name: 'Buchanan', label: 'Buchanan County', agendas: [], agendaNote: NO_AGENDAS },
    { name: 'Dickenson', label: 'Dickenson County', agendas: [], agendaNote: NO_AGENDAS },
    { name: 'Lee', label: 'Lee County', agendas: [], agendaNote: NO_AGENDAS },
    {
      name: 'Russell',
      label: 'Russell County',
      agendas: [{ kind: 'civicplus', base: 'https://www.russellcountyva.gov', label: 'Russell County Agenda Center' }],
    },
    { name: 'Scott', label: 'Scott County', agendas: [], agendaNote: NO_AGENDAS },
    {
      name: 'Tazewell',
      label: 'Tazewell County',
      agendas: [
        { kind: 'page-pdfs', url: 'https://tazewellcountyva.org/government/board-of-supervisors/', label: 'Board of Supervisors page' },
        { kind: 'page-pdfs', url: 'https://tazewellcountyva.org/government/boards-and-commissions/planning-commission/', label: 'Planning Commission page' },
      ],
    },
    {
      name: 'Wise',
      label: 'Wise County',
      agendas: [{ kind: 'civicplus', base: 'https://www.wisecounty.org', label: 'Wise County Agenda Center' }],
    },
    {
      name: 'Norton',
      label: 'City of Norton',
      agendas: [{ kind: 'civicplus', base: 'https://www.cityofnorton.org', label: 'Norton Agenda Center' }],
    },
    // Nearby: the rest of the far southwest, watched through the grid queue and state filings
    // only and shown separately, until the partner confirms which of these they cover.
    ...['Washington', 'Smyth', 'Wythe', 'Bland', 'Grayson'].map((n) => ({
      name: n,
      label: `${n} County`,
      tier: 'nearby' as const,
      agendas: [],
      agendaNote: NEARBY,
    })),
    { name: 'Bristol', label: 'City of Bristol', tier: 'nearby' as const, agendas: [], agendaNote: NEARBY },
  ],
};

/** "Wise County" / "City of Norton" / "Norton City" / "wise" -> "wise" / "norton". */
export function normCounty(s: string | undefined): string {
  return (s ?? '')
    .toLowerCase()
    .replace(/\bcity of\b/g, '')
    .replace(/\b(county|city)\b/g, '')
    .replace(/[^a-z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Map a raw county string to the watch's county name, or null if it isn't watched. */
export function matchCounty(cfg: WatchConfig, raw: string | undefined): string | null {
  const n = normCounty(raw);
  if (!n) return null;
  const hit = cfg.counties.find((c) => normCounty(c.name) === n);
  return hit ? hit.name : null;
}
