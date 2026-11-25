/**
 * Signal lens — separates SIGNAL from NOISE and groups free-form tags into an
 * evolving list of ISSUES, for every dashboard.
 *
 * 1. ROLE. Every signal is sorted (by an AI pass, once, then remembered) into:
 *      view      — someone's position, concern, hope, demand or condition
 *      context   — background facts (demographics, history, project facts)
 *      process   — about the engagement itself (attendance, outreach logistics,
 *                  response counts, meeting mechanics)
 *      off_topic — not about this project/topic at all
 *    Sentiment, issues and the AI analyses are built from VIEWS; context is
 *    passed to the analyses as background; nothing is deleted.
 *
 * 2. ISSUES. Each view is assigned to one or more issues on a per-dashboard
 *    list that GROWS as data arrives: a signal that fits an existing issue joins
 *    it; one that doesn't creates a new issue (stamped with when it appeared).
 *    Periodically the list is tidied — duplicate issues merged, an over-broad
 *    issue split — and old signals follow along. Every change is logged.
 *
 * Storage: one JSON blob per campaign in the existing analysis_cache table
 * under `lens:<campaignId>` (NOT the `analysis:` prefix, so busting analyses
 * never wipes it). Signals are re-sorted only when new or edited (content hash).
 *
 * Safety: the AI work is time-budgeted; anything not yet sorted is treated as a
 * view with its original tags (the pre-lens behaviour), and any failure falls
 * back to that too — the dashboard never breaks because of the lens.
 *
 * The classifier is deliberately NOT shown a signal's sourceType or actor, so
 * test datasets whose sourceType doubles as an answer key aren't rigged.
 */
import { createHash } from 'node:crypto';
import { after } from 'next/server';
import { complete, MODELS } from '../claude';
import { getCache, setCache } from '../db';
import { getCampaignById } from '../campaigns';
import { bustAnalysisCache } from '../cache';
import type { Signal } from '../types';

export type LensRole = 'view' | 'context' | 'process' | 'off_topic';
export const LENS_ROLES: LensRole[] = ['view', 'context', 'process', 'off_topic'];

export const LENS_MODEL = process.env.PYTHIA_LENS_MODEL?.trim() || MODELS.utility;

const STATE_V = 4; // bump to rebuild every dashboard's lens from scratch (4: no umbrella starter labels + review pass, 2026-11-03)
const BATCH = 30;
const CONCURRENCY = 8;
/** Stop STARTING new sorting batches after this long; the rest waits for the next run. */
const BUDGET_MS = Number(process.env.PYTHIA_LENS_BUDGET_MS ?? 25000);
/** Extra time after that for in-flight batches and the tidy (merge/split) pass. Nothing runs past budget + grace. */
const TIDY_GRACE_MS = 15000;
/** Longest we'll wait for any single AI call (derive / one batch / tidy). */
const CALL_TIMEOUT_MS = 30000;
/** How many past runs to keep for diagnostics. */
const RUNS_KEPT = 8;
/** The tidy pass aims for roughly this many issues per dashboard (a guide, not a cap). */
const TARGET_MIN = 12;
const TARGET_MAX = 40;
/** An issue with at least this many views is checked for being an umbrella that should be split. */
const SPLIT_MIN_VIEWS = 6;
/** An issue counts as "new" if added after the list's first build, within this window. */
export const NEW_ISSUE_DAYS = 60;

export interface LensIssue {
  id: string;
  label: string;
  description: string;
  /** When the issue was added to the list. */
  addedAt: string;
  /** Set when merged into another issue (kept so old references resolve). */
  mergedInto?: string;
  /** The broader family this issue belongs to (e.g. "Environment"), for the grouped chart. */
  family?: string;
}
export interface LensEvent {
  at: string;
  kind: 'created' | 'added' | 'merged' | 'split' | 'resorted' | 'grouped';
  detail: string;
}
interface LensAnn {
  /** Content hash of what was sorted (re-sort when the signal changes). */
  h: string;
  role: LensRole;
  issues: string[];
}
/** One step of a sorting run (for diagnostics). */
export interface LensStep {
  step: string;
  ms: number;
  ok: boolean;
  note?: string;
}
/** A record of one sorting run — saved so failures are visible instead of silent. */
export interface LensRun {
  at: string;
  trigger: string;
  ms: number;
  steps: LensStep[];
  /** Signals still unsorted when the run ended. */
  pendingAfter: number;
  error?: string;
}
interface LensState {
  v: 4;
  createdAt: string;
  updatedAt: string;
  issues: LensIssue[];
  log: LensEvent[];
  ann: Record<string, LensAnn>;
  /** Recent runs, oldest first. */
  runs?: LensRun[];
  /** ISO time until which a run is in progress (so parallel requests don't duplicate work). */
  lockUntil?: string;
  /** Set once the whole-list review (split umbrella issues) has run after sorting finished. */
  reviewedAt?: string;
  /** Failed review attempts (gives up after 3, so a failing review can't retry forever). */
  reviewTries?: number;
  /**
   * The last finished sort, kept while a rebuild (STATE_V bump) runs, so the
   * dashboard keeps showing it instead of falling back to raw tags. Dropped
   * once the rebuild is complete (sorted, reviewed, grouped).
   */
  prev?: { createdAt: string; issues: LensIssue[]; ann: Record<string, LensAnn> };
  /** One-time repairs already applied to this saved state. */
  repairs?: string[];
}

/** A resolved view of the lens for one campaign, ready for aggregation. */
export interface LensResult {
  /** signal id -> role + resolved (active) issue ids */
  bySignal: Map<string, { role: LensRole; issues: string[] }>;
  /** active issues (merged ones resolved away) */
  issues: LensIssue[];
  /** issue id -> label */
  labelOf: Map<string, string>;
  /** issue label -> family name (issues without one yet are absent) */
  familyOf: Map<string, string>;
  /** true when some active issue has no family yet (a run will assign them) */
  needsFamilies: boolean;
  /** true when sorting is done but the one-time whole-list review hasn't run */
  needsReview: boolean;
  /** true while a rebuild runs and the previous sort is being shown meanwhile */
  rebuilding: boolean;
  /** ids of issues added after the first build, within NEW_ISSUE_DAYS */
  newIssueIds: Set<string>;
  log: LensEvent[];
  /** signals not yet sorted (treated as views with their original tags) */
  pending: number;
  /** true when the lens is unusable (no AI yet / failure) — callers fall back */
  empty: boolean;
  /** Recent sorting runs, newest first. */
  runs: LensRun[];
  /** True while a sorting run is in progress somewhere. */
  building: boolean;
  /** Signals sorted by the run that produced this result (only set right after a run). */
  sortedLastRun?: number;
  /** The run that produced this result made progress (sorted signals or reviewed the list). */
  progressed?: boolean;
}

/** Race a promise against a timer, so one slow AI call can't stall a run. */
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  if (ms <= 0) return Promise.reject(new Error(`${label}: no time left`));
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    p,
    new Promise<T>((_, rej) => {
      timer = setTimeout(() => rej(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 300);

/** Parse a model reply as JSON, or throw a readable reason (empty reply / not JSON). */
function parseOrThrow(raw: string, what: string): Record<string, unknown> {
  if (!raw.trim()) throw new Error(`${what}: model returned an empty reply`);
  const obj = parseJson(raw);
  if (!obj) throw new Error(`${what}: reply wasn't JSON (starts: ${raw.trim().slice(0, 100).replace(/\s+/g, ' ')})`);
  return obj;
}

const key = (campaignId: string) => `lens:${campaignId}`;
const nowIso = () => new Date().toISOString();

function hashOf(s: Signal): string {
  return createHash('sha1')
    .update(`${s.title}\u0000${s.summary}\u0000${s.stance}`)
    .digest('hex')
    .slice(0, 12);
}

function slug(label: string): string {
  return (
    label
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯʻ‘’']/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'issue'
  );
}

function newState(): LensState {
  const t = nowIso();
  return { v: STATE_V, createdAt: t, updatedAt: t, issues: [], log: [], ann: {} };
}

async function loadState(campaignId: string): Promise<LensState> {
  try {
    const hit = await getCache(key(campaignId));
    const v = hit?.value as LensState | undefined;
    if (v && v.v === STATE_V && Array.isArray(v.issues) && v.ann) {
      for (const i of v.issues) i.label = cleanLabel(i.label); // repair labels saved before cleanLabel existed
      // One-time repair (2026-11-03): an earlier split bug left some views with
      // NO issue, and families were grouped piecemeal (overlaps, a big "Other").
      // Re-sort just those views against the current list, and regroup families
      // once from scratch. Ids and everything else are kept.
      if (!v.repairs?.includes('split-drop')) {
        for (const [sid, a] of Object.entries(v.ann)) if (a.role === 'view' && a.issues.length === 0) delete v.ann[sid];
        for (const i of v.issues) delete i.family;
        v.repairs = [...(v.repairs ?? []), 'split-drop'];
        v.log.push({ at: nowIso(), kind: 'resorted', detail: 'Repair: re-sorting views that lost their issue in a split, and regrouping families.' });
      }
      return v;
    }
    // Older version: rebuild, but keep the last finished sort on screen meanwhile.
    if (v && Array.isArray(v.issues) && v.ann) {
      const ns = newState();
      ns.prev = v.prev ?? (Object.keys(v.ann).length ? { createdAt: v.createdAt, issues: v.issues, ann: v.ann } : undefined);
      ns.runs = v.runs;
      ns.log = [{ at: ns.createdAt, kind: 'created', detail: 'Re-sorting with updated rules; the previous sort stays on screen until this finishes.' }];
      return ns;
    }
  } catch {
    /* fall through */
  }
  return newState();
}

async function saveState(campaignId: string, st: LensState): Promise<void> {
  st.updatedAt = nowIso();
  if (st.log.length > 200) st.log = st.log.slice(-200);
  if (st.runs && st.runs.length > RUNS_KEPT) st.runs = st.runs.slice(-RUNS_KEPT);
  try {
    await setCache(key(campaignId), st);
  } catch {
    /* non-fatal */
  }
}

/** Follow mergedInto chains to the active issue id. */
function resolveId(st: LensState, id: string): string | null {
  const byId = new Map(st.issues.map((i) => [i.id, i]));
  let cur = byId.get(id);
  let guard = 0;
  while (cur?.mergedInto && guard++ < 10) cur = byId.get(cur.mergedInto);
  return cur && !cur.mergedInto ? cur.id : null;
}

function activeIssues(st: LensState): LensIssue[] {
  return st.issues.filter((i) => !i.mergedInto);
}

function parseJson(raw: string): Record<string, unknown> | null {
  let t = raw.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const a = t.indexOf('{');
  const b = t.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  try {
    return JSON.parse(t.slice(a, b + 1).replace(/,(\s*[}\]])/g, '$1')) as Record<string, unknown>;
  } catch {
    return null;
  }
}


/**
 * First build: propose the dashboard's starting issue list from ALL its signals
 * in one pass, so parallel sorting batches share one vocabulary (instead of
 * each batch inventing its own near-duplicate labels).
 */
async function deriveIssues(
  ctx: { name: string; focus?: string },
  signals: Signal[],
  timeoutMs: number
): Promise<{ label: string; description: string }[]> {
  const lines = [...signals]
    .sort((a, b) => (b.salience ?? 0) - (a.salience ?? 0))
    .slice(0, 320)
    .map((s) => `- [${s.stance}] ${s.title}`)
    .join('\n');
  const prompt = [
    `Below are signals from a community-listening dashboard about: ${ctx.name}.`,
    ctx.focus ? `Dashboard focus: ${ctx.focus}` : '',
    `Some are opinions; some are background facts or notes about the engagement process — ignore those.`,
    ``,
    `Propose the ISSUE LIST for this dashboard: ${TARGET_MIN}–30 topics that together cover what people`,
    `actually raise. Labels are topics, not stances (2–5 words, e.g. "Noise", "Energy costs & bills").`,
    `SPECIFIC BEATS BROAD: name the distinct concerns people actually raise, not umbrella categories.`,
    `For example, don't make one "Environmental impacts" issue — if people raise harm to wildlife,`,
    `water use, air quality, noise or visual impact, each is its own issue. Same for "Community`,
    `concerns", "Technology issues" or "Design standards": break them into the concrete concerns.`,
    `A distinct concern deserves its own issue even if only a few signals raise it.`,
    `But don't create near-duplicates (e.g. not both "Local hiring" and "Local jobs & training").`,
    ``,
    `SIGNALS:`,
    lines,
    ``,
    `Return JSON only: {"issues":[{"label":"...","description":"one short line"}]}`,
  ].filter((l) => l !== '').join('\n');
  // Throws (timeout / API error / bad reply) so the run record says why.
  const raw = await withTimeout(
    complete({ model: LENS_MODEL, maxTokens: 2500, temperature: 0, feature: 'lens', messages: [{ role: 'user', content: prompt }] }),
    timeoutMs,
    'Issue list'
  );
  const obj = parseOrThrow(raw, 'Issue list');
  return (Array.isArray(obj.issues) ? (obj.issues as Record<string, unknown>[]) : [])
    .map((i) => ({ label: String(i.label ?? '').trim(), description: String(i.description ?? '').trim() }))
    .filter((i) => i.label)
    .slice(0, 40);
}

function classifyPrompt(
  ctx: { name: string; focus?: string },
  issues: LensIssue[],
  items: { k: string; s: Signal }[],
  firstBuild: boolean
): string {
  const issueList = issues.length
    ? issues.map((i) => `- ${i.id}: ${i.label} — ${i.description}`).join('\n')
    : '(none yet)';
  const sigs = items
    .map(({ k, s }) => {
      const tags = (s.themes ?? []).slice(0, 6).join(', ');
      return `${k} [${s.stance}] ${s.title} :: ${s.summary}${tags ? ` (tags: ${tags})` : ''}`;
    })
    .join('\n');
  return [
    `You sort "signals" for a community-listening dashboard about: ${ctx.name}.`,
    ctx.focus ? `Dashboard focus: ${ctx.focus}` : '',
    ``,
    `For EACH signal decide its ROLE:`,
    `- "view": a person's or group's position, concern, hope, demand, preference,`,
    `  condition, complaint or idea (including a poll result or vote that expresses`,
    `  what people want). Secondhand reports of what residents said count as views.`,
    `- "context": background facts with no position — population, income, history,`,
    `  geography, project specifications, legal or regulatory facts and outcomes.`,
    `- "process": about the engagement itself — attendance, turnout, response counts,`,
    `  outreach channels and logistics, meeting formats, scheduling, ad spend.`,
    `- "off_topic": unrelated to this dashboard's subject.`,
    ``,
    `For each VIEW, list the ISSUES it is about (1–3), using the EXISTING issue ids below.`,
    `Almost every view should fit an existing issue — reuse them, even if the wording differs.`,
    `Only if a view raises a genuinely DIFFERENT concern that no existing issue covers, give a`,
    `short NEW issue label: a readable title of 2–5 words, a topic, not a stance (e.g. "Construction traffic").`,
    `Write it as plain words, not an id: no hyphens between words, and don't start it with "new".`,
    `Never create a near-duplicate of an existing issue. Non-views get an empty issue list.`,
    ``,
    `EXISTING ISSUES:`,
    issueList,
    ``,
    `SIGNALS:`,
    sigs,
    ``,
    `Return JSON only:`,
    `{"items":[{"k":"s1","role":"view","issues":["existing-id","Construction traffic"]}],`,
    ` "newIssues":[{"label":"Construction traffic","description":"one short line"}]}`,
  ]
    .filter((l) => l !== '')
    .join('\n');
}

interface BatchOut {
  roles: Map<string, { role: LensRole; refs: string[] }>;
  newDefs: Map<string, { label: string; description: string }>;
}

async function classifyBatch(
  ctx: { name: string; focus?: string },
  issues: LensIssue[],
  batch: Signal[],
  firstBuild: boolean,
  timeoutMs: number = CALL_TIMEOUT_MS
): Promise<BatchOut> {
  // Throws (timeout / API error / bad reply); callers record the reason.
  const items = batch.map((s, i) => ({ k: `s${i + 1}`, s }));
  const raw = await withTimeout(
    complete({
      model: LENS_MODEL,
      maxTokens: 3000,
      temperature: 0,
      feature: 'lens',
      messages: [{ role: 'user', content: classifyPrompt(ctx, issues, items, firstBuild) }],
    }),
    timeoutMs,
    'Sorting batch'
  );
  const obj = parseOrThrow(raw, 'Sorting batch');
  if (!Array.isArray(obj.items)) throw new Error('Sorting batch: reply had no "items" list');
  const byK = new Map(items.map((it) => [it.k, it.s]));
  const roles: BatchOut['roles'] = new Map();
  for (const it of obj.items as Record<string, unknown>[]) {
    const s = byK.get(String(it.k ?? ''));
    if (!s) continue;
    const role = LENS_ROLES.includes(it.role as LensRole) ? (it.role as LensRole) : 'view';
    const refs = Array.isArray(it.issues)
      ? (it.issues as unknown[]).map((x) => String(x).trim()).filter(Boolean).slice(0, 3)
      : [];
    roles.set(s.id, { role, refs: role === 'view' ? refs : [] });
  }
  const newDefs: BatchOut['newDefs'] = new Map();
  for (const d of (Array.isArray(obj.newIssues) ? obj.newIssues : []) as Record<string, unknown>[]) {
    const label = String(d.label ?? '').trim();
    if (label) newDefs.set(slug(cleanLabel(label)), { label: cleanLabel(label), description: String(d.description ?? '').trim() });
  }
  return { roles, newDefs };
}

async function withConcurrency<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
      }
    })
  );
  return out;
}

/** Resolve an issue reference (existing id, existing label, or new label) to an id, creating if needed. */
/**
 * Turn whatever the model wrote for an issue name into a readable label:
 * drops a leading "new issue" / "new:", and turns id-style "water-scarcity"
 * into "Water scarcity". Normal labels ("Land-use & site impact") are untouched.
 */
export function cleanLabel(raw: string): string {
  let t = raw.trim().replace(/^new[\s_-]*issues?[\s:_-]+/i, '').replace(/^new[\s]*[:\-–]\s*/i, '');
  // id-style names are hyphenated all the way through (2+ joins); a single compound like "Co-ownership" stays.
  if (!/\s/.test(t) && ((t.match(/[-_]/g) ?? []).length >= 2 || /_/.test(t))) t = t.replace(/[-_]+/g, ' ');
  t = t.replace(/\s+/g, ' ').trim();
  if (t && t === t.toLowerCase()) t = t[0].toUpperCase() + t.slice(1);
  return t.slice(0, 60) || raw.trim();
}

function refToId(
  st: LensState,
  ref: string,
  defs: Map<string, { label: string; description: string }>,
  added: LensIssue[]
): string | null {
  const byId = new Map(st.issues.map((i) => [i.id, i]));
  if (byId.has(ref)) return resolveId(st, ref);
  const sl = slug(cleanLabel(ref));
  const bySlug = st.issues.find((i) => i.id === sl || slug(i.label) === sl || i.id === slug(ref));
  if (bySlug) return resolveId(st, bySlug.id);
  const def = defs.get(sl) ?? defs.get(slug(ref));
  const issue: LensIssue = {
    id: sl,
    label: cleanLabel(def?.label ?? ref),
    description: def?.description ?? '',
    addedAt: nowIso(),
  };
  st.issues.push(issue);
  added.push(issue);
  return issue.id;
}

/** Tidy the list: merge duplicates, split over-broad issues. Mutates st. */
async function consolidate(
  ctx: { name: string; focus?: string },
  st: LensState,
  signalsById: Map<string, Signal>,
  deadline: number,
  newIds: Set<string> = new Set()
): Promise<{ merges: number; splits: number }> {
  const active = activeIssues(st);
  if (active.length < 2 || Date.now() > deadline - 6000) return { merges: 0, splits: 0 };
  const counts = new Map<string, Signal[]>();
  for (const [sid, a] of Object.entries(st.ann)) {
    if (a.role !== 'view') continue;
    const s = signalsById.get(sid);
    if (!s) continue;
    for (const id of a.issues) {
      const r = resolveId(st, id);
      if (!r) continue;
      counts.set(r, [...(counts.get(r) ?? []), s]);
    }
  }
  const isCand = (id: string) => (counts.get(id) ?? []).length >= SPLIT_MIN_VIEWS;
  const list = active
    .map((i) => {
      const sigs = counts.get(i.id) ?? [];
      // Split candidates get more examples, so the model can see whether they bundle distinct concerns.
      const ex = sigs.slice(0, isCand(i.id) ? 8 : 3).map((s) => s.title).join(' | ');
      return `- ${i.id}${newIds.has(i.id) ? ' [NEW]' : ''}: ${i.label} (${sigs.length} views) — ${i.description}${ex ? ` e.g. ${ex}` : ''}`;
    })
    .join('\n');
  const splitCands = active.filter((i) => isCand(i.id));
  const prompt = [
    `You maintain the ISSUE LIST for a community-listening dashboard about: ${ctx.name}.`,
    `Keep it useful and stable: specific concerns, no duplicates. Usually ${TARGET_MIN}–${TARGET_MAX} issues.`,
    `There are ${active.length} now. Propose changes:`,
    `- MERGE only true DUPLICATES: issues that are the same concern in different words (keep the clearer label).`,
    `  Do NOT merge a specific concern into a broader, related one — specific is more useful to the reader.`,
    `  (e.g. "Harm to wildlife" and "Water use" both stay, even though both are environmental.)`,
    `  Issues marked [NEW] were just created: merge one only if it duplicates an existing issue.`,
    `  A distinct concern stays even if only 1–2 views raise it; small is fine, duplicate is not.`,
    splitCands.length
      ? `- SPLIT an UMBRELLA issue into 2–5 narrower issues when its example signals raise DIFFERENT concrete concerns (e.g. a "Health & safety" issue whose signals are about air emissions, fire risk and well water is really three issues). Don't split an issue whose signals all raise the same concern. Candidates: ${splitCands.map((i) => i.id).join(', ')}.`
      : `- Do not split anything this time.`,
    `Do not rename issues that are fine.`,
    ``,
    `ISSUES:`,
    list,
    ``,
    `"into" must be an existing id from the list. Return JSON only: {"merges":[{"from":["id-a","id-b"],"into":"id-keep"}],`,
    ` "splits":[{"id":"broad-id","into":[{"label":"Narrower A","description":"..."},{"label":"Narrower B","description":"..."}]}]}`,
  ].join('\n');
  // Throws on timeout / bad reply; the caller records it (the list is just left as is).
  const obj = parseOrThrow(
    await withTimeout(
      complete({ model: LENS_MODEL, maxTokens: 4000, temperature: 0, feature: 'lens', messages: [{ role: 'user', content: prompt }] }),
      Math.min(CALL_TIMEOUT_MS, deadline - Date.now()),
      'Tidy-up'
    ),
    'Tidy-up'
  );
  const at = nowIso();
  const activeIds = new Set(activeIssues(st).map((i) => i.id));
  // Merges
  let merges = 0;
  for (const m of (Array.isArray(obj.merges) ? obj.merges : []) as Record<string, unknown>[]) {
    const into = String(m.into ?? '');
    if (!activeIds.has(into)) continue;
    const from = (Array.isArray(m.from) ? m.from : []).map(String).filter((f) => f !== into && activeIds.has(f));
    if (!from.length) continue;
    for (const f of from) {
      const iss = st.issues.find((i) => i.id === f);
      if (iss) iss.mergedInto = into;
      activeIds.delete(f);
    }
    const intoLabel = st.issues.find((i) => i.id === into)?.label ?? into;
    merges++;
    st.log.push({ at, kind: 'merged', detail: `${from.map((f) => st.issues.find((i) => i.id === f)?.label ?? f).join(', ')} → ${intoLabel}` });
  }
  // Splits (re-sort only the affected signals into the new narrower issues), in parallel.
  const plans: { id: string; defs: { label: string; description: string }[]; affected: Signal[]; newIssues: LensIssue[] }[] = [];
  for (const sp of (Array.isArray(obj.splits) ? obj.splits : []) as Record<string, unknown>[]) {
    const id = String(sp.id ?? '');
    if (!activeIds.has(id) || !splitCands.some((c) => c.id === id)) continue;
    const parts = (Array.isArray(sp.into) ? sp.into : []) as Record<string, unknown>[];
    const defs = parts
      .map((p) => ({ label: String(p.label ?? '').trim(), description: String(p.description ?? '').trim() }))
      .filter((d) => d.label)
      .slice(0, 5);
    if (defs.length < 2) continue;
    const affected = (counts.get(id) ?? []).slice(0, 60);
    const newIssues: LensIssue[] = defs.map((d) => ({ id: slug(cleanLabel(d.label)), label: cleanLabel(d.label), description: d.description, addedAt: at }));
    plans.push({ id, defs, affected, newIssues });
  }
  let splits = 0;
  const outs = await Promise.all(
    plans.map((pl) =>
      classifyBatch(ctx, pl.newIssues, pl.affected, false, Math.min(CALL_TIMEOUT_MS, deadline - Date.now())).catch(() => null)
    )
  );
  plans.forEach((pl, k) => {
    const out = outs[k];
    if (!out) return;
    for (const ni of pl.newIssues) if (!st.issues.some((i) => i.id === ni.id)) st.issues.push(ni);
    for (const s of pl.affected) {
      const a = st.ann[s.id];
      const r = out.roles.get(s.id);
      if (!a || !r) continue;
      const picked = r.refs.map((ref) => slug(cleanLabel(ref))).filter((x) => pl.newIssues.some((n) => n.id === x));
      // Only move a signal when it was placed in a narrower part; otherwise it
      // keeps the old issue (which now resolves to the first part) — a split
      // must never leave a view with no issue.
      if (picked.length) a.issues = [...a.issues.filter((x) => resolveId(st, x) !== pl.id), ...picked];
    }
    const old = st.issues.find((i) => i.id === pl.id);
    if (old) old.mergedInto = pl.newIssues[0].id; // stragglers resolve to the first part
    st.log.push({ at, kind: 'split', detail: `${old?.label ?? pl.id} → ${pl.defs.map((d) => d.label).join(', ')}` });
    splits++;
  });
  return { merges, splits };
}

/** True when every signal is sorted but the one-time whole-list review hasn't run yet. */
function needsReview(st: LensState, signals: Signal[]): boolean {
  if (st.reviewedAt || (st.reviewTries ?? 0) >= 3 || activeIssues(st).length < 2) return false;
  return signals.length > 0 && signals.every((s) => st.ann[s.id]?.h === hashOf(s));
}

/** True when the list has sorted views and some active issue has no family yet. */
function needsFamilies(st: LensState): boolean {
  const active = activeIssues(st);
  return active.length > 0 && Object.keys(st.ann).length > 0 && active.some((i) => !i.family);
}

/**
 * Group the active issues into ~6–10 broader FAMILIES (e.g. Environment, Costs),
 * so the chart can show families and expand to the specific issues. Existing
 * family names are offered first, so families stay stable as issues are added.
 * Returns the number of families. Throws on timeout / bad reply.
 */
async function assignFamilies(
  ctx: { name: string; focus?: string },
  st: LensState,
  signalsById: Map<string, Signal>,
  timeoutMs: number
): Promise<number> {
  const active = activeIssues(st);
  const counts = new Map<string, number>();
  for (const [sid, a] of Object.entries(st.ann)) {
    if (a.role !== 'view' || !signalsById.has(sid)) continue;
    for (const id of a.issues) {
      const r = resolveId(st, id);
      if (r) counts.set(r, (counts.get(r) ?? 0) + 1);
    }
  }
  const existing = Array.from(new Set(active.map((i) => i.family).filter((f): f is string => !!f)));
  const prompt = [
    `You organise the ISSUE LIST of a community-listening dashboard about: ${ctx.name}.`,
    `Group these issues into 6–10 broader FAMILIES so a reader can scan the families first and open one`,
    `to see its specific issues. Family names are short plain topics (1–3 words, e.g. "Environment",`,
    `"Costs & affordability", "Trust & process"). Every issue goes in exactly ONE family — the one a`,
    `reader would look under first. Don't make a family for a single small issue unless nothing fits.`,
    `Families must NOT overlap: if two would cover the same ground (e.g. "Costs" and "Affordability",`,
    `or "Jobs" and "Local economy"), make them one family. Avoid a catch-all "Other" family; put each`,
    `issue under the closest real family instead. List every issue id below exactly once.`,
    existing.length ? `Keep these existing family names where they still fit: ${existing.join('; ')}.` : '',
    ``,
    `ISSUES (id: label — views):`,
    ...active.map((i) => `- ${i.id}: ${i.label} — ${counts.get(i.id) ?? 0}`),
    ``,
    `Return JSON only: {"families":[{"name":"Family name","issues":["issue-id","issue-id"]}]}`,
  ].filter((l) => l !== '').join('\n');
  const raw = await withTimeout(
    complete({ model: LENS_MODEL, maxTokens: 2000, temperature: 0, feature: 'lens', messages: [{ role: 'user', content: prompt }] }),
    timeoutMs,
    'Families'
  );
  const obj = parseOrThrow(raw, 'Families');
  const fams = (Array.isArray(obj.families) ? obj.families : []) as Record<string, unknown>[];
  if (!fams.length) throw new Error('Families: reply had no families');
  // The model sometimes answers with the label instead of the id — accept either.
  const byRef = new Map<string, LensIssue>();
  for (const i of active) {
    byRef.set(i.id, i);
    byRef.set(slug(i.label), i);
    byRef.set(i.label.toLowerCase(), i);
  }
  const names = new Set<string>();
  for (const f of fams) {
    const name = String(f.name ?? '').trim().slice(0, 40);
    if (!name) continue;
    for (const id of (Array.isArray(f.issues) ? f.issues : []).map(String)) {
      const iss = byRef.get(id) ?? byRef.get(id.toLowerCase()) ?? byRef.get(slug(id)) ?? byRef.get(resolveId(st, id) ?? '');
      if (iss) {
        iss.family = name;
        names.add(name);
      }
    }
  }
  // Anything the model skipped still needs a home, or we'd ask again forever.
  for (const i of active) if (!i.family) { i.family = 'Other'; names.add('Other'); }
  st.log.push({ at: nowIso(), kind: 'grouped', detail: `Issues grouped into ${names.size} families: ${Array.from(names).join(', ')}.` });
  return names.size;
}

const inflight = new Map<string, Promise<LensResult>>();

export type LensMode = 'peek' | 'background' | 'sync';

/**
 * Get the lens for a campaign.
 *   peek       — read what's already sorted; never runs the AI.
 *   background — (default) return what's sorted NOW, and if anything is left to
 *                sort, start a sorting run that continues after the response is
 *                sent (Next's `after`). Pages never wait on the AI.
 *   sync       — run a (time-budgeted) sorting pass, then return. For the check route.
 * Concurrent callers in one process share a run; across servers a short lock
 * in the saved state stops duplicate runs. Every run is recorded (steps, timing,
 * errors) so problems show up on the dashboard instead of failing silently.
 */
export async function getLens(
  campaignId: string,
  signals: Signal[],
  opts?: { build?: boolean; mode?: LensMode; budgetMs?: number; trigger?: string; hop?: number }
): Promise<LensResult> {
  const mode: LensMode = opts?.build === false ? 'peek' : opts?.mode ?? 'background';
  if (mode === 'peek') return peekLens(campaignId, signals);
  const budget = opts?.budgetMs ?? BUDGET_MS;
  const trigger = opts?.trigger ?? mode;
  if (mode === 'sync') return startRun(campaignId, signals, budget, trigger).p;

  const st = await loadState(campaignId);
  const now = resolve(st, signals);
  const needsWork = now.pending > 0 || now.needsFamilies || now.needsReview;
  if (needsWork && !now.building && !inflight.has(campaignId)) {
    // Capture how to reach this app again (while we're still inside the request),
    // so a run that can't finish everything can hand off to the next run itself.
    const handoff = await captureHandoff();
    const hop = opts?.hop ?? 0;
    try {
      after(async () => {
        const { p, created } = startRun(campaignId, signals, budget, trigger);
        const r = await p.catch(() => null);
        // Only the caller that started the run hands off (avoids duplicate chains).
        // Hand off while sorting is making progress — including one last run to
        // group the issues into families if this run had no time left for it.
        if (created && r && (r.pending > 0 || r.needsFamilies || r.needsReview) && r.progressed && hop < MAX_HOPS && handoff) {
          await continueLater(handoff, campaignId, hop + 1);
        }
      });
      return { ...now, building: true };
    } catch {
      // Outside a request (e.g. a script): just run it now.
      return startRun(campaignId, signals, budget, trigger).p;
    }
  }
  return now;
}

function startRun(
  campaignId: string,
  signals: Signal[],
  budgetMs: number,
  trigger: string
): { p: Promise<LensResult>; created: boolean } {
  const existing = inflight.get(campaignId);
  if (existing) return { p: existing, created: false };
  const p = buildLens(campaignId, signals, budgetMs, trigger).finally(() => inflight.delete(campaignId));
  inflight.set(campaignId, p);
  return { p, created: true };
}

/* ── Hand-off: keep sorting until done, without anyone reloading ──────────
 * A run stops after ~40s (server time limits). If signals are still unsorted
 * and the run made progress, it calls /api/lens/continue on this same app,
 * which starts the next run in a fresh request — and so on until everything
 * is sorted. It reuses the caller's own login cookie (server-to-server, to
 * this app only), so no new secret is needed. Capped at MAX_HOPS runs, and a
 * run that sorts nothing stops the chain (the run record shows why). */
const MAX_HOPS = Number(process.env.PYTHIA_LENS_MAX_HOPS ?? 40);
interface Handoff {
  origin: string;
  cookie: string;
}
async function captureHandoff(): Promise<Handoff | null> {
  try {
    const { headers } = await import('next/headers');
    const h = await headers();
    const host = h.get('x-forwarded-host') ?? h.get('host');
    const cookie = h.get('cookie');
    if (!host || !cookie) return null;
    const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
    return { origin: `${proto}://${host}`, cookie };
  } catch {
    return null; // not inside a request
  }
}
async function continueLater(handoff: Handoff, campaignId: string, hop: number): Promise<void> {
  try {
    await fetch(`${handoff.origin}/api/lens/continue?campaign=${encodeURIComponent(campaignId)}&hop=${hop}`, {
      method: 'POST',
      headers: { cookie: handoff.cookie },
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    /* the next page load picks it up instead */
  }
}

async function buildLens(campaignId: string, signals: Signal[], budgetMs: number, trigger: string): Promise<LensResult> {
  const startedAt = Date.now();
  const deadline = startedAt + budgetMs; // stop STARTING sorting batches after this
  const hardStop = deadline + TIDY_GRACE_MS; // nothing waits past this
  const left = () => hardStop - Date.now();
  const st = await loadState(campaignId);

  // Another server is already on it.
  if (st.lockUntil && new Date(st.lockUntil).getTime() > Date.now()) return resolve(st, signals);

  const run: LensRun = { at: nowIso(), trigger, ms: 0, steps: [], pendingAfter: 0 };
  let sortedThisRun = 0;
  let reviewedThisRun = false;
  const step = (name: string, t0: number, ok: boolean, note?: string) =>
    run.steps.push({ step: name, ms: Date.now() - t0, ok, ...(note ? { note } : {}) });
  st.runs = [...(st.runs ?? []), run];
  st.lockUntil = new Date(hardStop + 5000).toISOString();
  await saveState(campaignId, st);

  try {
    const camp = await getCampaignById(campaignId).catch(() => undefined);
    const ctx = { name: camp?.name ?? campaignId, focus: camp?.analysisFocus?.trim() || undefined };

    // Forget signals that no longer exist; find new/changed ones.
    const ids = new Set(signals.map((s) => s.id));
    for (const sid of Object.keys(st.ann)) if (!ids.has(sid)) delete st.ann[sid];
    const pendingSigs = signals.filter((s) => st.ann[s.id]?.h !== hashOf(s));

    // Step 1 (once per dashboard): the shared starting issue list, saved right away.
    if (pendingSigs.length && activeIssues(st).length === 0) {
      const t0 = Date.now();
      try {
        const base = await deriveIssues(ctx, pendingSigs, Math.min(CALL_TIMEOUT_MS, left()));
        if (!base.length) throw new Error('Issue list: model proposed no issues');
        const at = nowIso();
        for (const d of base) {
          const label = cleanLabel(d.label);
          const id = slug(label);
          if (!st.issues.some((i) => i.id === id)) st.issues.push({ id, label, description: d.description, addedAt: at });
        }
        st.createdAt = at;
        st.log.push({ at, kind: 'created', detail: `Starting issue list proposed from ${pendingSigs.length} signals: ${activeIssues(st).length} issues.` });
        step('issue list', t0, true, `${activeIssues(st).length} issues`);
        await saveState(campaignId, st);
      } catch (e) {
        step('issue list', t0, false, errMsg(e));
      }
    }

    // Step 2: sort pending signals against the shared list, in parallel. Each
    // batch is applied and saved as soon as it returns, so progress survives
    // even if the server cuts the request off.
    if (pendingSigs.length && activeIssues(st).length && Date.now() < deadline) {
      const t0 = Date.now();
      const batches: Signal[][] = [];
      for (let i = 0; i < pendingSigs.length; i += BATCH) batches.push(pendingSigs.slice(i, i + BATCH));
      const issueSnapshot = activeIssues(st);
      const added: LensIssue[] = [];
      let sorted = 0, okB = 0, skipped = 0;
      const errs: string[] = [];
      // Group the issues into families ALONGSIDE sorting (it only needs the issue
      // list), so the grouped chart appears on the first pass instead of only
      // after every signal is sorted. Issues created during sorting get a family
      // in step 4 / the next run.
      const famStart = Date.now();
      const famP = issueSnapshot.some((i) => !i.family)
        ? assignFamilies(ctx, st, new Map(signals.map((s) => [s.id, s])), Math.min(CALL_TIMEOUT_MS, left())).then(
            (n) => step('families', famStart, true, `${n} families (alongside sorting)`),
            (e) => step('families', famStart, false, errMsg(e))
          )
        : Promise.resolve();
      await withConcurrency(batches, CONCURRENCY, async (b) => {
        if (Date.now() > deadline) { skipped++; return; }
        try {
          const r = await classifyBatch(ctx, issueSnapshot, b, false, Math.min(CALL_TIMEOUT_MS, left()));
          okB++;
          for (const s of b) {
            const got = r.roles.get(s.id);
            if (!got) continue;
            const issueIds = Array.from(
              new Set(got.refs.map((ref) => refToId(st, ref, r.newDefs, added)).filter((x): x is string => !!x))
            );
            st.ann[s.id] = { h: hashOf(s), role: got.role, issues: issueIds };
            sorted++;
          }
          await saveState(campaignId, st);
        } catch (e) {
          errs.push(errMsg(e));
        }
      });
      const left_ = pendingSigs.length - sorted;
      const note = [
        `${okB}/${batches.length} batches ok, ${sorted} signals sorted`,
        skipped ? `${skipped} batches left for next run` : '',
        errs.length ? `${errs.length} failed — e.g. ${errs[0]}` : '',
      ].filter(Boolean).join('; ');
      step('sort', t0, errs.length === 0, note);
      sortedThisRun = sorted;
      await famP;
      if (sorted) {
        const at = nowIso();
        st.log.push({ at, kind: 'resorted', detail: `Sorted ${sorted} signals${left_ > 0 ? ` (${left_} still to go)` : ''}.` });
        for (const a of added) st.log.push({ at, kind: 'added', detail: `New issue: ${a.label}` });
        await saveState(campaignId, st);
      }

      // Step 3: tidy (merge near-duplicates / stragglers, split over-broad) when the list grew.
      if (sorted && (added.length || activeIssues(st).length > TARGET_MAX) && left() > 8000) {
        const t1 = Date.now();
        const before = activeIssues(st).length;
        try {
          await consolidate(ctx, st, new Map(signals.map((s) => [s.id, s])), hardStop, new Set(added.map((a) => a.id)));
          step('tidy', t1, true, `${before} → ${activeIssues(st).length} issues`);
        } catch (e) {
          step('tidy', t1, false, errMsg(e));
        }
      }
    }

    // Step 3b (once, when everything is sorted): review the WHOLE list — split
    // umbrella issues (e.g. a catch-all "Health & safety") into the distinct
    // concerns their signals actually raise. The per-run tidy only looks when
    // new issues appear, so without this an early umbrella would never be revisited.
    if (needsReview(st, signals) && left() > 15000) {
      const t3 = Date.now();
      const before = activeIssues(st).length;
      try {
        const r = await consolidate(ctx, st, new Map(signals.map((s) => [s.id, s])), hardStop);
        st.reviewedAt = nowIso();
        reviewedThisRun = true;
        step('review', t3, true, `${r.splits} split, ${r.merges} merged · ${before} → ${activeIssues(st).length} issues`);
        await saveState(campaignId, st);
      } catch (e) {
        st.reviewTries = (st.reviewTries ?? 0) + 1;
        step('review', t3, false, errMsg(e));
      }
    }

    // Step 4: group the issues into families for the chart (when any issue lacks one).
    if (needsFamilies(st) && left() > 6000) {
      const t2 = Date.now();
      try {
        const n = await assignFamilies(ctx, st, new Map(signals.map((s) => [s.id, s])), Math.min(CALL_TIMEOUT_MS, left()));
        step('families', t2, true, `${n} families`);
        await saveState(campaignId, st);
      } catch (e) {
        step('families', t2, false, errMsg(e));
      }
    }
  } catch (e) {
    run.error = errMsg(e);
  }

  const out = resolve(st, signals);
  run.ms = Date.now() - startedAt;
  run.pendingAfter = out.pending;
  // Sorting just finished for this dashboard: analyses cached while it was
  // still sorting were built from everything — clear them so they rebuild on
  // views only. Done BEFORE releasing the lock, so nothing reads "sorted" and
  // then picks up a stale analysis.
  // Rebuild finished: drop the previous sort and switch the dashboard over.
  let switched = false;
  if (st.prev && isComplete(st, signals)) {
    st.prev = undefined;
    switched = true;
    st.log.push({ at: nowIso(), kind: 'resorted', detail: 'Re-sort finished; now showing the updated sort.' });
  }
  if ((out.pending === 0 && sortedThisRun > 0) || switched) {
    await bustAnalysisCache(campaignId);
  }
  st.lockUntil = undefined;
  await saveState(campaignId, st);
  const final = switched ? resolve(st, signals) : out;
  return { ...final, building: false, sortedLastRun: sortedThisRun, progressed: sortedThisRun > 0 || reviewedThisRun };
}

/** Done: every signal sorted, the list reviewed, and every issue in a family. */
function isComplete(st: LensState, signals: Signal[]): boolean {
  const allSorted = signals.every((s) => st.ann[s.id]?.h === hashOf(s));
  return allSorted && !needsReview(st, signals) && !needsFamilies(st);
}

function resolve(st: LensState, signals: Signal[]): LensResult {
  // Work still to do is always measured on the CURRENT state…
  let pending = 0;
  for (const s of signals) if (st.ann[s.id]?.h !== hashOf(s)) pending++;
  // …but while a rebuild is running, SHOW the previous finished sort.
  const rebuilding = !!st.prev && !isComplete(st, signals);
  const show: Pick<LensState, 'issues' | 'ann' | 'createdAt'> = rebuilding ? st.prev! : st;
  const showSt = show as LensState;
  const bySignal = new Map<string, { role: LensRole; issues: string[] }>();
  for (const s of signals) {
    const a = show.ann[s.id];
    if (!a || a.h !== hashOf(s)) continue;
    const issues = Array.from(new Set(a.issues.map((i) => resolveId(showSt, i)).filter((x): x is string => !!x)));
    bySignal.set(s.id, { role: a.role, issues });
  }
  const issues = show.issues.filter((i) => !i.mergedInto);
  const created = new Date(show.createdAt).getTime();
  const windowStart = Date.now() - NEW_ISSUE_DAYS * 86400000;
  const newIssueIds = new Set(
    issues
      .filter((i) => {
        const t = new Date(i.addedAt).getTime();
        return t > created + 86400000 && t > windowStart;
      })
      .map((i) => i.id)
  );
  return {
    bySignal,
    issues,
    labelOf: new Map(issues.map((i) => [i.id, i.label])),
    familyOf: new Map(issues.filter((i) => i.family).map((i) => [i.label, i.family as string])),
    needsFamilies: needsFamilies(st),
    needsReview: needsReview(st, signals),
    rebuilding,
    newIssueIds,
    log: [...st.log].reverse(),
    pending,
    empty: bySignal.size === 0,
    runs: [...(st.runs ?? [])].reverse(),
    building: !!st.lockUntil && new Date(st.lockUntil).getTime() > Date.now(),
  };
}

/** Read-only peek (no AI) — e.g. for pages that should never wait on sorting. */
export async function peekLens(campaignId: string, signals: Signal[]): Promise<LensResult> {
  return resolve(await loadState(campaignId), signals);
}
