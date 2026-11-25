/**
 * Representation & "who's missing" (#71).
 *
 * Disaggregates the signal by STAKEHOLDER SEGMENT (funders vs advisors vs CBOs
 * for a viability Watch; relationship-to-area / stakeholder type for a project),
 * surfaces WHO is under-represented or absent, and pulls constructive PATHS
 * FORWARD. Reasoned through the Watch's analysis focus. Uses the diversity
 * sampler so minority segments aren't dropped, and is instructed to refer to
 * people by ROLE/ORGANISATION only — never personal names.
 */
import { complete, MODELS } from '../claude';
import { loadLensedSignals, contextLines } from '../dashboard/signals';
import { getCampaignById } from '../campaigns';
import { relevanceLines } from './relevance';
import { selectForAnalysis } from './sampling';
import { cached, ANALYSIS_TTL_MS } from '../cache';
import type { Signal } from '../types';
import { computeDisaggregation, type Disaggregation } from './disaggregation';

export const REPRESENTATION_MODEL =
  process.env.PYTHIA_REPRESENTATION_MODEL ??
  process.env.PYTHIA_EXTRACT_MODEL ??
  MODELS.conversation;

const MAX_SIGNALS = 90;
const MIN_SIGNALS = 8;

export interface Segment {
  name: string;
  share: number; // 0–100
  stance: string;
  gist: string;
}
export interface MissingVoice {
  who: string;
  why: string;
}
export interface PathForward {
  idea: string;
  detail: string;
}
export interface RepresentationAnalysis {
  campaignId: string;
  total: number;
  analyzed: number;
  segments: Segment[];
  missing: MissingVoice[];
  pathsForward: PathForward[];
  generated: boolean;
  updatedAt: string;
  note?: string;
  /** Deterministic demographic breakdown from collected sessions. */
  disaggregation?: Disaggregation;
}

function digest(signals: Signal[]): string {
  return signals
    .map(
      (s, i) =>
        `#${i + 1} [${s.stance}${s.actor ? `, ${s.actor}` : ''}] ${s.title} :: ${s.summary}`
    )
    .join('\n');
}

export function representationPrompt(signals: Signal[], focus: string | undefined, exclusions?: string, background: string[] = []): string {
  const lens = focus
    ? [`This Watch's ANALYSIS FOCUS is:`, focus, ``]
    : [
        `This is community sentiment about a clean-energy siting project.`,
        ``,
      ];
  return [
    `You map the RANGE of voices in a body of "signals" — not the average, but`,
    `who is represented, who is under-represented, and the constructive ideas.`,
    ``,
    ...lens,
    ...relevanceLines(exclusions),
    ``,
    `PRIVACY — CRITICAL: refer to people ONLY by role or organisation (e.g. "a`,
    `funder", "a community organiser", "an advisor"). NEVER use personal names,`,
    `even if they appear in the signals.`,
    ``,
    ...background,
    `=== SIGNALS ===`,
    digest(signals),
    ``,
    `=== RETURN (JSON object only, no prose, no code fence) ===`,
    `{`,
    `  "segments": [   // 3–6 stakeholder segments that actually appear, sized to`,
    `                  // the focus (e.g. funders, advisors, community orgs)`,
    `    {`,
    `      "name": short role/segment label (NO personal names; a role, place or`,
    `              relationship to the area — never an ethnic or Indigenous identity),`,
    `      "signals": [numbers of the signals above that belong to this segment],`,
    `      "share": integer 0–100, this segment's rough share of the voices,`,
    `      "stance": one of opposition|concern|mixed|support|neutral,`,
    `      "gist": 1 sentence on what this segment thinks and worries about`,
    `    }`,
    `  ],`,
    `  "missing": [   // 2–5 COMMUNITY voices you would expect given the focus`,
    `                 // and the place but barely hear from — the coverage gaps`,
    `    { "who": role/segment under-represented, "why": one clause on why it matters }`,
    `  ],`,
    `  "pathsForward": [   // 3–6 constructive ideas/opportunities the signals`,
    `                      // point to — how to serve the range, without spin`,
    `    { "idea": short label, "detail": 1 sentence, concrete and grounded }`,
    `  ]`,
    `}`,
    ``,
    `WHO COUNTS AS A MISSING VOICE: this is community listening, so a missing`,
    `voice is a member of the COMMUNITY — residents, households, workers, local`,
    `community groups, cultural practitioners — whose views are thin or absent.`,
    `Never list the project side (developers, utilities, industry or trade groups,`,
    `investors, their consultants) or government agencies and officials as missing`,
    `voices; they are parties to the decision, not the community being listened to.`,
    `Only depart from this if the analysis focus explicitly asks for those groups.`,
    ``,
    `BEFORE YOU LIST ANY GROUP AS MISSING, check the signals for it under every name`,
    `it goes by (including names in the place's own language), and for the roles,`,
    `organisations and places through which it speaks. A people may appear under`,
    `several names, or only through those roles and places; that counts as heard.`,
    `List a group only if it is thin under all of them. The operator's notes for`,
    `this board (below) tell you which names and groups belong together here; follow`,
    `them over your own assumptions.`,
    ``,
    ...(focus
      ? [
          `=== OPERATOR'S NOTES FOR THIS BOARD (these override the defaults above, including who counts as missing) ===`,
          focus,
          ``,
        ]
      : []),
    `Rules: base everything ONLY on the signals above; invent nothing. Put each`,
    `signal in at most one segment. Shares across segments should roughly sum to`,
    `100. Keep it honest — no greenwashing, no implying one segment's view is the`,
    `only valid one.`,
  ].join('\n');
}

function parseObject(raw: string): Record<string, unknown> | null {
  let t = raw.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const a = t.indexOf('{');
  const b = t.lastIndexOf('}');
  if (a < 0 || b < 0) return null;
  try {
    return JSON.parse(t.slice(a, b + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 0;
};

export async function computeRepresentation(
  campaignId: string
): Promise<RepresentationAnalysis> {
  return cached(
    `analysis:${campaignId}:representation:v3`, // v3: operator notes decide who counts as heard; v2: identity rule + grounded shares
    ANALYSIS_TTL_MS,
    () => _compute(campaignId),
    (r) => r.generated
  );
}

async function _compute(campaignId: string): Promise<RepresentationAnalysis> {
  const lensed = await loadLensedSignals(campaignId, { includeSurvey: false });
  const all = lensed.views;
  const _c = await getCampaignById(campaignId);
  const focus = _c?.analysisFocus?.trim() || undefined;
  const exclusions = _c?.exclusions?.trim() || undefined;
  const disaggregation = await computeDisaggregation(campaignId);
  const base: RepresentationAnalysis = {
    campaignId,
    total: all.length,
    analyzed: 0,
    segments: [],
    missing: [],
    pathsForward: [],
    generated: false,
    updatedAt: new Date().toISOString(),
    disaggregation,
  };
  if (all.length < MIN_SIGNALS) {
    return { ...base, note: `Not enough signal yet to map representation (have ${all.length}).` };
  }

  const signals = selectForAnalysis(all, MAX_SIGNALS);
  let raw: string;
  try {
    raw = await complete({ values: 'analysis',
      model: REPRESENTATION_MODEL,
      maxTokens: 2600,
      temperature: 0,
      messages: [{ role: 'user', content: representationPrompt(signals, focus, exclusions, contextLines(lensed.context)) }],
    });
  } catch {
    return { ...base, note: 'Representation analysis is temporarily unavailable.' };
  }

  const obj = parseObject(raw);
  if (!obj) return { ...base, note: 'Could not parse the representation analysis.' };

  // Ground each segment in the signals it holds: share = its signals / all assigned,
  // stance = the majority stance of those signals (else "mixed"). Falls back to the
  // model's own estimate only when it didn't list signal numbers.
  const raws = arr(obj.segments).map((s) => s as Record<string, unknown>);
  const members = raws.map((o) => {
    const seen = new Set<number>();
    for (const v of arr(o.signals)) {
      const i = Math.round(Number(String(v).replace('#', ''))) - 1;
      if (Number.isInteger(i) && i >= 0 && i < signals.length) seen.add(i);
    }
    return [...seen];
  });
  const assigned = members.reduce((a, m) => a + m.length, 0);
  const segments: Segment[] = raws
    .map((o, k) => {
      const m = members[k];
      if (!assigned || !m.length) {
        return { name: str(o.name), share: num(o.share), stance: str(o.stance) || 'neutral', gist: str(o.gist) };
      }
      const counts = new Map<string, number>();
      for (const i of m) counts.set(signals[i].stance, (counts.get(signals[i].stance) ?? 0) + 1);
      const [top, topN] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
      return {
        name: str(o.name),
        share: Math.round((100 * m.length) / assigned),
        stance: topN / m.length > 0.5 ? top : 'mixed',
        gist: str(o.gist),
      };
    })
    .filter((s) => s.name)
    .sort((a, b) => b.share - a.share);
  const missing: MissingVoice[] = arr(obj.missing)
    .map((m) => {
      const o = m as Record<string, unknown>;
      return { who: str(o.who), why: str(o.why) };
    })
    .filter((m) => m.who);
  const pathsForward: PathForward[] = arr(obj.pathsForward)
    .map((p) => {
      const o = p as Record<string, unknown>;
      return { idea: str(o.idea), detail: str(o.detail) };
    })
    .filter((p) => p.idea);

  const generated = segments.length > 0 || missing.length > 0 || pathsForward.length > 0;
  return { ...base, analyzed: signals.length, segments, missing, pathsForward, generated };
}
