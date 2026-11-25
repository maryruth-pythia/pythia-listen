/**
 * Mutual-gains finder (cooperative game theory).
 *
 * Where the opinion-clusters analysis surfaces what a super-majority agrees on,
 * this pass goes one step further toward a deal: it finds concrete points where
 * what the COMMUNITY wants could ALSO serve the DEVELOPER's own interest — the
 * overlaps that make a durable agreement possible. A bridge, not a battle.
 *
 * Method decision (Maryruth, 2026-07-24): cooperative game theory / common
 * ground — surface REAL overlap only, never manufactured, and never steer a
 * respondent. This module reads existing signals; it does not touch respondents.
 */

import { complete, MODELS } from '../claude';
import { loadCampaignSignals } from '../dashboard/signals';
import { selectForAnalysis } from './sampling';
import { cached, ANALYSIS_TTL_MS } from '../cache';
import type { Signal, SignalStance } from '../types';

export const MUTUAL_GAINS_MODEL =
  process.env.PYTHIA_CLUSTER_MODEL ??
  process.env.PYTHIA_EXTRACT_MODEL ??
  MODELS.conversation;

const MAX_SIGNALS = 70;
const MIN_SIGNALS = 6;

export type GainStrength = 'strong' | 'moderate' | 'emerging';

export interface MutualGain {
  id: string;
  /** What the community wants (specific, short). */
  community: string;
  /** Why meeting it also serves the developer's own interest. */
  developer: string;
  /** One concrete commitment / design change that satisfies BOTH sides. */
  move: string;
  /** How well the signals support this overlap. */
  strength: GainStrength;
  themes: string[];
  /** Representative signal titles (verbatim). */
  exampleTitles: string[];
}

export interface MutualGainsAnalysis {
  campaignId: string;
  total: number;
  analyzed: number;
  gains: MutualGain[];
  updatedAt: string;
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

function prompt(signals: Signal[]): string {
  return [
    `You are analyzing community "signals" about a clean-energy siting project.`,
    `Each signal is one distilled community voice with a stance`,
    `(opposition / concern / mixed / support / neutral), an optional role, and`,
    `themes.`,
    ``,
    `Your job is a MUTUAL-GAINS analysis (cooperative game theory): find the`,
    `concrete points where what the COMMUNITY wants could ALSO serve the`,
    `DEVELOPER's own interest — the overlaps that make a durable agreement`,
    `possible. A bridge, not a battle. This is NOT persuasion: you are mapping`,
    `where real interests already align, not inventing leverage.`,
    ``,
    `Signal count: ${signals.length}. Stance mix: ${stanceMix(signals)}.`,
    ``,
    `=== SIGNALS ===`,
    digestOf(signals),
    ``,
    `=== RETURN (JSON object only, no prose, no code fence) ===`,
    `{`,
    `  "gains": [   // 0 to 6 genuine overlaps; fewer is fine if overlap is thin`,
    `    {`,
    `      "community": what the community wants, specific and short,`,
    `      "developer": why meeting it also serves the developer's OWN interest`,
    `        (faster approval, fewer disputes, lower risk, local goodwill, etc.),`,
    `      "move": one concrete commitment or design change that satisfies BOTH,`,
    `      "strength": "strong" | "moderate" | "emerging" (how well the signals`,
    `        support that this overlap is real),`,
    `      "themes": up to 4 theme tags drawn from the signals,`,
    `      "exampleTitles": 1-3 signal titles copied VERBATIM that support it`,
    `    }`,
    `  ]`,
    `}`,
    ``,
    `Rules: base everything ONLY on the signals above; do NOT invent concerns or`,
    `overlaps. Surface REAL alignment, never manufactured. If genuine overlap is`,
    `thin, return few gains (even zero) — do not pad. Output ONLY the JSON.`,
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

function coerceGains(v: unknown): MutualGain[] {
  if (!Array.isArray(v)) return [];
  const out: MutualGain[] = [];
  v.forEach((raw, i) => {
    if (!raw || typeof raw !== 'object') return;
    const r = raw as Record<string, unknown>;
    const community = str(r.community);
    const move = str(r.move);
    if (!community || !move) return;
    out.push({
      id: `gain_${i + 1}`,
      community,
      developer: str(r.developer),
      move,
      strength: (['strong', 'moderate', 'emerging'] as const).includes(
        r.strength as GainStrength
      )
        ? (r.strength as GainStrength)
        : 'moderate',
      themes: strArr(r.themes, 4),
      exampleTitles: strArr(r.exampleTitles, 3),
    });
  });
  return out.slice(0, 6);
}

/** Cached wrapper — reuses a recent result instead of re-running the model. */
export async function computeMutualGains(
  campaignId: string
): Promise<MutualGainsAnalysis> {
  return cached(
    `analysis:${campaignId}:mutual-gains`,
    ANALYSIS_TTL_MS,
    () => _computeMutualGains(campaignId),
    (r) => r.generated
  );
}

async function _computeMutualGains(
  campaignId: string
): Promise<MutualGainsAnalysis> {
  const all = await loadCampaignSignals(campaignId, { lens: true });
  const base: MutualGainsAnalysis = {
    campaignId,
    total: all.length,
    analyzed: 0,
    gains: [],
    updatedAt: new Date().toISOString(),
    generated: false,
  };

  if (all.length < MIN_SIGNALS) {
    return {
      ...base,
      note: `Not enough signal yet to find common ground (need at least ${MIN_SIGNALS}; have ${all.length}). As more community voices arrive, overlaps will appear here.`,
    };
  }

  const signals = selectForAnalysis(all, MAX_SIGNALS);

  let raw: string;
  try {
    raw = await complete({ values: 'analysis',
      model: MUTUAL_GAINS_MODEL,
      maxTokens: 3000,
      temperature: 0,
      messages: [{ role: 'user', content: prompt(signals) }],
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
      note: 'Could not parse the mutual-gains analysis. Try refreshing.',
    };
  }

  const gains = coerceGains(obj.gains);
  return {
    ...base,
    analyzed: signals.length,
    gains,
    generated: gains.length > 0,
    note:
      gains.length === 0
        ? 'No clear community–developer overlap surfaced in the current signal. That can change as more voices arrive.'
        : undefined,
  };
}
