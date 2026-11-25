/**
 * Channel ingestion — email / WhatsApp / Drive-doc folders → Signals.
 *
 * Reads community messages the operator shares in Google Drive folders (one
 * folder per channel) and turns each into a direct-listening Signal
 * (source='pythia', origin='channel'). Deterministic ids (by Drive file id)
 * make it idempotent: re-running updates in place and new files add.
 *
 * To stay under the serverless time limit with large folders, each run reads
 * at most PYTHIA_CHANNELS_MAX_PER_RUN unprocessed files and reports how many
 * remain; the "Refresh channels" button loops until the folder is drained.
 */

import { randomUUID } from 'node:crypto';
import { complete } from '../claude';
import { getCache } from '../db';
import {
  listSignals,
  upsertSignal,
  appendIngestionRun,
  updateIngestionRun,
} from '../db';
import type { Signal, SignalStance, IngestionRun, SignalSource } from '../types';
import { EXTRACT_MODEL } from './extract';
import { collectChannels, driveConfigured, type RawChannelItem } from './drive';
import { redactPII } from '../redact';
import { FRASIER_CAMPAIGN_ID } from './seed-frasier';
import {
  campaignRoutingMenuAll,
  campaignRoutingMenuFor,
  getAllCampaigns,
  scopeCampaignsToOrg,
  FALLBACK_CAMPAIGN_ID,
} from '../campaigns';
import { bustAnalysisCache } from '../cache';

export const CHANNELS_CAMPAIGN =
  process.env.PYTHIA_CHANNELS_CAMPAIGN ?? FRASIER_CAMPAIGN_ID;

export { driveConfigured };

const VALID_STANCES: SignalStance[] = [
  'opposition',
  'concern',
  'mixed',
  'support',
  'neutral',
];

interface ExtractedChannelSignal {
  fileId: string;
  channel: string;
  /** Campaign this message was routed to, inferred from content cues. */
  campaignId: string;
  title: string;
  summary: string;
  stance: SignalStance;
  themes: string[];
  actor?: string;
  /** Bucket the model classified this item into: community voice ('pythia')
   * vs internal/organisational research ('desk'). Falls back to the channel's
   * configured source when the model does not classify. */
  source?: SignalSource;
}

function extractionPrompt(items: RawChannelItem[], menu: string): string {
  const blocks = items
    .map(
      (it, i) =>
        `#${i + 1} | fileId=${it.fileId} | channel=${it.channel} | bucketHint=${it.source} | file="${it.fileName}"\n${redactPII(it.text)}`
    )
    .join('\n\n---\n\n');
  return [
    `You convert messages received through listening channels (email,`,
    `WhatsApp, shared documents) into structured "signals". Each message`,
    `reflects one voice; capture only what is substantive.`,
    ``,
    `These messages arrive mixed together with NO campaign label. Your job`,
    `includes ROUTING each message to the single campaign it belongs to, based`,
    `only on its content (place names, project names, dockets, or whether it`,
    `is general non-local sentiment).`,
    ``,
    `=== CAMPAIGNS (route each message to exactly one campaignId) ===`,
    menu,
    ``,
    `Routing rules:`,
    `- If a message clearly names a specific project or its county/townships/`,
    `  landmarks, route it to THAT project's campaignId.`,
    `- If it talks about solar generally, state policy (e.g. Senate Bill 52),`,
    `  or unspecified/multiple projects with no specific site, route it to the`,
    `  general (non-project) campaign.`,
    `- When genuinely unsure, prefer the general campaign over guessing a`,
    `  specific project.`,
    ``,
    `For EACH numbered item below, produce one signal object. Return a JSON`,
    `array (and nothing else) of:`,
    `{`,
    `  "fileId": copy the item's fileId exactly;`,
    `  "channel": copy the item's channel;`,
    `  "campaignId": the campaignId this message belongs to (copy one of the`,
    `     campaignId values listed above EXACTLY);`,
    `  "title": a short headline (<= 90 chars), with NO personal names;`,
    `  "summary": 1-2 plain-language sentences capturing what is being said`,
    `     — refer to people by role or organisation, never by name;`,
    `  "stance": one of "opposition","concern","mixed","support","neutral";`,
    `  "themes": array of short snake_case tags (e.g. "farmland",`,
    `     "property_values","tax_revenue","glare","noise","jobs","process");`,
    `  "actor": a role/description if stated (e.g. "a nearby farmer") but`,
    `     NEVER a private individual's real name — omit if unsure.`,
    `  "source": one of "pythia" or "desk". Use "pythia" when the item is a`,
    `     COMMUNITY VOICE — a resident, landowner, local official, community`,
    `     member or local group expressing a view, concern, experience,`,
    `     question or fact about a project or place. Use "desk" when the item`,
    `     is INTERNAL / ORGANISATIONAL material — the organisation's own`,
    `     strategy, fundraising or philanthropy notes, staff or desk research,`,
    `     planning or business-development documents — rather than a community`,
    `     member's voice. If genuinely unsure, copy the item's bucketHint.`,
    `}`,
    ``,
    `Rules:`,
    `- Copy fileId exactly. You need NOT return an object for every item.`,
    `- PRIVACY (hard rule): never write a private individual's name in ANY`,
    `  field — not title, summary, or actor. Refer to people only by role or`,
    `  organisation (e.g. "a funder", "an advisor", "a community organiser").`,
    `- RELEVANCE: SKIP items that carry no substantive signal — pure`,
    `  biographical background, self-introductions, scheduling/logistics,`,
    `  calendar invites/acceptances/declines, automated meeting notifications,`,
    `  greetings, or small talk. Do NOT emit an object for them; do not pad`,
    `  with "neutral" filler. Only emit a signal when the item actually`,
    `  expresses a view, concern, question, or fact relevant to a campaign.`,
    `- Output ONLY the JSON array.`,
    ``,
    `=== ITEMS ===`,
    blocks,
  ].join('\n');
}

function parseArray(raw: string): unknown[] {
  let t = raw.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const start = t.indexOf('[');
  const end = t.lastIndexOf(']');
  if (start === -1 || end === -1 || end < start) return [];
  try {
    const parsed = JSON.parse(t.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function extractChannelSignals(
  items: RawChannelItem[],
  menu: string,
  knownIds: Set<string>
): Promise<ExtractedChannelSignal[]> {
  if (items.length === 0) return [];
  const raw = await complete({
    model: EXTRACT_MODEL,
    maxTokens: 8192,
    temperature: 0,
    messages: [{ role: 'user', content: extractionPrompt(items, menu) }],
  });
  const arr = parseArray(raw);
  const out: ExtractedChannelSignal[] = [];
  for (const o of arr) {
    if (!o || typeof o !== 'object') continue;
    const r = o as Record<string, unknown>;
    const fileId = typeof r.fileId === 'string' ? r.fileId : '';
    const title = typeof r.title === 'string' ? r.title : '';
    const summary = typeof r.summary === 'string' ? r.summary : '';
    if (!fileId || (!title && !summary)) continue;
    const routed =
      typeof r.campaignId === 'string' && knownIds.has(r.campaignId)
        ? r.campaignId
        : FALLBACK_CAMPAIGN_ID;
    out.push({
      fileId,
      channel: typeof r.channel === 'string' ? r.channel : '',
      campaignId: routed,
      title: redactPII(title.slice(0, 120) || summary.slice(0, 80)),
      summary: redactPII(summary),
      stance: VALID_STANCES.includes(r.stance as SignalStance)
        ? (r.stance as SignalStance)
        : 'neutral',
      themes: Array.isArray(r.themes)
        ? r.themes.filter((t): t is string => typeof t === 'string').slice(0, 10)
        : [],
      actor: typeof r.actor === 'string' ? r.actor : undefined,
      source:
        r.source === 'desk' || r.source === 'pythia'
          ? (r.source as SignalSource)
          : undefined,
    });
  }
  return out;
}

// Demo-only date spread. The dummy uploads all share ~one modifiedTime, which
// collapses the time-trend into a single point. When PYTHIA_DEMO_SPREAD_MONTHS
// is set (> 0), spread channel signals deterministically across that many past
// months by hashing the file id — so the demo trend is legible. Real
// deployments leave it unset and keep each file's true modifiedTime.
// Default ON (8 months) because everything ingested right now is demo data
// that shares one upload date. In PRODUCTION set PYTHIA_DEMO_SPREAD_MONTHS=0
// so real message dates (file modifiedTime) are used verbatim.
const DEMO_SPREAD_MONTHS = Number(process.env.PYTHIA_DEMO_SPREAD_MONTHS ?? '8');
function spreadObservedAt(key: string, real: string | undefined): string | undefined {
  if (!(DEMO_SPREAD_MONTHS > 0)) return real;
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const spanDays = Math.max(1, DEMO_SPREAD_MONTHS * 30);
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - (h % spanDays));
  return d.toISOString().slice(0, 10);
}

// Per-channel salience weight. Folders that carry clearer signal about whether
// people actually support an idea (interviews / Discovery transcripts) are
// weighted higher than routine documents. Salience drives BOTH ordering and the
// top-N selection that feeds the AI analysis (coalition/clusters/questions/
// mutual-gains all take highest-salience signals first), so a boosted channel
// both surfaces first AND dominates the reasoning. Default 45 keeps existing
// channels unchanged; override any channel via PYTHIA_CHANNEL_WEIGHTS
// (JSON, e.g. {"discovery":85,"documents":45,"email":40}).
export const DEFAULT_CHANNEL_WEIGHT = 45;
export const CHANNEL_WEIGHTS_KEY = 'cfg:channel-weights';
export const FILE_WEIGHTS_KEY = 'cfg:file-weights';

/** A file's stable key: one Drive file can yield many signals (…_i0, _i1, …).
 * Strip the `ch_` prefix and the per-signal `_i<n>` suffix so all signals from
 * one file share a key — that's what per-file weighting keys on. */
export function baseFileKey(idLike: string | undefined): string {
  if (!idLike) return '';
  let k = idLike;
  if (k.startsWith('ch_')) k = k.slice(3);
  return k.replace(/_i\d+$/, '');
}
const ENV_WEIGHTS: Record<string, number> = (() => {
  const base: Record<string, number> = { discovery: 85, interviews: 85 };
  try {
    const raw = process.env.PYTHIA_CHANNEL_WEIGHTS;
    if (raw) Object.assign(base, JSON.parse(raw) as Record<string, number>);
  } catch {
    /* malformed override — fall back to defaults */
  }
  return base;
})();
// Operator overrides set via the Configure UI, persisted in cache. Empty until
// loadChannelWeights() runs; runChannelIngestion() loads them up front so each
// ingest uses the latest operator-set weights.
let RUNTIME_WEIGHTS: Record<string, number> = {};
// Per-file overrides keyed by Drive fileId (set in the Configure UI). These win
// over the channel weight so specific files (e.g. interview transcripts) keep
// their boost even across re-ingests.
let RUNTIME_FILE_WEIGHTS: Record<string, number> = {};
export async function loadChannelWeights(): Promise<void> {
  try {
    const stored = (await getCache(CHANNEL_WEIGHTS_KEY))?.value as
      | Record<string, number>
      | undefined;
    RUNTIME_WEIGHTS = stored && typeof stored === 'object' ? stored : {};
  } catch {
    RUNTIME_WEIGHTS = {};
  }
  try {
    const files = (await getCache(FILE_WEIGHTS_KEY))?.value as
      | Record<string, number>
      | undefined;
    RUNTIME_FILE_WEIGHTS = files && typeof files === 'object' ? files : {};
  } catch {
    RUNTIME_FILE_WEIGHTS = {};
  }
}

/** Effective weights: defaults+env < operator overrides. For the UI/API. */
export async function getEffectiveChannelWeights(): Promise<
  Record<string, number>
> {
  const stored =
    ((await getCache(CHANNEL_WEIGHTS_KEY))?.value as
      | Record<string, number>
      | undefined) ?? {};
  return { ...ENV_WEIGHTS, ...stored };
}

function channelWeight(channel: string | undefined): number {
  if (!channel) return DEFAULT_CHANNEL_WEIGHT;
  const key = channel.toLowerCase();
  if (key in RUNTIME_WEIGHTS) return RUNTIME_WEIGHTS[key];
  if (key in ENV_WEIGHTS) return ENV_WEIGHTS[key];
  return DEFAULT_CHANNEL_WEIGHT;
}

function toSignal(
  ex: ExtractedChannelSignal,
  raw: RawChannelItem | undefined
): Signal {
  // The campaign is inferred per-message by the content router (ex.campaignId).
  const campaignId = ex.campaignId;
  const source = ex.source ?? raw?.source ?? 'pythia';
  return {
    id: `sig_${source}_${campaignId}_ch_${ex.fileId}`,
    campaignId,
    source,
    sourceType: `channel_${ex.channel || raw?.channel || 'unknown'}`,
    title: ex.title,
    summary: ex.summary,
    stance: ex.stance,
    themes: ex.themes,
    actor: ex.actor,
    citations: [
      {
        url: raw?.webViewLink || `drive://${ex.fileId}`,
        title: raw?.fileName,
        publisher: raw?.channelLabel,
      },
    ],
    salience:
      RUNTIME_FILE_WEIGHTS[baseFileKey(ex.fileId)] ??
      channelWeight(ex.channel || raw?.channel),
    observedAt: spreadObservedAt(ex.fileId, raw?.modifiedTime),
    ingestedAt: new Date().toISOString(),
    dedupeKey: `ch_${ex.fileId}`,
    origin: 'channel',
  };
}

// Run async tasks with a bounded concurrency (speeds up multi-chunk extraction).
async function mapLimit<T, R>(
  arr: T[],
  limit: number,
  fn: (x: T) => Promise<R>
): Promise<R[]> {
  const res: R[] = new Array(arr.length);
  let i = 0;
  async function worker(): Promise<void> {
    while (i < arr.length) {
      const idx = i++;
      res[idx] = await fn(arr[idx]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, arr.length) }, () => worker())
  );
  return res;
}

/**
 * Extract signals from raw channel items (chunked to bound the model call),
 * route each to the campaign the content router inferred, and upsert them.
 * Existing-id checks span ALL campaigns, since a file could previously have
 * been routed anywhere.
 */
export async function ingestChannelItems(
  items: RawChannelItem[],
  forceCampaignId?: string,
  scope?: { accountsMode: boolean; orgId: string | null }
): Promise<{
  created: number;
  updated: number;
  extracted: number;
  byCampaign: Record<string, number>;
}> {
  const byId = new Map(items.map((it) => [it.fileId, it]));
  // Resolve the routing menu + valid campaign ids ONCE (includes user Watches).
  const allCampaigns = await getAllCampaigns();
  const scopedCampaigns = scope
    ? scopeCampaignsToOrg(allCampaigns, scope)
    : allCampaigns;
  const menu = campaignRoutingMenuFor(scopedCampaigns);
  const knownIds = new Set(scopedCampaigns.map((c) => c.id));
  const CHUNK = Number(process.env.PYTHIA_CHANNELS_CHUNK ?? '8');
  const chunks: RawChannelItem[][] = [];
  for (let i = 0; i < items.length; i += CHUNK) chunks.push(items.slice(i, i + CHUNK));
  const parts = await mapLimit(chunks, 4, async (c) => {
    try {
      return await extractChannelSignals(c, menu, knownIds);
    } catch {
      return [] as ExtractedChannelSignal[];
    }
  });
  const extracted: ExtractedChannelSignal[] = parts.flat();
  // Manual uploads pin the operator's chosen campaign (skip content-routing).
  if (forceCampaignId && knownIds.has(forceCampaignId)) {
    for (const ex of extracted) ex.campaignId = forceCampaignId;
  }
  // Existing channel-signal ids across every campaign AND source (idempotent).
  const existingAll = await listSignals();
  const existingIds = new Set(
    existingAll.filter((s) => s.origin === 'channel').map((s) => s.id)
  );
  let created = 0;
  let updated = 0;
  const byCampaign: Record<string, number> = {};
  for (const ex of extracted) {
    // Accounts mode: never write into a campaign this org doesn't own (a
    // content-router fallback to a non-owned campaign is dropped). Inert in
    // password mode (scope undefined / accountsMode false).
    if (scope?.accountsMode && !knownIds.has(ex.campaignId)) continue;
    const sig = toSignal(ex, byId.get(ex.fileId));
    if (existingIds.has(sig.id)) updated++;
    else created++;
    byCampaign[sig.campaignId] = (byCampaign[sig.campaignId] ?? 0) + 1;
    await upsertSignal(sig);
  }
  return { created, updated, extracted: extracted.length, byCampaign };
}

export interface ChannelIngestionResult {
  run: IngestionRun;
  /** Files still waiting to be processed (call again to continue). */
  remaining: number;
}

export async function runChannelIngestion(
  campaignId: string = CHANNELS_CAMPAIGN
): Promise<ChannelIngestionResult> {
  const run: IngestionRun = {
    id: `run_${randomUUID()}`,
    campaignId,
    source: 'pythia',
    startedAt: new Date().toISOString(),
    status: 'running',
    model: EXTRACT_MODEL,
    collected: 0,
    created: 0,
    updated: 0,
  };
  await appendIngestionRun(run);
  await loadChannelWeights();

  let remaining = 0;
  try {
    if (!driveConfigured()) {
      run.status = 'error';
      run.error = 'Drive channels not configured.';
      run.notes =
        'Set PYTHIA_GOOGLE_SA_KEY and at least one channel folder id, and share the folder(s) with the service account. See DRIVE_SETUP.md.';
      run.finishedAt = new Date().toISOString();
      await updateIngestionRun(run);
      return { run, remaining: 0 };
    }

    // Only read a bounded number of not-yet-ingested files per run.
    // Skip files already ingested under ANY campaign (routing is per-message,
    // so a file's campaign isn't known until after it's read once).
    const MAX = Number(process.env.PYTHIA_CHANNELS_MAX_PER_RUN ?? '8');
    const existing = await listSignals();
    const skipFileIds = new Set(
      existing
        .filter((s) => s.origin === 'channel' && s.dedupeKey?.startsWith('ch_'))
        .map((s) => (s.dedupeKey as string).slice(3))
    );

    const { items, totalFiles, skipped } = await collectChannels({
      limit: MAX,
      skipFileIds,
    });
    run.collected = items.length;

    const { created, updated, extracted } = await ingestChannelItems(
      items
    );
    run.created = created;
    run.updated = updated;
    // New/changed signals → invalidate cached dashboard analyses.
    if (created > 0 || updated > 0) await bustAnalysisCache();
    remaining = Math.max(0, totalFiles - skipped - items.length);
    run.status = 'ok';
    run.notes = `${extracted} new signal(s); ${skipped} already ingested; ${remaining} remaining.`;
  } catch (err) {
    run.status = 'error';
    run.error = err instanceof Error ? err.message : String(err);
  }

  run.finishedAt = new Date().toISOString();
  await updateIngestionRun(run);
  return { run, remaining };
}

/** Read channel signals for the campaign (origin='channel' only). */
export async function listChannelSignals(
  campaignId: string = CHANNELS_CAMPAIGN
): Promise<Signal[]> {
  const all = await listSignals(campaignId, 'pythia');
  return all.filter((s) => s.origin === 'channel');
}

/**
 * Diagnostic: read a couple of files and run extraction WITHOUT storing, so we
 * can see whether the extraction step is producing signals and surface any
 * error. Used by the debug endpoint.
 */
export async function probeExtraction(): Promise<{
  read: number;
  extracted: number;
  sampleTitle?: string;
  rawPreview?: string;
  error?: string;
}> {
  try {
    const { items } = await collectChannels({ limit: 3 });
    if (items.length === 0) return { read: 0, extracted: 0 };
    const [menu, allCampaigns] = await Promise.all([
      campaignRoutingMenuAll(),
      getAllCampaigns(),
    ]);
    const knownIds = new Set(allCampaigns.map((c) => c.id));
    const ex = await extractChannelSignals(items, menu, knownIds);
    return {
      read: items.length,
      extracted: ex.length,
      sampleTitle: ex[0]?.title,
      rawPreview: items[0]?.text.slice(0, 120),
    };
  } catch (e) {
    return {
      read: -1,
      extracted: 0,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
