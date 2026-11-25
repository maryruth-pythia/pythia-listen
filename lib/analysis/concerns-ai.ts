/**
 * Section 05, AI-grouped: an AI pass reads the board's concern, opposition and mixed
 * signals and names the concerns they share, so the clusters follow the record rather
 * than a fixed word list (fixed rules break when the issues shift). Counting, ranking,
 * examples and the Venn are then done in code from the signals the AI assigned, so
 * every number traces back to real signals.
 *
 * Falls back to the rule-based grouping (computeConcerns) when the AI pass fails.
 */
import { complete } from '../claude';
import { cached, ANALYSIS_TTL_MS } from '../cache';
import { getCampaignById } from '../campaigns';
import { loadLensedSignals, contextLines } from '../dashboard/signals';
import { communityOf } from '../dashboard/community-views';
import { buildConcernView, computeConcerns, concernPool, type ConcernView } from '../dashboard/concerns';
import { relevanceLines } from './relevance';
import { selectForAnalysis } from './sampling';
import { CLUSTER_MODEL } from './clusters';
import type { Signal } from '../types';

const MAX_SIGNALS = 150;
const MIN_SIGNALS = 4;

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

function prompt(signals: Signal[], focus: string | undefined, exclusions: string | undefined, background: string[]): string {
  return [
    `You group community concerns. Below are signals where people raised a concern,`,
    `objected, or had mixed feelings. Find the CONCERNS they share: the specific`,
    `issues people are worried about (e.g. "turbine noise and setbacks near homes",`,
    `"distrust of the utility after past broken promises"), not stances or camps.`,
    ``,
    ...(focus ? [`This board's ANALYSIS FOCUS is:`, focus, ``] : []),
    ...relevanceLines(exclusions),
    ``,
    ...background,
    `=== SIGNALS ===`,
    ...signals.map(
      (s, i) => `#${i + 1} [${s.stance}${communityOf(s) ? `, ${communityOf(s)}` : ''}] ${s.title} :: ${s.summary ?? ''}`
    ),
    ``,
    `=== RETURN (JSON object only, no prose, no code fence) ===`,
    `{ "clusters": [ { "name": short plain-language label (3–7 words),`,
    `                  "description": one sentence on what people are worried about, grounded in the signals,`,
    `                  "signals": [numbers of the signals that raise it] } ] }`,
    ``,
    `Rules: 4–9 clusters, most-raised first. Name concrete issues, not "general concerns".`,
    `A signal may raise up to two concerns; leave out a signal that fits none. Every`,
    `cluster needs at least 2 signals. Base everything ONLY on the signals; invent`,
    `nothing. Refer to people by role or place, never personal names, and never name`,
    `an ethnic or Indigenous identity as the group that holds a concern.`,
  ].join('\n');
}

/** AI-grouped concern clusters + Venn, cached per board until its data or tuning changes. */
export async function computeConcernsAI(campaignId: string): Promise<ConcernView> {
  return cached(
    `analysis:${campaignId}:concerns:v1`,
    ANALYSIS_TTL_MS,
    () => _compute(campaignId),
    (v) => v.method === 'ai' && v.clusters.length > 0
  );
}

async function _compute(campaignId: string): Promise<ConcernView> {
  const lensed = await loadLensedSignals(campaignId, { build: false });
  const fallback = () => computeConcerns(campaignId, lensed);
  const pool = concernPool(lensed.views);
  if (pool.length < MIN_SIGNALS) return fallback();

  const c = await getCampaignById(campaignId);
  const sample = selectForAnalysis(pool, MAX_SIGNALS);
  let raw: string;
  try {
    raw = await complete({
      values: 'analysis',
      model: CLUSTER_MODEL,
      maxTokens: 3000,
      temperature: 0,
      feature: 'concerns',
      messages: [
        {
          role: 'user',
          content: prompt(sample, c?.analysisFocus?.trim() || undefined, c?.exclusions?.trim() || undefined, contextLines(lensed.context, 12)),
        },
      ],
    });
  } catch {
    return fallback();
  }
  const obj = parseObject(raw);
  const list = Array.isArray(obj?.clusters) ? (obj!.clusters as Record<string, unknown>[]) : [];

  // Signal id -> the AI clusters it was assigned to (max two).
  const membership = new Map<string, { key: string; label: string }[]>();
  const descriptions: Record<string, string> = {};
  list.forEach((cl, k) => {
    const label = typeof cl.name === 'string' ? cl.name.trim() : '';
    if (!label) return;
    const key = `ai:${k}`;
    const ids = new Set<string>();
    for (const v of Array.isArray(cl.signals) ? cl.signals : []) {
      const i = Math.round(Number(String(v).replace('#', ''))) - 1;
      if (Number.isInteger(i) && i >= 0 && i < sample.length) ids.add(sample[i].id);
    }
    if (ids.size < 2) return;
    if (typeof cl.description === 'string' && cl.description.trim()) descriptions[key] = cl.description.trim();
    for (const id of ids) {
      const m = membership.get(id) ?? [];
      if (m.length < 2) m.push({ key, label });
      membership.set(id, m);
    }
  });
  if (!membership.size) return fallback();

  const view = buildConcernView(campaignId, pool, (s) => membership.get(s.id) ?? [], 'ai');
  return { ...view, descriptions };
}
