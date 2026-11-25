/**
 * Campaign registry.
 *
 * Pythia can listen for more than one campaign at once. Channel messages
 * (email / WhatsApp / shared docs) all arrive in the SAME Drive folders with
 * no campaign tag on the file — the ingestion router reads each message and
 * decides which campaign it belongs to purely from content cues (place names,
 * project names, dockets, or whether it's general/non-local sentiment).
 *
 * To add a campaign: append an entry here with a rich `routing` description.
 * That text is the only thing the classifier sees, so make the distinguishing
 * cues explicit (counties, townships, landmarks, developer, docket, MW), and
 * for a general/non-project campaign say plainly that it is NOT tied to any
 * single site.
 */

import { FRASIER_CAMPAIGN_ID } from './ingest/seed-frasier';
import { DGATEWAY_CAMPAIGN_ID } from './ingest/seed-datacenter';
import { getCache, setCache } from './db';
import type { PublicComment } from './types';
import { SWVA_WATCH, type WatchConfig } from './watch/config';

export type CampaignKind = 'site' | 'general';

/** Seed/demo campaigns belong to this org id; real org-created campaigns carry their own. */
export const DEMO_ORG_ID = 'pythia';

export interface Campaign {
  id: string;
  /** Owning org (accounts mode). Absent on seed/demo campaigns → DEMO_ORG_ID. */
  orgId?: string;
  /** Short display name. */
  name: string;
  kind: CampaignKind;
  /** Badge label shown in the dashboard header. */
  badge: string;
  /** One-line sub-header (facts) shown under the campaign name. */
  meta?: string;
  /** Short human blurb for selectors/menus. */
  blurb: string;
  /** Rich cue description the content-router uses to classify messages. */
  routing: string;
  /** Operator-set lens: what this Watch is for and what matters. Injected into
   * the analyses (meta-synthesis, questions, clusters) so they reason through
   * the right frame. Empty → analyses use the default community-sentiment lens. */
  analysisFocus?: string;
  /** For a Site Project: the locality it sits in (local-only coalition + civic scouting). */
  jurisdiction?: string;
  /** Regulatory docket, if any. */
  docket?: string;
  /** Operator free-text exclusions injected into analyses (things to ignore). */
  exclusions?: string;
  /** Sampled background / "civic-record" comments (with source) — illustrative
   * sentiment kept SEPARATE from real survey/signal data. Used to ground the
   * agents (especially a brand-new project with no data yet) and to contrast
   * against actual survey results. */
  publicComments?: PublicComment[];
  /** Optional richer brief for grounding the conversational agents. */
  briefMarkdown?: string;
  /** Extra views on a general board: what people raised by issue, how it differs by
   * island (Hawaiʻi map), and Vibrant Hawaiʻi's indicator ratings. Rule-based, no AI —
   * see lib/dashboard/community-views.ts. */
  communityViews?: Array<'issues' | 'islands' | 'vibrant'>;
  /** Languages this project serves (drives survey voice + wording). */
  languages?: string[];
  /** Built from the public record only (no direct listening, surveys or internal docs).
   * The dashboard drops the cross-source comparisons and project-vs-project view, and the
   * meta-synthesis reads the record on its own terms. */
  publicRecordOnly?: boolean;
  /** Early-warning watch: counties to check daily for grid requests, state permit filings and
   * energy items on local agendas (lib/watch). Shown as the pipeline section on the dashboard. */
  watch?: WatchConfig;
  /** Set on boards made with "Follow this project": the watch item (lead id) it came from. */
  followedFrom?: string;
  /** Also visible to the org with this slug (e.g. a client's org), on top of normal ownership.
   * Lets a built-in board be shared with one client org without moving it out of the demo org. */
  orgSlug?: string;
}

export const CAMPAIGNS: Campaign[] = [
  {
    id: FRASIER_CAMPAIGN_ID, // 'frasier-solar-knox-oh'
    name: 'Frasier Solar',
    kind: 'site',
    badge: 'Site',
    meta: '120 MW · Miller & Clinton Townships · OPSB 23-0796-EL-BGN',
    blurb: 'Frasier Solar — Knox County, OH (specific project)',
    routing: [
      'A specific 120 MW utility-scale solar project called "Frasier Solar",',
      'developed by Open Road Renewables in KNOX COUNTY, OHIO. Roughly 840',
      'acres of arrays within a ~1,395-acre area in MILLER and CLINTON',
      'TOWNSHIPS, near the city of MOUNT VERNON, Ohio. Ohio Power Siting Board',
      'docket 23-0796-EL-BGN. Route a message here if it references Frasier',
      'Solar, Knox County, Mount Vernon, Miller or Clinton Township, Open Road',
      'Renewables, or clearly concerns THIS project specifically.',
    ].join(' '),
  },
  {
    id: 'cedar-ridge-solar-madison-oh',
    name: 'Cedar Ridge Solar',
    kind: 'site',
    badge: 'Site',
    meta: '180 MW · Somerford & Deer Creek Townships · OPSB 24-0512-EL-BGN',
    blurb: 'Cedar Ridge Solar — Madison County, OH (specific project)',
    routing: [
      'A specific 180 MW utility-scale solar project called "Cedar Ridge',
      'Solar", developed by Prairie State Power in MADISON COUNTY, OHIO, near',
      'the city of LONDON, OHIO. Arrays span SOMERFORD and DEER CREEK',
      'TOWNSHIPS, along Cedar Ridge Road and near Deer Creek. Ohio Power Siting',
      'Board docket 24-0512-EL-BGN. Route a message here if it references Cedar',
      'Ridge Solar, Madison County, London (Ohio), Somerford or Deer Creek',
      'Township, Prairie State Power, or clearly concerns THIS project',
      'specifically. Do NOT confuse it with Frasier Solar in Knox County.',
    ].join(' '),
  },
  {
    id: DGATEWAY_CAMPAIGN_ID, // 'pw-digital-gateway-va'
    name: 'PW Digital Gateway',
    kind: 'site',
    badge: 'Site',
    meta: '~2,100 acres · ~23M sq ft · next to Manassas Battlefield · CPA/REZ',
    blurb: 'Prince William Digital Gateway — data centers, Prince William County, VA',
    routing: [
      'A specific, contested DATA-CENTER project called the "Prince William',
      'Digital Gateway" (sometimes "PW Digital Gateway" or just "the Digital',
      'Gateway") in PRINCE WILLIAM COUNTY, VIRGINIA. A ~2,100-acre, ~23 million',
      'sq ft data-center corridor along PAGELAND LANE, immediately adjacent to',
      'MANASSAS NATIONAL BATTLEFIELD PARK, near the towns of GAINESVILLE,',
      'HAYMARKET, MANASSAS and BRISTOW. Developed by QTS (GW Acquisition) and',
      'COMPASS Datacenters (H&H Capital); reviewed as a Comprehensive Plan',
      'Amendment + rezoning (CPA/REZ) by the Prince William Board of',
      'Supervisors. Concerns are data-center-specific: electricity/energy',
      'demand, transmission lines, water use, noise, battlefield and historic',
      'preservation, viewshed, and property values. Route a message here if it',
      'references the Digital Gateway, Prince William County, Manassas',
      'Battlefield, Pageland Lane, Gainesville/Haymarket/Bristow, QTS, Compass,',
      'or data centers in this area. This is NOT a solar project — do not',
      'confuse it with the Ohio solar campaigns.',
    ].join(' '),
  },
  {
    id: 'kahuku-wind-oahu-hi',
    name: 'Kahuku Wind',
    kind: 'site',
    badge: 'Site',
    meta: '24 MW \u00b7 8 turbines (568 ft) \u00b7 Kahuku, O\u02bbahu (North Shore) \u00b7 BLNR HCP / ITL',
    blurb: 'N\u0101 Pua Makani wind \u2014 Kahuku, O\u02bbahu, HI (specific project)',
    routing: [
      'A specific, contested 24 MW utility-scale WIND project called',
      '"N\u0101 Pua Makani" (the Kahuku wind farm), developed by AES /',
      'Na Pua Makani, LLC in KAHUKU on the NORTH SHORE of O\u02bbAHU, HAWAI\u02bbI',
      '(City & County of Honolulu). Eight turbines about 568 feet tall, near',
      'Kahuku town, Kahuku Elementary School, L\u0101\u02bbie, and the existing',
      'Kahuku Wind farm. Sells power to Hawaiian Electric (HECO) under a 20-year',
      'PPA. Community opposition led by K\u016b Kia\u02bbi Kahuku and Keep the',
      'North Shore Country; concerns are wind-specific: turbine noise, shadow',
      'flicker, health, safety/blade failure, proximity to homes and school,',
      'the endangered \u02bb\u014dpe\u02bbape\u02bba (Hawaiian hoary bat), cultural /',
      'aloha \u02bb\u0101ina values, and the 2031/2040 decommissioning timeline.',
      'Route a message here if it references N\u0101 Pua Makani, Kahuku, the',
      'North Shore of O\u02bbahu, AES wind turbines, K\u016b Kia\u02bbi Kahuku, or',
      'clearly concerns THIS project specifically. This is a Hawai\u02bbi WIND',
      'project \u2014 do not confuse it with the mainland solar or data-center campaigns.',
    ].join(' '),
    analysisFocus: [
      'Community sentiment among Kahuku and North Shore O\u02bbahu residents about',
      'living with the N\u0101 Pua Makani wind turbines: noise, shadow flicker,',
      'health and sleep, safety, proximity to homes and Kahuku Elementary,',
      'wildlife (\u02bb\u014dpe\u02bbape\u02bba bat), and cultural / aloha \u02bb\u0101ina values \u2014',
      'weighed against clean-energy benefits and the 2031/2040 removal timeline.',
    ].join(' '),
    jurisdiction: 'Kahuku, O\u02bbahu (City & County of Honolulu), Hawai\u02bbi',
    docket: 'BLNR Habitat Conservation Plan / Incidental Take License (N\u0101 Pua Makani)',
    exclusions:
      'Ignore mainland or general wind-energy policy debates that are not tied to Kahuku or O\u02bbahu.',
  },
  {
    id: 'solar-sentiment-oh',
    name: 'Ohio Solar Sentiment',
    kind: 'general',
    badge: 'General',
    meta: 'Statewide sentiment · not tied to one project',
    blurb: 'Ohio Solar Sentiment — general (not a single project)',
    routing: [
      'GENERAL public sentiment about utility-scale solar energy in Ohio that',
      'is NOT tied to any one specific project or site. Includes opinions on',
      'solar farms broadly, Ohio Senate Bill 52 (which lets county',
      'commissioners restrict or block large solar and wind projects), farmland',
      'conversion vs. energy policy, rural land-use debates, and support or',
      'opposition to solar in general. Route a message here when it does NOT',
      'name a specific project or its towns/county and instead speaks about',
      'solar policy, solar in general, or multiple/unspecified projects.',
    ].join(' '),
  },
  {
    id: 'pythia-viability',
    name: 'Pythia Viability',
    kind: 'general',
    badge: 'Internal',
    meta: 'Defensibility \u00b7 fundability \u00b7 product viability',
    blurb:
      'Pythia \u2014 internal research on the product\u2019s viability, defensibility, and fundability',
    routing: [
      'INTERNAL Pythia research and notes about the VIABILITY, DEFENSIBILITY,',
      'and FUNDABILITY of the Pythia product/company ITSELF \u2014 market fit,',
      'competitors, moat, business model, pricing, funding, capstone research,',
      'go-to-market. This is NOT about any external clean-energy siting project.',
      'Route here only material about Pythia as a product or company.',
    ].join(' '),
  },
  // ---- Public-record-only demo boards (client boards are left out of this public snapshot). Seeded via
  // /api/manage/seed-public-record from lib/ingest/seed-public-record.ts.
  // No direct listening yet: every signal comes from the public record.
  {
    id: 'hi-community-resilience',
    name: 'Hawaiʻi Community Priorities: Energy & Resilience',
    kind: 'general',
    badge: 'Planning',
    meta: 'State Energy Office 2022 (Oʻahu, Maui, Molokaʻi, Hawaiʻi Island) · Vibrant Hawaiʻi 2026 surveys (Puna 340, Kaʻū 141)',
    blurb: 'Hawaiʻi community priorities for energy, land and resilience: HSEO 2022 engagement + Vibrant Hawaiʻi 2026 Puna and Kaʻū surveys',
    communityViews: ['issues', 'islands', 'vibrant'],
    routing: [
      'GENERAL community priorities in Hawaiʻi for energy, land, food, water and climate resilience, NOT a',
      'single project: what residents value, fear and want for their community, power outages and',
      'preparedness, energy costs, community benefits expectations and how people want to be engaged.',
      'Includes the Hawaiʻi State Energy Office 2022 community engagement and the Vibrant Hawaiʻi /',
      'KōCreate 2026 surveys in PUNA and KAʻŪ on Hawaiʻi Island. Route here only Hawaiʻi community-',
      'priority material that is not about one specific named project.',
    ].join(' '),
    analysisFocus: [
      'This is GENERAL community planning for Hawaiʻi, broader than energy: residents’ priorities for',
      'ʻāina, food, water, culture, affordability, housing, safety and resilience, with energy as one',
      'part of that. Stance means how residents feel about the issue raised: support for a direction,',
      'concern about a problem, or opposition to a development. Two bodies of evidence: the State',
      'Energy Office’s 2022 engagement (interviews, roundtables, workshops on four islands, plus approved',
      'public records) and Vibrant Hawaiʻi’s 2026 surveys of 340 Puna and 141 Kaʻū residents. Always say',
      'which year and which community a finding comes from; do not merge 2022 and 2026 as one moment.',
      'Where both cover the same place (Puna / Pāhoa, Hawaiʻi Island), say what persisted or changed.',
      'Compare communities (the community is the last part of each signal’s actor). Survey percentages',
      'are the report’s own figures; workshop polls are tiny samples, so report counts, not percentages.',
      'Missing voices are community members (residents in both surveys worried that kūpuna, Native',
      'Hawaiian families, low-income families, youth and rural people without internet would be missed), never',
      'industry or agencies. Native Hawaiian residents hold many different views: never describe them',
      '(or any ethnic group) as one segment with one stance; attribute views to specific roles and places.',
    ].join(' '),
    jurisdiction: 'State of Hawaiʻi',
    exclusions:
      'Do not treat outreach logistics, participant demographics or the report teams’ own recommendations as community sentiment. Do not present 2022 findings as current.',
  },
  // ---- Hawaiʻi community energy planning (DEMO, general planning — not one project).
  // Seeded from two HSEO June 2022 reports via /api/manage/seed-hawaii-energy.
  // One statewide board (all signals, incl. Kauaʻi survey data) + one per island.
  ...([
    {
      id: 'hi-energy-statewide',
      name: 'Hawaiʻi Energy Planning — Statewide',
      island: 'statewide',
      meta: 'Community energy planning · HSEO 2022 engagement · all islands',
      places: 'Oʻahu, Maui, Molokaʻi, Hawaiʻi Island and Kauaʻi',
    },
    {
      id: 'hi-energy-oahu',
      name: 'Hawaiʻi Energy Planning — Oʻahu',
      island: 'Oʻahu',
      meta: 'Waiʻanae · ʻEwa / Kapolei / Kalaeloa · Central Oʻahu · Kahuku',
      places: 'Waiʻanae, Mākua, ʻEwa Beach, Kapolei, Kalaeloa, Honouliuli, Waipiʻo, Kunia, Mililani, Kahuku, Kawailoa and the North Shore',
    },
    {
      id: 'hi-energy-maui',
      name: 'Hawaiʻi Energy Planning — Maui',
      island: 'Maui',
      meta: 'Lāhainā · Kīhei / South Maui',
      places: 'Lāhainā, West Maui, Kīhei, Wailea and South Maui',
    },
    {
      id: 'hi-energy-molokai',
      name: 'Hawaiʻi Energy Planning — Molokaʻi',
      island: 'Molokaʻi',
      meta: 'Island-wide · Kaunakakai · Hoʻolehua · Maunaloa',
      places: 'Kaunakakai, Pūkoʻo, Kualapuʻu, Maunaloa, Hoʻolehua, Kalamaʻula and Lāʻau Point',
    },
    {
      id: 'hi-energy-hawaii-island',
      name: 'Hawaiʻi Energy Planning — Hawaiʻi Island',
      island: 'Hawaiʻi Island',
      meta: 'Pāhoa / Puna · Waikoloa',
      places: 'Pāhoa, Puna, Lower Puna, Wao Kele o Puna and Waikoloa',
    },
  ].map((h): Campaign => ({
    id: h.id,
    name: h.name,
    kind: 'general',
    badge: 'Planning',
    meta: h.meta,
    blurb: `${h.name} — general community energy planning (demo dataset from HSEO 2022 reports)`,
    routing: [
      `GENERAL community energy planning for ${h.island === 'statewide' ? 'the State of Hawaiʻi' : h.island},`,
      'NOT a single project: residents’ priorities, concerns, hopes and conditions for clean',
      'energy in their own community, how they want to be engaged, and the community benefits',
      `they expect. Places: ${h.places}. Route here only Hawaiʻi energy-planning material that`,
      'is not about one specific named project.',
    ].join(' '),
    analysisFocus: [
      'This is GENERAL community energy planning, not a single project.',
      'Stance means attitude toward clean-energy development in the speaker’s own community.',
      'Compare communities (the community is the last part of each signal’s actor) and say where',
      'they differ. Workshop polls are very small samples — report counts, not percentages, and',
      'never generalize them to the whole island. Community-profile signals (census, history) are',
      'context, not sentiment. All data comes from the Hawaiʻi State Energy Office’s 2022',
      'engagement (Siting Perspectives and Community Engagement reports).',
    ].join(' '),
    jurisdiction: h.island === 'statewide' ? 'State of Hawaiʻi' : `${h.island}, Hawaiʻi`,
    communityViews: h.island === 'statewide' ? ['issues', 'islands'] : undefined,
    exclusions:
      'Do not treat community-profile facts (population, income, history) as expressions of sentiment.',
  }))),
];

/** The campaign the dashboard opens on by default. */
export const DEFAULT_CAMPAIGN_ID = FRASIER_CAMPAIGN_ID;

/** Fallback bucket when the router can't match a specific project. */
export const FALLBACK_CAMPAIGN_ID = 'solar-sentiment-oh';

export function getCampaign(id: string): Campaign | undefined {
  return CAMPAIGNS.find((c) => c.id === id);
}

export function isKnownCampaign(id: string): boolean {
  return CAMPAIGNS.some((c) => c.id === id);
}

/** Menu block for the classifier prompt: id + routing description per campaign. */
export function campaignRoutingMenu(): string {
  return CAMPAIGNS.map(
    (c, i) => `${i + 1}. campaignId="${c.id}" (${c.name}) — ${c.routing}`
  ).join('\n\n');
}


// ---- Persisted (user-created) Watches ----
// Stored in the cache table (present in both DB backends) so a new Watch needs
// no schema change. Seeds above are always present; stored ones merge on top.

const WATCH_STORE_KEY = 'wcfg:list';

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return base || `watch-${Date.now().toString(36)}`;
}

export async function listStoredCampaigns(): Promise<Campaign[]> {
  const hit = await getCache(WATCH_STORE_KEY);
  return hit && Array.isArray(hit.value) ? (hit.value as Campaign[]) : [];
}

/**
 * Drop the stored edits on a built-in board, so it goes back to its definition in this file.
 * Returns false when there was nothing stored, or the id isn't a built-in board (a board
 * someone created is never deleted this way).
 */
export async function resetBuiltInCampaign(id: string): Promise<boolean> {
  if (!CAMPAIGNS.some((c) => c.id === id)) return false;
  const stored = await listStoredCampaigns();
  const kept = stored.filter((c) => c.id !== id);
  if (kept.length === stored.length) return false;
  await setCache(WATCH_STORE_KEY, kept);
  return true;
}

/** Seeds + user-created, de-duplicated by id (seeds win). */
export async function getAllCampaigns(): Promise<Campaign[]> {
  const stored = await listStoredCampaigns();
  const storedById = new Map(stored.map((c) => [c.id, c]));
  // A stored entry with the same id as a seed OVERRIDES that seed — this lets an
  // operator edit a built-in Watch (its routing keywords, etc.) via Configure.
  // Brand-new stored Watches (no matching seed id) are appended after.
  const merged = CAMPAIGNS.map((seed) => {
    const override = storedById.get(seed.id);
    // Editing a built-in board's settings must never change who can see it:
    // keep the seed's own ownership (none = shared demo board), not whoever
    // saved the edit. Otherwise a board configured while signed in to one org
    // vanishes from everyone else's project list.
    return override ? { ...seed, ...override, orgId: seed.orgId } : seed;
  });
  const seedIds = new Set(CAMPAIGNS.map((c) => c.id));
  const extras = stored.filter((c) => !seedIds.has(c.id));
  return [...merged, ...extras];
}

export async function getCampaignById(id: string): Promise<Campaign | undefined> {
  return (await getAllCampaigns()).find((c) => c.id === id);
}

export async function isKnownCampaignId(id: string): Promise<boolean> {
  return (await getAllCampaigns()).some((c) => c.id === id);
}

export function campaignRoutingMenuFor(list: Campaign[]): string {
  return list
    .map((c, i) => `${i + 1}. campaignId="${c.id}" (${c.name}) — ${c.routing}`)
    .join('\n\n');
}

export async function campaignRoutingMenuAll(): Promise<string> {
  return campaignRoutingMenuFor(await getAllCampaigns());
}

/**
 * Filter a campaign list to the acting org. Pure (takes the scope context as an
 * argument) so this module needs no auth import.
 *   - password mode: no filtering (single implicit tenant) — live pilot unchanged.
 *   - accounts mode, no org: deny (empty).
 *   - accounts mode, org set: campaigns whose orgId matches; seed/demo campaigns
 *     (no orgId) belong to DEMO_ORG_ID.
 *   - a campaign with an orgSlug (a board shared with one client org) is visible ONLY
 *     when the acting org's slug matches: never to other orgs or demo viewers.
 */
export function scopeCampaignsToOrg(
  list: Campaign[],
  ctx: { accountsMode: boolean; orgId: string | null; orgSlug?: string | null; demoViewer?: boolean }
): Campaign[] {
  if (!ctx.accountsMode) return list;
  const sharedWithMe = (c: Campaign) => !!c.orgSlug && !!ctx.orgSlug && c.orgSlug === ctx.orgSlug;
  // A board shared with a client org (orgSlug) belongs to that org ONLY: not to the Pythia
  // team org, not to demo viewers. Pythia staff see it by switching their active org to the
  // client's (they must be members of it). 2026-11-25, after a tester reached a client board.
  const client = list.filter((c) => !!c.orgSlug);
  const rest = list.filter((c) => !c.orgSlug);
  const mine = client.filter(sharedWithMe);
  // Admin/demo viewer: sees all seed/demo projects plus its own org's.
  if (ctx.demoViewer) {
    return [...rest.filter((c) => c.orgId == null || c.orgId === DEMO_ORG_ID || c.orgId === ctx.orgId), ...mine];
  }
  if (!ctx.orgId) return [];
  return [...rest.filter((c) => (c.orgId ?? DEMO_ORG_ID) === ctx.orgId), ...mine];
}

export interface WatchInput {
  id?: string;
  orgId?: string;
  name: string;
  kind: CampaignKind;
  badge?: string;
  meta?: string;
  blurb?: string;
  routing: string;
  analysisFocus?: string;
  jurisdiction?: string;
  docket?: string;
  exclusions?: string;
  publicComments?: PublicComment[];
  briefMarkdown?: string;
  languages?: string[];
  publicRecordOnly?: boolean;
  followedFrom?: string;
  orgSlug?: string;
}

/** Create or update a user Watch. Seed ids are protected (cannot be overwritten). */
export async function saveCampaign(input: WatchInput): Promise<Campaign> {
  const stored = await listStoredCampaigns();
  const id =
    input.id && input.id.trim() ? input.id.trim() : slugify(input.name);
  // Overriding a seed id is allowed: the override is stored and merged on top of
  // the seed by getAllCampaigns (so built-in Watches stay editable).
  const c: Campaign = {
    id,
    orgId: input.orgId,
    name: input.name.trim(),
    kind: input.kind,
    badge: input.badge?.trim() || (input.kind === 'general' ? 'General' : 'Site'),
    meta: input.meta?.trim() || undefined,
    blurb: input.blurb?.trim() || input.name.trim(),
    routing: input.routing.trim(),
    analysisFocus: input.analysisFocus?.trim() || undefined,
    jurisdiction: input.jurisdiction?.trim() || undefined,
    docket: input.docket?.trim() || undefined,
    exclusions: input.exclusions?.trim() || undefined,
    publicComments:
      input.publicComments && input.publicComments.length ? input.publicComments : undefined,
    briefMarkdown: input.briefMarkdown?.trim() || undefined,
    languages: input.languages && input.languages.length ? input.languages : undefined,
    publicRecordOnly: input.publicRecordOnly || undefined,
    followedFrom: input.followedFrom || undefined,
    orgSlug: input.orgSlug || undefined,
  };
  const i = stored.findIndex((s) => s.id === id);
  if (i >= 0) stored[i] = c;
  else stored.push(c);
  await setCache(WATCH_STORE_KEY, stored);
  return c;
}
