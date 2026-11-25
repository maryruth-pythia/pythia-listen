/**
 * Coalition / community-influence map.
 *
 * Turns the actors named across a campaign's signals into a table of the key
 * people and groups shaping the conversation — classified by the ROLE they
 * play, so a CBO can see who leads, who connects, who knows the technical
 * detail, and who is most directly affected.
 *
 * Grounded in the real signals. PII is excluded from signals, so named
 * INDIVIDUALS won't appear unless they're public figures/officials or orgs;
 * for resident archetypes the model uses a descriptive label, never an
 * invented personal name.
 */

import { complete, MODELS } from '../claude';
import { loadCampaignSignals } from '../dashboard/signals';
import { selectForAnalysis } from './sampling';
import { getCampaignById } from '../campaigns';
import { relevanceLines } from './relevance';
import { cached, ANALYSIS_TTL_MS } from '../cache';
import type { Signal, SignalSource, SignalStance } from '../types';

export const COALITION_MODEL =
  process.env.PYTHIA_COALITION_MODEL ??
  process.env.PYTHIA_EXTRACT_MODEL ??
  MODELS.conversation;

const MAX_SIGNALS = 90;
const MIN_SIGNALS = 4;

export type CoalitionArchetype =
  | 'official'
  | 'organization'
  | 'connector'
  | 'expert'
  | 'frontline'
  | 'proponent';

export interface CoalitionSignalRef {
  title: string;
  source: SignalSource;
  stance: SignalStance;
  url?: string;
}

export interface CoalitionMember {
  name: string;
  archetype: CoalitionArchetype;
  role: string;
  influence: string;
  reach: 'high' | 'medium' | 'low';
  mentions: number;
  stance: SignalStance;
  signals: CoalitionSignalRef[];
}

export interface CoalitionAnalysis {
  campaignId: string;
  total: number;
  members: CoalitionMember[];
  generated: boolean;
  note?: string;
  updatedAt: string;
}

const ARCHETYPES: CoalitionArchetype[] = [
  'official',
  'organization',
  'connector',
  'expert',
  'frontline',
  'proponent',
];
const STANCES: SignalStance[] = ['opposition', 'concern', 'mixed', 'support', 'neutral'];

function dominantStance(signals: Signal[]): SignalStance {
  const c: Record<SignalStance, number> = { opposition: 0, concern: 0, mixed: 0, support: 0, neutral: 0 };
  for (const s of signals) c[s.stance]++;
  return STANCES.reduce((a, b) => (c[b] > c[a] ? b : a), 'neutral');
}

function toRef(s: Signal): CoalitionSignalRef {
  return { title: s.title, source: s.source, stance: s.stance, url: s.citations?.[0]?.url };
}

function prompt(actorLines: string, digest: string, place?: string, exclusions?: string): string {
  return [
    `You are mapping the KEY STAKEHOLDERS and community influencers around a`,
    `contested infrastructure siting project, so a community-based organization`,
    `can see who leads and shapes opinion.`,
    ...(place
      ? [
          ``,
          `LOCALITY: this project sits in ${place}. Include ONLY actors who`,
          `actually operate in, represent, or are directly tied to that`,
          `locality/region. EXCLUDE national or international organisations,`,
          `researchers, or outlets that are topically relevant to the ISSUE but`,
          `are NOT local influencers here (e.g. a foreign institute studying`,
          `siting is not a local coalition member). If unsure an actor is local,`,
          `leave them out.`,
        ]
      : []),
    ...relevanceLines(exclusions),
    ``,
    `Named actors that appear in the community signals (with mention count and`,
    `typical stance):`,
    actorLines || '(none named)',
    ``,
    `Signal digest for context:`,
    digest,
    ``,
    `Identify 5–9 key stakeholders. Classify EACH into exactly one archetype:`,
    `- official: elected officials, lawmakers, state/county reps, board or`,
    `  council members ("select-people"), agencies.`,
    `- organization: organized groups, coalitions, HOAs, advocacy orgs, trusts.`,
    `- connector: a well-connected community hub who knows everyone and moves`,
    `  information around — the "sage" whose word travels.`,
    `- expert: a knowledgeable/technical resident closely tracking the issue and`,
    `  helping neighbours understand it.`,
    `- frontline: residents most directly impacted (nearest the site), whose`,
    `  lived experience can tell the story.`,
    `- proponent: the project / developer side.`,
    ``,
    `Return JSON only:`,
    `{ "members": [ {`,
    `  "name": a REAL actor name from the list where one fits; otherwise a clear`,
    `    descriptive label for the role (e.g. "Frontline residents nearest the`,
    `    site") — NEVER invent a specific private individual's personal name,`,
    `  "archetype": one of official|organization|connector|expert|frontline|proponent,`,
    `  "role": short plain descriptor (e.g. "County Board of Supervisors"),`,
    `  "influence": ONE sentence on why they matter — their leverage or the part`,
    `    they play in shaping the outcome,`,
    `  "reach": "high" | "medium" | "low",`,
    `  "stance": "opposition"|"concern"|"mixed"|"support"|"neutral"`,
    `} ] }`,
    ``,
    `Rules: ground everything in the actors/signals above; do not invent`,
    `organizations or people. Include connector/expert/frontline archetypes only`,
    `if the signals clearly evidence such a role, described generically without`,
    `invented names. Aim to cover a range of archetypes. Output ONLY the JSON.`,
  ].join('\n');
}

/* ── robust JSON extraction (handles truncation / fences) ─────────── */
function extractBalanced(s: string): string | null {
  let depth = 0, inStr = false, esc = false, start = -1;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inStr) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') inStr = false; continue; }
    if (ch === '"') inStr = true;
    else if (ch === '{') { if (depth === 0) start = i; depth++; }
    else if (ch === '}') { depth--; if (depth === 0 && start !== -1) return s.slice(start, i + 1); }
  }
  return null;
}
function repair(s: string): string {
  let t = s.replace(/[\s,:]+$/, '');
  let curly = 0, square = 0, inStr = false, esc = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (inStr) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') inStr = false; continue; }
    if (ch === '"') inStr = true;
    else if (ch === '{') curly++; else if (ch === '}') curly--;
    else if (ch === '[') square++; else if (ch === ']') square--;
  }
  if (inStr) t += '"';
  t = t.replace(/,\s*$/, '');
  while (square-- > 0) t += ']';
  while (curly-- > 0) t += '}';
  return t;
}
function parseObj(raw: string): Record<string, unknown> | null {
  let t = raw.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const start = t.indexOf('{');
  if (start === -1) return null;
  t = t.slice(start);
  for (const cand of [extractBalanced(t), repair(t)]) {
    if (!cand) continue;
    try {
      return JSON.parse(cand.replace(/,(\s*[}\]])/g, '$1')) as Record<string, unknown>;
    } catch { /* try next */ }
  }
  return null;
}

export function computeCoalition(campaignId: string): Promise<CoalitionAnalysis> {
  return cached(
    `analysis:${campaignId}:coalition:v2`, // v2: identity rule (no ethnic group as one bloc); old cached versions are ignored
    ANALYSIS_TTL_MS,
    () => _computeCoalition(campaignId),
    (r) => r.generated
  );
}

async function _computeCoalition(campaignId: string): Promise<CoalitionAnalysis> {
  const all = await loadCampaignSignals(campaignId, { includeSurvey: false, lens: true });
  const campaign = await getCampaignById(campaignId);
  const place =
    campaign?.kind === 'site' ? (campaign.jurisdiction || campaign.meta || '') : '';
  const exclusions = campaign?.exclusions?.trim() || undefined;
  const base: CoalitionAnalysis = {
    campaignId,
    total: all.length,
    members: [],
    generated: false,
    updatedAt: new Date().toISOString(),
  };
  if (all.length < MIN_SIGNALS) {
    return { ...base, note: `Not enough signal yet to map the coalition (have ${all.length}).` };
  }

  // Group signals by named actor (for grounding + click-through).
  const byActor = new Map<string, Signal[]>();
  for (const s of all) {
    if (!s.actor) continue;
    const arr = byActor.get(s.actor) ?? [];
    arr.push(s);
    byActor.set(s.actor, arr);
  }
  const actorLines = Array.from(byActor.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 20)
    .map(([actor, sigs]) => `- ${actor} (${sigs.length} mentions, mostly ${dominantStance(sigs)})`)
    .join('\n');

  const signals = selectForAnalysis(all, MAX_SIGNALS);
  const digest = signals
    .map((s, i) => `${i + 1}. <${s.stance}> ${s.actor ? `[${s.actor}] ` : ''}${s.title} — ${s.summary}`)
    .join('\n');

  let raw: string;
  try {
    raw = await complete({
      model: COALITION_MODEL,
      maxTokens: 2600,
      temperature: 0,
      messages: [{ role: 'user', content: prompt(actorLines, digest, place, exclusions) }],
    });
  } catch (e) {
    return { ...base, note: `Analysis temporarily unavailable: ${e instanceof Error ? e.message : String(e)}` };
  }

  const obj = parseObj(raw);
  const rawMembers = obj && Array.isArray(obj.members) ? obj.members : [];

  // Lowercase actor lookup for attaching real signals + true mention counts.
  const actorLc = new Map<string, { key: string; sigs: Signal[] }>();
  for (const [actor, sigs] of byActor) actorLc.set(actor.toLowerCase(), { key: actor, sigs });

  const members: CoalitionMember[] = [];
  for (const m of rawMembers) {
    if (!m || typeof m !== 'object') continue;
    const r = m as Record<string, unknown>;
    const name = typeof r.name === 'string' ? r.name.trim() : '';
    if (!name) continue;
    const archetype = ARCHETYPES.includes(r.archetype as CoalitionArchetype)
      ? (r.archetype as CoalitionArchetype)
      : 'organization';
    const stance = STANCES.includes(r.stance as SignalStance) ? (r.stance as SignalStance) : 'neutral';

    // Attach real signals if the name matches (or contains) a known actor.
    const nl = name.toLowerCase();
    let matched: Signal[] = [];
    const exact = actorLc.get(nl);
    if (exact) matched = exact.sigs;
    else {
      for (const [k, v] of actorLc) {
        if (nl.includes(k) || k.includes(nl)) { matched = v.sigs; break; }
      }
    }

    members.push({
      name: name.slice(0, 80),
      archetype,
      role: typeof r.role === 'string' ? r.role.slice(0, 90) : '',
      influence: typeof r.influence === 'string' ? r.influence.slice(0, 240) : '',
      reach:
        matched.length >= 4 ? 'high' : matched.length >= 2 ? 'medium' : 'low',
      mentions: matched.length,
      stance: matched.length ? dominantStance(matched) : stance,
      signals: matched.slice(0, 8).map(toRef),
    });
  }

  return {
    ...base,
    members: members.sort((a, b) => b.mentions - a.mentions).slice(0, 10),
    generated: members.length > 0,
  };
}
