/**
 * Red-team / adversarial auditor (#53).
 *
 * The dashboard's AI sections (meta-synthesis, top questions, opinion camps,
 * representation) generate CLAIMS. This runs a SKEPTICAL second model over
 * those claims with the raw signals as the only ground truth, and flags any
 * that aren't actually supported — a hallucination check the operator runs on
 * demand. Nothing here is trusted from the first pass; the auditor re-derives
 * support from the signals.
 */
import { complete, MODELS } from '../claude';
import { loadCampaignSignals } from '../dashboard/signals';
import { collectNames, redactDeep } from '../redact';
import { selectForAnalysis } from './sampling';
import { runMetaSynthesis } from '../synthesis/meta';
import { computeTopQuestions } from './questions';
import { computeOpinionClusters } from './clusters';
import { computeRepresentation } from './representation';
import type { Signal } from '../types';

export const REDTEAM_MODEL =
  process.env.PYTHIA_REDTEAM_MODEL ??
  process.env.PYTHIA_EXTRACT_MODEL ??
  MODELS.conversation;

export type VerdictKind = 'grounded' | 'thin' | 'unsupported';
export interface Verdict {
  section: string;
  claim: string;
  verdict: VerdictKind;
  reason: string;
}
export interface RedTeamResult {
  campaignId: string;
  checked: number;
  grounded: number;
  thin: number;
  unsupported: number;
  items: Verdict[];
  generated: boolean;
  updatedAt: string;
  note?: string;
}

interface Claim {
  section: string;
  claim: string;
}

function gatherClaims(
  meta: { agreements?: { title: string; detail: string }[]; tensions?: { title: string; detail: string }[]; missingVoices?: { title: string; detail: string }[] },
  questions: { questions?: { question: string }[] },
  clusters: { camps?: { label: string; share: number; gist: string }[] },
  rep: { segments?: { name: string; share: number; stance: string; gist: string }[]; pathsForward?: { idea: string; detail: string }[] }
): Claim[] {
  const c: Claim[] = [];
  for (const a of meta.agreements ?? []) c.push({ section: 'Meta · agreement', claim: `${a.title}: ${a.detail}` });
  for (const t of meta.tensions ?? []) c.push({ section: 'Meta · tension', claim: `${t.title}: ${t.detail}` });
  for (const m of meta.missingVoices ?? []) c.push({ section: 'Meta · missing', claim: `${m.title}: ${m.detail}` });
  for (const q of questions.questions ?? []) c.push({ section: 'Top question', claim: q.question });
  for (const camp of clusters.camps ?? []) c.push({ section: 'Opinion camp', claim: `${camp.label} (~${camp.share}%): ${camp.gist}` });
  for (const s of rep.segments ?? []) c.push({ section: 'Segment', claim: `${s.name} (~${s.share}%, ${s.stance}): ${s.gist}` });
  for (const p of rep.pathsForward ?? []) c.push({ section: 'Path forward', claim: `${p.idea}: ${p.detail}` });
  return c;
}

function digest(signals: Signal[]): string {
  return signals.map((s, i) => `#${i + 1} [${s.stance}] ${s.title} :: ${s.summary}`).join('\n');
}

function prompt(claims: Claim[], signals: Signal[]): string {
  return [
    `You are a SKEPTICAL AUDITOR red-teaming an AI dashboard. Your job is to`,
    `catch hallucinations — claims the dashboard made that the underlying`,
    `SIGNALS do not actually support. Be adversarial; default to doubt.`,
    ``,
    `For EACH claim, judge it against the signals below (the ONLY ground truth):`,
    `- "grounded": clearly supported by one or more signals.`,
    `- "thin": plausible but weakly supported, or an overreach in degree/share.`,
    `- "unsupported": not supported by the signals — a likely hallucination.`,
    `- ALSO flag as "unsupported" any claim that rests on the SUBJECT's own`,
    `  self-authored/internal material, or on an org/author that appears only as`,
    `  a CITED reference rather than an external stakeholder — note it in reason.`,
    ``,
    `- ALSO flag any claim that dismisses or minimizes a concern on gendered or`,
    `  racialized grounds, or uses loaded framing ("emotional", "hysterical",`,
    `  "NIMBY") instead of attributing it to conditions — analytic bias, not`,
    `  grounded synthesis. Note it in reason.`,
    ``,
    `=== SIGNALS (ground truth) ===`,
    digest(signals),
    ``,
    `=== CLAIMS TO AUDIT ===`,
    claims.map((c, i) => `#${i + 1} [${c.section}] ${c.claim}`).join('\n'),
    ``,
    `Return JSON ONLY: { "verdicts": [ { "i": claim number, "verdict":`,
    `"grounded"|"thin"|"unsupported", "reason": one short clause citing what the`,
    `signals do or don't show } ] }. Judge EVERY claim.`,
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

export async function computeRedTeam(campaignId: string): Promise<RedTeamResult> {
  const now = () => new Date().toISOString();
  const empty: RedTeamResult = {
    campaignId, checked: 0, grounded: 0, thin: 0, unsupported: 0, items: [], generated: false, updatedAt: now(),
  };

  const [signals, meta, questions, clusters, rep] = await Promise.all([
    loadCampaignSignals(campaignId),
    runMetaSynthesis(campaignId).catch(() => ({ agreements: [], tensions: [], missingVoices: [] })),
    computeTopQuestions(campaignId).catch(() => ({ questions: [] })),
    computeOpinionClusters(campaignId).catch(() => ({ camps: [] })),
    computeRepresentation(campaignId).catch(() => ({ segments: [], pathsForward: [] })),
  ]);

  const claims = gatherClaims(meta as never, questions as never, clusters as never, rep as never);
  if (claims.length === 0) {
    return { ...empty, note: 'No analysis claims to check yet — generate the dashboard sections first.' };
  }

  const sample = selectForAnalysis(signals, 120);
  let raw: string;
  try {
    raw = await complete({ values: 'analysis',
      model: REDTEAM_MODEL,
      maxTokens: 3200,
      temperature: 0,
      messages: [{ role: 'user', content: prompt(claims, sample) }],
    });
  } catch {
    return { ...empty, note: 'Red-team is temporarily unavailable.' };
  }

  const obj = parseObject(raw);
  const verdicts = Array.isArray(obj?.verdicts) ? (obj!.verdicts as unknown[]) : [];
  const items: Verdict[] = [];
  for (const v of verdicts) {
    const o = v as Record<string, unknown>;
    const idx = Number(o.i) - 1;
    if (!Number.isInteger(idx) || idx < 0 || idx >= claims.length) continue;
    const verdict: VerdictKind =
      o.verdict === 'grounded' || o.verdict === 'unsupported' ? o.verdict : 'thin';
    items.push({
      section: claims[idx].section,
      claim: claims[idx].claim,
      verdict,
      reason: typeof o.reason === 'string' ? o.reason : '',
    });
  }

  const order: Record<VerdictKind, number> = { unsupported: 0, thin: 1, grounded: 2 };
  items.sort((a, b) => order[a.verdict] - order[b.verdict]);
  return redactDeep({
    campaignId,
    checked: items.length,
    grounded: items.filter((x) => x.verdict === 'grounded').length,
    thin: items.filter((x) => x.verdict === 'thin').length,
    unsupported: items.filter((x) => x.verdict === 'unsupported').length,
    items,
    generated: items.length > 0,
    updatedAt: now(),
  }, collectNames(signals));
}
