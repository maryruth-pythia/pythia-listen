/**
 * Early-warning "watch": upcoming energy projects in a set of counties, read from public
 * filings before they become public fights. Unlike signals (community voices with a stance),
 * a lead is a FACT about a project moving through approvals.
 */

/** Where a project is in the approval path, earliest first. */
export type LeadStage =
  | 'grid' //        asked the grid operator to connect (PJM queue)
  | 'local' //       on a county / town agenda (solar, storage, siting agreement…)
  | 'state' //       notice of intent or application at the state (DEQ permit by rule)
  | 'permitted' //   state permit issued
  | 'built'; //      construction or operation started

export type LeadSource = 'pjm' | 'deq' | 'townhall' | 'agenda';

export interface Lead {
  /** Stable id: source + the source's own id (queue number, permit number, document url…). */
  id: string;
  source: LeadSource;
  stage: LeadStage;
  /** Normalised county / independent-city name (e.g. "Wise", "Norton"). */
  county: string;
  title: string;
  /** One or two plain sentences: what was filed or said, by whom. */
  detail: string;
  /** Technology as the source states it (Solar, Storage, Wind, Hybrid…). */
  tech?: string;
  mw?: number;
  developer?: string;
  /** The source's own status text (e.g. "NOI - Active", "Active", "Permit - Active"). */
  status?: string;
  /** The source's own date for this item (ISO date): submitted, NOI received, meeting date… */
  date?: string;
  url: string;
  /** When Pythia first saw it (ISO). */
  firstSeen: string;
  lastSeen: string;
  /** Present when the source's status changed since we first saw it. */
  changedAt?: string;
  prevStatus?: string;
  /** Seen on the very first run of this watch (so it isn't announced as "new"). */
  baseline?: boolean;
  /** Agenda hits: the matching passage(s) from the document text. */
  excerpt?: string;
  /** The same project as it appears in other sources (see lib/watch/link.ts). */
  related?: RelatedLead[];
}

export interface RelatedLead {
  id: string;
  source: LeadSource;
  title: string;
  url: string;
  /** 'name': the project's name appears in both. 'size': same county and capacity, so likely. */
  how: 'name' | 'size';
}

/** One source checked for one county (or statewide), for the coverage panel. */
export interface SourceCheck {
  key: string; //        e.g. "pjm", "deq", "townhall", "agenda:Wise:https://…"
  source: LeadSource;
  label: string;
  county?: string; //    undefined = covers every county on the board
  ok: boolean;
  checkedAt: string;
  /** Items this source holds for the board's counties (leads, or documents scanned). */
  items: number;
  /** Newest document date seen at this source (agendas), so stale sources show. */
  newest?: string;
  note?: string;
  url?: string;
}

export interface WatchState {
  campaignId: string;
  leads: Lead[];
  checks: SourceCheck[];
  /** Agenda documents already read: url -> date read. Keeps each run small. */
  scanned: Record<string, string>;
  runs: number;
  /** Bumped when the agenda reader changes, so documents are read again with the new reader. */
  readerVersion?: number;
  updatedAt: string;
  lastDigestAt?: string;
  /** Leads someone chose to follow: lead id -> the board created for it. */
  follows?: Record<string, string>;
}
