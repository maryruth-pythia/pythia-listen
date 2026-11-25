/**
 * Cross-source meta-synthesis.
 *
 * Reconciles the two live signal sources — the PUBLIC CIVIC RECORD (civic
 * bucket: officials, intervenors, organized groups, news) and DIRECT COMMUNITY
 * LISTENING (pythia bucket: residents' own self-scored sentiment) — into:
 *   - agreements: where both point the same way
 *   - tensions: where they diverge
 *   - missingVoices: who looks under-represented given the gap between the two
 *
 * This is the layer that turns "two lists of signals" into insight. It reasons
 * only over the real Signal records; every finding cites the signals behind it.
 */

import { complete, MODELS } from '../claude';
import { listSignals } from '../db';
import { loadLensedSignals, contextLines } from '../dashboard/signals';
import { collectNames, redactDeep } from '../redact';
import { getCampaignById } from '../campaigns';
import { relevanceLines } from '../analysis/relevance';
import { selectForAnalysis } from '../analysis/sampling';
import { cached, ANALYSIS_TTL_MS } from '../cache';
import type { Signal } from '../types';

export const META_MODEL = process.env.PYTHIA_META_MODEL ?? MODELS.conversation;

export interface MetaSource {
  label: string;
  url?: string;
}
export interface MetaFinding {
  title: string;
  detail: string;
  sources: MetaSource[];
}
export interface MetaResult {
  summary: string;
  agreements: MetaFinding[];
  tensions: MetaFinding[];
  missingVoices: MetaFinding[];
  civicCount: number;
  pythiaCount: number;
  generatedAt: string;
  note?: string;
  /** 'public-record' when the board has no direct listening by design: the three columns
   * become what the record agrees on / where it is contested / who is missing from it. */
  mode?: 'public-record';
}

function describe(signals: Signal[]): string {
  return signals
    .map((s) => {
      const url = s.citations[0]?.url ? ` [${s.citations[0].url}]` : '';
      const themes = s.themes.length ? ` {${s.themes.join(', ')}}` : '';
      return `- (${s.stance}) ${s.title} — ${s.summary}${themes}${url}`;
    })
    .join('\n');
}

/**
 * Per-issue comparison of the two sources, from the signal lens: how many views
 * each source has on each issue and how they lean. Gives the model concrete,
 * countable agreements and gaps instead of leaving it to infer them from a sample.
 */
/** The community a signal speaks for: the last "— part" of its actor, when the dataset records one. */
function communityOf(s: Signal): string | undefined {
  const a = s.actor ?? '';
  if (!a.includes('—')) return undefined;
  const c = a.split('—').pop()!.trim().replace(/\s*\(.*\)$/, '');
  return c || undefined;
}

/** "Kahuku 15/22 (68%), Oʻahu 4, …" — who a set of signals actually comes from. */
function spread(list: Signal[], max = 6): string {
  const c = new Map<string, number>();
  for (const s of list) {
    const k = communityOf(s);
    if (k) c.set(k, (c.get(k) ?? 0) + 1);
  }
  if (!c.size) return '';
  const sorted = Array.from(c.entries()).sort((a, b) => b[1] - a[1]);
  const [top, n] = sorted[0];
  return [
    `${top} ${n}/${list.length} (${Math.round((n / list.length) * 100)}%)`,
    ...sorted.slice(1, max).map(([k, v]) => `${k} ${v}`),
  ].join(', ');
}

function issueComparison(views: Signal[], familyOf?: Map<string, string>): string[] {
  const rows = new Map<string, { civic: Signal[]; direct: Signal[] }>();
  for (const s of views) {
    if (s.source !== 'civic' && s.source !== 'pythia') continue;
    for (const t of s.themes) {
      const r = rows.get(t) ?? { civic: [], direct: [] };
      (s.source === 'civic' ? r.civic : r.direct).push(s);
      rows.set(t, r);
    }
  }
  if (!rows.size) return [];
  const lean = (list: Signal[]) => {
    if (!list.length) return 'none';
    const c: Record<string, number> = {};
    for (const s of list) c[s.stance] = (c[s.stance] ?? 0) + 1;
    const mix = Object.entries(c).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${n} ${k}`).join(', ');
    return `${list.length} (${mix})`;
  };
  // Breadth: how many communities raise each issue, and how concentrated it is.
  const breadth = (list: Signal[]) => {
    const c = new Map<string, number>();
    for (const s of list) {
      const k = communityOf(s);
      if (k) c.set(k, (c.get(k) ?? 0) + 1);
    }
    if (!c.size) return '';
    const [top, n] = Array.from(c.entries()).sort((a, b) => b[1] - a[1])[0];
    return ` · raised in ${c.size} ${c.size === 1 ? 'community' : 'communities'} (most from ${top}: ${Math.round((n / list.length) * 100)}%)`;
  };
  const civicAll = views.filter((s) => s.source === 'civic');
  const directAll = views.filter((s) => s.source === 'pythia');
  const civicSpread = spread(civicAll);
  const directSpread = spread(directAll);
  return [
    ...(civicSpread || directSpread
      ? [
          `=== WHO EACH SOURCE HEARS FROM (views by community) ===`,
          `- civic record: ${civicSpread || 'no community recorded'}`,
          `- direct listening: ${directSpread || 'no community recorded'}`,
          ``,
        ]
      : []),
    `=== ISSUE COMPARISON (views per issue in each source, how they lean, and how widely the issue is raised) ===`,
    ...Array.from(rows.entries())
      .sort((a, b) => b[1].civic.length + b[1].direct.length - (a[1].civic.length + a[1].direct.length))
      .slice(0, 30)
      .map(([label, r]) => `- ${label}${familyOf?.get(label) ? ` [${familyOf.get(label)}]` : ''}: civic record ${lean(r.civic)} · direct listening ${lean(r.direct)}${breadth([...r.civic, ...r.direct])}`),
    ``,
  ];
}

const WEIGHTING = [
  `WEIGHTING: direct community listening is the PRIMARY read of what this`,
  `community thinks. The civic record is SECONDARY — it over-represents people`,
  `and groups who testify, file, organise and get quoted. Ground your findings`,
  `mainly in direct listening; use the civic record to compare against it and`,
  `to show where the public record diverges from what residents said. Never let`,
  `the civic record alone establish what "the community" thinks. If direct`,
  `listening is thin (only a handful of views), say so and don't over-generalise.`,
];

function metaPrompt(civic: Signal[], pythia: Signal[], focus?: string, exclusions?: string, background: string[] = [], issueBlock: string[] = []): string {
  const opening = focus
    ? [
        `You reconcile two independent reads of signal for a Watch whose`,
        `ANALYSIS FOCUS is:`,
        focus,
        ``,
        `Read both sources through THAT lens. Treat as "important" what the`,
        `focus calls for, and frame the summary, agreements, tensions, and`,
        `missing voices around it — not generic community sentiment.`,
      ]
    : [
        `You reconcile two independent reads of community sentiment on a`,
        `clean-energy siting project.`,
      ];
  return [
    ...opening,
    ``,
    ...WEIGHTING,
    ``,
    ...relevanceLines(exclusions),
    ``,
    `SOURCE 1 (PRIMARY) — DIRECT COMMUNITY LISTENING (residents' own words and`,
    `self-scored sentiment from interviews, workshops, focus groups, surveys):`,
    pythia.length ? describe(pythia) : '(none)',
    ``,
    `SOURCE 2 (SECONDARY, for comparison) — PUBLIC CIVIC RECORD (officials,`,
    `intervenors, organized groups, news, filings):`,
    civic.length ? describe(civic) : '(none)',
    ``,
    ...background,
    ...issueBlock,
    `Produce a JSON object (and nothing else):`,
    `{`,
    `  "summary": "2-3 sentence headline: lead with what direct listening shows, then how the civic record compares",`,
    `  "agreements": [ { "title", "detail", "sources": [{"label","url"?}] } ],`,
    `  "tensions":   [ { "title", "detail", "sources": [{"label","url"?}] } ],`,
    `  "missingVoices": [ { "title", "detail", "sources": [{"label","url"?}] } ]`,
    `}`,
    ``,
    `Guidance:`,
    `- agreements: where the civic record and direct listening point the same`,
    `  way (e.g. both show concern about farmland).`,
    `- tensions: where they DIVERGE — e.g. the civic record is dominated by`,
    `  organized opposition while direct listening is mixed or quieter, or a`,
    `  theme loud in one source is absent in the other. Be specific about the`,
    `  direction of the gap.`,
    `- missingVoices: who is likely UNDER-represented in THIS dashboard's`,
    `  record. Judge it from these signals, the background facts and the place`,
    `  itself — e.g. a community or group the background describes but whose`,
    `  views barely appear, or a community that dominates one source and is`,
    `  absent from the other. Do NOT fall back on a generic checklist of groups;`,
    `  name a group only when the signals or background give a concrete reason,`,
    `  and say what that reason is.`,
    `  WHO COUNTS AS A MISSING VOICE: this is community listening, so a missing`,
    `  voice is a member of the COMMUNITY — residents, households, workers, local`,
    `  community groups, cultural practitioners — whose views are thin or absent.`,
    `  Never list the project side (developers, utilities, industry or trade groups,`,
    `  investors, their consultants) or government agencies and officials as missing`,
    `  voices; they are parties to the decision, not the community being listened to.`,
    `  Only depart from this if the analysis focus explicitly asks for those groups.`,
    `- BREADTH: an agreement must hold across several communities. If most of an`,
    `  issue's views come from one community, name that community ("In <place>, …")`,
    `  and do not present it as shared or region-wide consensus — it may`,
    `  instead be a tension (one place's concern) or a sign that the record is`,
    `  concentrated. If one community dominates a source, say so.`,
    `- Every finding must cite the signals behind it in "sources" (use the`,
    `  signal's title as label; include its url when present). Do not invent`,
    `  sources or claims not grounded in the signals above.`,
    issueBlock.length
      ? `- Use the ISSUE COMPARISON: an agreement is an issue where both sources lean the same way; a tension is an issue where they lean differently, or one that is prominent in one source and thin or absent in the other. Name the specific issue.`
      : '',
    `- Be SPECIFIC: name the concrete concern, place, technology or group`,
    `  (e.g. "Loss of prime farmland to solar arrays", not "Concerns about`,
    `  project impacts"). Each finding should be distinct from the others.`,
    `- Return 4 or 5 items in EACH of agreements, tensions and missingVoices.`,
    `  Each must be distinct and grounded in the signals above. Go below 4 in a`,
    `  category only if the signals truly contain fewer distinct supported`,
    `  findings there — never pad with vague, repetitive or invented ones.`,
    `  Output ONLY the JSON object.`,
  ].filter((l) => l !== '').join('\n');
}

/**
 * Public-record boards have no direct listening to compare against, so the cross-source
 * prompt above (which treats the civic record as secondary) doesn't fit. This reads the
 * record on its own terms: what it shows, where it's contested, whose voices it lacks.
 */
function publicRecordPrompt(civic: Signal[], focus?: string, exclusions?: string, background: string[] = []): string {
  return [
    `You read the PUBLIC RECORD on a clean-energy project or place: filings,`,
    `agency letters, hearing testimony, written public comments, organisation`,
    `letters and local news. There is NO direct community listening on this board,`,
    `so describe what the RECORD shows, never what "the community" thinks. People`,
    `who testify, file and get quoted are not a sample of residents.`,
    ...(focus ? [``, `ANALYSIS FOCUS:`, focus] : []),
    ``,
    ...relevanceLines(exclusions),
    ``,
    `THE RECORD:`,
    civic.length ? describe(civic) : '(none)',
    ``,
    ...background,
    `Produce a JSON object (and nothing else):`,
    `{`,
    `  "summary": "2-3 sentences: what the record shows overall, and how thin or broad it is",`,
    `  "agreements": [ { "title", "detail", "sources": [{"label","url"?}] } ],`,
    `  "tensions":   [ { "title", "detail", "sources": [{"label","url"?}] } ],`,
    `  "missingVoices": [ { "title", "detail", "sources": [{"label","url"?}] } ]`,
    `}`,
    ``,
    `Guidance:`,
    `- agreements: points that DIFFERENT KINDS of voices in the record raise in the`,
    `  same way (e.g. residents, a local official and an agency all flag drainage).`,
    `  A point raised by only one filer or one side is not an agreement.`,
    `- tensions: where the record is CONTESTED: speakers disagree, figures differ`,
    `  (treat each speaker's figure as their claim and name who made it), or a`,
    `  commitment is promised but not yet binding. Say who is on each side, by role.`,
    `- missingVoices: community members who are absent or thin in the record`,
    `  (e.g. nearest neighbours, a named community, renters, workers), with the`,
    `  concrete reason from the signals or background. Never list developers,`,
    `  industry, agencies or officials as missing voices.`,
    `- Separate project-side voices (developer, landowner, consultants) from`,
    `  community voices, and note where speakers come from when the record says.`,
    `- If a finding rests on a single filing or speaker, say so in the detail`,
    `  ("one commenter", "one agency letter"). Do not generalise from one source.`,
    `- Every finding must cite the signals behind it in "sources" (signal title as`,
    `  label; include its url when present). Invent nothing.`,
    `- Be SPECIFIC: name the concrete concern, place, figure or group.`,
    `- Return 3 to 5 items in EACH category; fewer only if the record truly`,
    `  supports fewer. Never pad. Output ONLY the JSON object.`,
  ].filter((l) => l !== '').join('\n');
}

/** Extract the first balanced {...} object, ignoring braces inside strings. */
function extractBalanced(s: string): string | null {
  let depth = 0;
  let inStr = false;
  let esc = false;
  let startIdx = -1;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === '{') {
      if (depth === 0) startIdx = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && startIdx !== -1) return s.slice(startIdx, i + 1);
    }
  }
  return null; // never closed → truncated
}

/** Best-effort repair of a truncated JSON object: balance quotes/brackets. */
function repairTruncated(s: string): string {
  let t = s.replace(/[\s,:]+$/, '');
  let curly = 0;
  let square = 0;
  let inStr = false;
  let esc = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === '{') curly++;
    else if (ch === '}') curly--;
    else if (ch === '[') square++;
    else if (ch === ']') square--;
  }
  if (inStr) t += '"';
  t = t.replace(/,\s*$/, '');
  while (square-- > 0) t += ']';
  while (curly-- > 0) t += '}';
  return t;
}

function tryParse(s: string): Record<string, unknown> | null {
  const cleaned = s.replace(/,(\s*[}\]])/g, '$1'); // drop trailing commas
  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function parseObject(raw: string): Record<string, unknown> | null {
  let t = raw.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const start = t.indexOf('{');
  if (start === -1) return null;
  t = t.slice(start);

  // 1) Fully-formed object.
  const balanced = extractBalanced(t);
  if (balanced) {
    const parsed = tryParse(balanced);
    if (parsed) return parsed;
  }
  // 2) Truncated (hit the token ceiling mid-object): repair and retry.
  const repaired = repairTruncated(t);
  return tryParse(repaired);
}

function coerceFindings(v: unknown): MetaFinding[] {
  if (!Array.isArray(v)) return [];
  const out: MetaFinding[] = [];
  for (const item of v) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const title = typeof o.title === 'string' ? o.title : '';
    const detail = typeof o.detail === 'string' ? o.detail : '';
    if (!title && !detail) continue;
    const sources: MetaSource[] = Array.isArray(o.sources)
      ? o.sources
          .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
          .map((s) => ({
            label: typeof s.label === 'string' ? s.label : '',
            url: typeof s.url === 'string' ? s.url : undefined,
          }))
          .filter((s) => s.label || s.url)
      : [];
    out.push({ title, detail, sources });
  }
  return out;
}

/** Cached, campaign-aware meta-synthesis — loads with the dashboard. */
export async function computeMetaSynthesis(campaignId: string): Promise<MetaResult> {
  const pr = (await getCampaignById(campaignId).catch(() => undefined))?.publicRecordOnly;
  return cached(
    // v2: identity rule, temperature 0; pr1: public-record mode. Old cached versions are ignored.
    `analysis:${campaignId}:meta:${pr ? 'pr1' : 'v2'}`,
    ANALYSIS_TTL_MS,
    () => runMetaSynthesis(campaignId),
    (r) => r.agreements.length + r.tensions.length + r.missingVoices.length > 0
  );
}

export async function runMetaSynthesis(
  campaignId: string,
  _pythiaProjectId?: string
): Promise<MetaResult> {
  const [civicRaw, pythiaRaw, lensed] = await Promise.all([
    listSignals(campaignId, 'civic'),
    listSignals(campaignId, 'pythia'),
    // Read the already-sorted lens; never run the sorting from this side request
    // (the dashboard page does that) — doing both blew the 60s limit.
    loadLensedSignals(campaignId, { includeSurvey: false, build: false }),
  ]);
  // Signal lens: reconcile VIEWS only (context / process / off-topic set aside;
  // unsorted signals count as views). Context goes in as background.
  const isView = (s: Signal) => {
    const a = lensed.lens?.bySignal.get(s.id);
    return !a || a.role === 'view';
  };
  // With a sorted lens, use its VIEWS (themes = the dashboard's issue labels,
  // not raw tags); otherwise fall back to the raw lists.
  const lensOn = !!lensed.lens && !lensed.lens.empty;
  const civic = lensOn ? lensed.views.filter((s) => s.source === 'civic') : civicRaw.filter(isView);
  const pythia = lensOn ? lensed.views.filter((s) => s.source === 'pythia') : pythiaRaw.filter(isView);
  const issueBlock = lensOn ? issueComparison(lensed.views, lensed.lens?.familyOf) : [];
  const _c = await getCampaignById(campaignId);
  const publicRecord = !!_c?.publicRecordOnly;
  const focus = _c?.analysisFocus?.trim() || undefined;
  const exclusions = _c?.exclusions?.trim() || undefined;
  const _names = collectNames([...civic, ...pythia]);

  const base: MetaResult = {
    summary: '',
    agreements: [],
    tensions: [],
    missingVoices: [],
    civicCount: civic.length,
    pythiaCount: pythia.length,
    generatedAt: new Date().toISOString(),
    ...(publicRecord ? { mode: 'public-record' as const } : {}),
  };

  if (civic.length === 0 && pythia.length === 0) {
    return {
      ...base,
      summary: 'No signals yet to synthesize.',
      note: 'Ingest civic signals and/or collect conversations first.',
    };
  }

  // Bound the prompt. The model only needs the most salient signals to find
  // cross-source patterns; dumping the entire corpus made the call slow enough
  // to hit the serverless time limit (stuck "Synthesizing…") or degrade to an
  // empty result. Cap each source at its top-N by salience — the counts above
  // still reflect the true totals.
  //
  // Weighting: direct listening gets most of the room. The civic record gets at
  // most CIVIC_SHARE of the slots (default 25%), unless direct listening is too
  // thin to fill its share — then civic may use the spare room, up to CAP.
  // (Before 2026-11-04 each source got its own 45 slots, so a small civic
  // record went in whole and outweighed its share of the board.)
  const CAP = 45;
  const TOTAL = 75;
  const CIVIC_SHARE = Math.min(0.5, Math.max(0.1, Number(process.env.PYTHIA_META_CIVIC_SHARE ?? 0.25)));
  const directSlots = Math.min(pythia.length, TOTAL - Math.round(TOTAL * CIVIC_SHARE));
  // Public-record boards: the record is the whole board, so it gets the full budget.
  const civicSlots = publicRecord
    ? Math.min(civic.length, TOTAL)
    : Math.min(civic.length, CAP, Math.max(Math.round(TOTAL * CIVIC_SHARE), TOTAL - directSlots));
  const civicForPrompt = selectForAnalysis(civic, civicSlots);
  const pythiaForPrompt = selectForAnalysis(pythia, directSlots);

  async function attempt() {
    const raw = await complete({ values: 'analysis',
      model: META_MODEL,
      maxTokens: 6000, // room for 4–5 cited findings in each of the three categories
      temperature: 0,
      messages: [{
        role: 'user',
        content: publicRecord
          ? publicRecordPrompt(civicForPrompt, focus, exclusions, contextLines(lensed.context))
          : metaPrompt(civicForPrompt, pythiaForPrompt, focus, exclusions, contextLines(lensed.context), issueBlock),
      }],
    });
    const parsed = parseObject(raw);
    if (!parsed) return null;
    return {
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
      agreements: coerceFindings(parsed.agreements),
      tensions: coerceFindings(parsed.tensions),
      missingVoices: coerceFindings(parsed.missingVoices),
    };
  }

  let r = await attempt();
  const count = r ? r.agreements.length + r.tensions.length + r.missingVoices.length : 0;
  if (count === 0) {
    const retry = await attempt();
    if (retry) r = retry;
  }

  if (!r) {
    return { ...base, summary: 'Synthesis could not be parsed. Try again.', note: 'parse_error' };
  }
  const finalCount = r.agreements.length + r.tensions.length + r.missingVoices.length;
  if (finalCount === 0) {
    return redactDeep({
      ...base,
      summary: r.summary,
      note: `Reconciled ${civic.length} civic + ${pythia.length} direct signals, but no clear cross-source pattern surfaced this run. Re-run to try again.`,
    }, _names);
  }
  return redactDeep({ ...base, ...r }, _names);
}
