/**
 * Opinion clusters + consensus finder (Pol.is-style, adapted).
 *
 * Pol.is groups people by how they vote on statements, then surfaces the
 * statements that win agreement ACROSS the groups. We don't have per-person
 * votes — we have signals (community voices already distilled from channels
 * and civic records). So we run one analysis pass over a campaign's signals to:
 *   - identify 3–5 distinct opinion "camps" (who believes what, roughly how big),
 *   - surface CONSENSUS: what a super-majority agrees on across the camps
 *     (the shared ground a developer and the community can build on), and
 *   - name the sharpest DIVIDES (where camps genuinely split).
 *
 * Framing is deliberately a bridge, not a battle: consensus first, divides
 * stated neutrally as "still unresolved," never "how to win."
 */

import { complete, MODELS } from '../claude';
import { loadCampaignSignals } from '../dashboard/signals';
import { collectNames, redactDeep } from '../redact';
import { getCampaignById } from '../campaigns';
import { relevanceLines } from './relevance';
import { selectForAnalysis } from './sampling';
import { cached, ANALYSIS_TTL_MS } from '../cache';
import type { Signal, SignalStance } from '../types';

export const CLUSTER_MODEL =
  process.env.PYTHIA_CLUSTER_MODEL ??
  process.env.PYTHIA_EXTRACT_MODEL ??
  MODELS.conversation;

/** How many top-salience signals to feed the analysis (bounds the prompt). */
const MAX_SIGNALS = 70;
/** Minimum signals before a clustering is meaningful. */
const MIN_SIGNALS = 6;

export interface OpinionCamp {
  id: string;
  label: string;
  /** Approximate share of community voices in this camp (0–100). */
  share: number;
  stanceLean: SignalStance;
  /** 1–2 sentences: what this camp believes and worries about. */
  gist: string;
  topThemes: string[];
  /** Representative signal titles (verbatim from the data). */
  exampleTitles: string[];
}

export interface ConsensusPoint {
  statement: string;
  agreement: 'broad' | 'strong' | 'emerging';
  /** Why this is shared ground / what it enables. */
  note?: string;
}

export interface DividePoint {
  statement: string;
  /** Camp labels that split on this. */
  camps: string[];
}

export interface ClusterAnalysis {
  campaignId: string;
  total: number;
  analyzed: number;
  camps: OpinionCamp[];
  consensus: ConsensusPoint[];
  divides: DividePoint[];
  updatedAt: string;
  /** False when there isn't enough signal to cluster yet. */
  generated: boolean;
  note?: string;
}

const VALID_STANCES: SignalStance[] = [
  'opposition',
  'concern',
  'mixed',
  'support',
  'neutral',
];

function digestOf(signals: Signal[]): string {
  return signals
    .map((s, i) => {
      const themes = s.themes.length ? ` [themes: ${s.themes.join(', ')}]` : '';
      const who = s.actor ? ` (${s.actor})` : '';
      return `${i + 1}. <${s.stance}>${who} ${s.title} — ${s.summary}${themes}`;
    })
    .join('\n');
}

function stanceMix(signals: Signal[]): string {
  const c: Record<string, number> = {};
  for (const s of signals) c[s.stance] = (c[s.stance] ?? 0) + 1;
  return VALID_STANCES.map((st) => `${st}: ${c[st] ?? 0}`).join(', ');
}

function prompt(signals: Signal[], focus?: string, exclusions?: string): string {
  const lead = focus
    ? [
        `You are analyzing "signals" for a Watch whose ANALYSIS FOCUS is:`,
        focus,
        `Each signal is one distilled voice, tagged with a stance`,
        `(opposition / concern / mixed / support / neutral), an optional role,`,
        `and themes. Do a Pol.is-style analysis THROUGH THAT FOCUS: group the`,
        `distinct positions that appear, and lead with where they agree.`,
      ]
    : [
        `You are analyzing community "signals" about a clean-energy siting project.`,
        `Each signal is one distilled community voice, tagged with a stance`,
        `(opposition / concern / mixed / support / neutral), an optional role, and`,
        `themes. Your job is a Pol.is-style opinion analysis whose PURPOSE is to`,
        `help the community and the developer find shared ground — a bridge, not a`,
        `battle. Lead with what people agree on.`,
      ];
  return [
    ...lead,
    ``,
    ...relevanceLines(exclusions),
    ``,
    `Signal count: ${signals.length}. Stance mix: ${stanceMix(signals)}.`,
    ``,
    `=== SIGNALS ===`,
    digestOf(signals),
    ``,
    `=== RETURN (JSON object only, no prose, no code fence) ===`,
    `{`,
    `  "camps": [   // 3 to 5 distinct opinion camps that actually appear`,
    `    {`,
    `      "label": short human name for the camp (<= 4 words),`,
    `      "share": integer 0-100, your best estimate of this camp's share of`,
    `        voices (shares across camps should sum to about 100),`,
    `      "stanceLean": one of opposition|concern|mixed|support|neutral,`,
    `      "gist": 1-2 sentences on what this camp believes and worries about,`,
    `      "topThemes": up to 4 theme tags drawn from the signals,`,
    `      "exampleTitles": 1-3 signal titles copied VERBATIM from the list`,
    `        that typify this camp`,
    `    }`,
    `  ],`,
    `  "consensus": [   // 2 to 5 points a SUPER-MAJORITY agrees on across camps`,
    `    {`,
    `      "statement": a specific thing most people agree on, phrased as`,
    `        common ground (e.g. "Written commitments on road repair matter"),`,
    `      "agreement": "broad" | "strong" | "emerging",`,
    `      "note": one clause on why this is shared ground / what it unlocks`,
    `    }`,
    `  ],`,
    `  "divides": [   // 1 to 4 genuinely unresolved disagreements`,
    `    {`,
    `      "statement": the crux of the disagreement, stated neutrally,`,
    `      "camps": labels of the camps that split on it`,
    `    }`,
    `  ]`,
    `}`,
    ``,
    `Rules: base everything ONLY on the signals above; do not invent concerns.`,
    `Consensus must be real cross-camp agreement, not one camp's wish. Keep it`,
    `honest — if a divide is deep, say so plainly but without taking sides.`,
    `Output ONLY the JSON object.`,
  ].join('\n');
}

function parseObject(raw: string): Record<string, unknown> | null {
  let t = raw.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return null;
  try {
    const parsed = JSON.parse(t.slice(start, end + 1));
    return parsed && typeof parsed === 'object'
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}
function strArr(v: unknown, max: number): string[] {
  return Array.isArray(v)
    ? v.filter((x): x is string => typeof x === 'string').slice(0, max)
    : [];
}

function coerceCamps(v: unknown): OpinionCamp[] {
  if (!Array.isArray(v)) return [];
  const out: OpinionCamp[] = [];
  v.forEach((raw, i) => {
    if (!raw || typeof raw !== 'object') return;
    const r = raw as Record<string, unknown>;
    const label = str(r.label).slice(0, 60);
    if (!label) return;
    const share =
      typeof r.share === 'number'
        ? Math.max(0, Math.min(100, Math.round(r.share)))
        : 0;
    out.push({
      id: `camp_${i + 1}`,
      label,
      share,
      stanceLean: VALID_STANCES.includes(r.stanceLean as SignalStance)
        ? (r.stanceLean as SignalStance)
        : 'mixed',
      gist: str(r.gist),
      topThemes: strArr(r.topThemes, 4),
      exampleTitles: strArr(r.exampleTitles, 3),
    });
  });
  return out.slice(0, 5);
}

function coerceConsensus(v: unknown): ConsensusPoint[] {
  if (!Array.isArray(v)) return [];
  const out: ConsensusPoint[] = [];
  for (const raw of v) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    const statement = str(r.statement);
    if (!statement) continue;
    const agreement = (['broad', 'strong', 'emerging'] as const).includes(
      r.agreement as 'broad' | 'strong' | 'emerging'
    )
      ? (r.agreement as 'broad' | 'strong' | 'emerging')
      : 'broad';
    out.push({ statement, agreement, note: str(r.note) || undefined });
  }
  return out.slice(0, 6);
}

function coerceDivides(v: unknown): DividePoint[] {
  if (!Array.isArray(v)) return [];
  const out: DividePoint[] = [];
  for (const raw of v) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    const statement = str(r.statement);
    if (!statement) continue;
    out.push({ statement, camps: strArr(r.camps, 5) });
  }
  return out.slice(0, 4);
}

/** Cached wrapper — reuses a recent result instead of re-running the model. */
export async function computeOpinionClusters(
  campaignId: string
): Promise<ClusterAnalysis> {
  return cached(
    `analysis:${campaignId}:clusters:v2`, // v2: identity rule (no ethnic group as one bloc); old cached versions are ignored
    ANALYSIS_TTL_MS,
    () => _computeOpinionClusters(campaignId),
    (r) => r.generated
  );
}

async function _computeOpinionClusters(
  campaignId: string
): Promise<ClusterAnalysis> {
  const all = await loadCampaignSignals(campaignId, { lens: true });
  const _c = await getCampaignById(campaignId);
  const focus = _c?.analysisFocus?.trim() || undefined;
  const exclusions = _c?.exclusions?.trim() || undefined;
  const base: ClusterAnalysis = {
    campaignId,
    total: all.length,
    analyzed: 0,
    camps: [],
    consensus: [],
    divides: [],
    updatedAt: new Date().toISOString(),
    generated: false,
  };

  if (all.length < MIN_SIGNALS) {
    return {
      ...base,
      note: `Not enough signal yet to cluster opinion (need at least ${MIN_SIGNALS}; have ${all.length}). As more community voices arrive, camps and consensus will appear here.`,
    };
  }

  // Feed the most prominent voices, bounded.
  const signals = selectForAnalysis(all, MAX_SIGNALS);

  let raw: string;
  try {
    raw = await complete({ values: 'analysis',
      model: CLUSTER_MODEL,
      maxTokens: 3500,
      temperature: 0,
      messages: [{ role: 'user', content: prompt(signals, focus, exclusions) }],
    });
  } catch (e) {
    return {
      ...base,
      analyzed: signals.length,
      note: `Analysis is temporarily unavailable: ${
        e instanceof Error ? e.message : String(e)
      }`,
    };
  }

  const obj = parseObject(raw);
  if (!obj) {
    return {
      ...base,
      analyzed: signals.length,
      note: 'Could not parse the opinion analysis. Try refreshing.',
    };
  }

  const camps = coerceCamps(obj.camps);
  const consensus = coerceConsensus(obj.consensus);
  const divides = coerceDivides(obj.divides);

  // Normalize camp shares to ~100 for a clean stacked bar.
  const shareSum = camps.reduce((a, c) => a + c.share, 0);
  if (shareSum > 0) {
    for (const c of camps) c.share = Math.round((c.share / shareSum) * 100);
  }

  return redactDeep({
    ...base,
    analyzed: signals.length,
    camps,
    consensus,
    divides,
    generated: camps.length > 0,
  }, collectNames(all));
}
