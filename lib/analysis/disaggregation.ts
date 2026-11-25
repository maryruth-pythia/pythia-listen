/**
 * Real disaggregated synthesis — deterministic breakdown of the demographic
 * data the tool ACTUALLY collects (gender, Indigenous status, age, relationship
 * to the area) plus sentiment-by-segment from the pre-conversation stance, and
 * an under-representation comparison against real U.S. Census QuickFacts.
 *
 * Every number here is counted from stored sessions — NOT model-generated —
 * matching the tool's "real numbers, never invented" guarantee. Operator-side
 * and confidential; individual respondents are never singled out.
 */
import type { Demographics } from '../types';
import { listSessions } from '../db';
import { DEMOGRAPHICS } from '../reference/demographics';

export interface SegmentStat {
  key: string;
  label: string;
  n: number;
  /** % of respondents who answered this dimension. */
  share: number;
  /** Mean pre-conversation stance 0–100 (0 opposed … 100 supportive), or null. */
  meanStance: number | null;
}

export interface UnderRep {
  label: string;
  respondentShare: number;
  baselinePct: number;
  /** respondentShare − baselinePct (negative = under-represented vs the county). */
  gap: number;
  hint: string;
}

export interface Disaggregation {
  respondents: number;
  withStance: number;
  overallMeanStance: number | null;
  gender: SegmentStat[];
  indigenous: SegmentStat[];
  age: SegmentStat[];
  relationship: SegmentStat[];
  underrepresented: UnderRep[];
  baselineSource?: { label: string; url: string };
  note?: string;
}

const GENDER_LABELS: Record<string, string> = {
  woman: 'Women', man: 'Men', nonbinary: 'Non-binary', two_spirit: 'Two-Spirit',
  genderqueer: 'Genderqueer', trans_woman: 'Trans women', trans_man: 'Trans men',
  self_describe: 'Self-described', prefer_not_to_say: 'Prefer not to say',
};
const AGE_LABELS: Record<string, string> = {
  '18_24': '18–24', '25_34': '25–34', '35_49': '35–49', '50_64': '50–64',
  '65_plus': '65+', prefer_not_to_say: 'Prefer not to say',
};
const REL_LABELS: Record<string, string> = {
  lives_immediate: 'Lives in the immediate area', lives_nearby: 'Lives nearby',
  works_or_business: 'Works / owns a business here', family_or_land: 'Connected via family or land',
  visiting: 'Visiting', other: 'Other', prefer_not_to_say: 'Prefer not to say',
};
const INDIG_LABELS: Record<string, string> = {
  yes: 'Identifies as Indigenous', no: 'Does not identify as Indigenous', prefer_not_to_say: 'Prefer not to say',
};

function tally(
  demos: Demographics[],
  pick: (d: Demographics) => string | undefined,
  labels: Record<string, string>
): SegmentStat[] {
  const groups = new Map<string, { n: number; stanceSum: number; stanceN: number }>();
  let total = 0;
  for (const d of demos) {
    const v = pick(d);
    if (!v) continue;
    total++;
    const g = groups.get(v) ?? { n: 0, stanceSum: 0, stanceN: 0 };
    g.n++;
    if (typeof d.preStance === 'number') { g.stanceSum += d.preStance; g.stanceN++; }
    groups.set(v, g);
  }
  return [...groups.entries()]
    .map(([k, g]) => ({
      key: k,
      label: labels[k] ?? k,
      n: g.n,
      share: total ? Math.round((g.n / total) * 100) : 0,
      meanStance: g.stanceN ? Math.round(g.stanceSum / g.stanceN) : null,
    }))
    .sort((a, b) => b.n - a.n);
}

function underrep(campaignId: string, gender: SegmentStat[], age: SegmentStat[]): UnderRep[] {
  const base = DEMOGRAPHICS[campaignId];
  if (!base) return [];
  const out: UnderRep[] = [];
  const womenBase = base.groups.find((g) => /women/i.test(g.label));
  if (womenBase) {
    const share = gender.find((s) => s.key === 'woman')?.share ?? 0;
    out.push({ label: 'Women', respondentShare: share, baselinePct: womenBase.pct, gap: share - womenBase.pct, hint: womenBase.hint });
  }
  const olderBase = base.groups.find((g) => /65\+|older/i.test(g.label));
  if (olderBase) {
    const share = age.find((s) => s.key === '65_plus')?.share ?? 0;
    out.push({ label: 'Older residents (65+)', respondentShare: share, baselinePct: olderBase.pct, gap: share - olderBase.pct, hint: olderBase.hint });
  }
  return out.sort((a, b) => a.gap - b.gap);
}

/**
 * Compute the deterministic disaggregation for a campaign's conversations.
 * Direct-conversation signals are tagged campaignId === projectId (see
 * lib/ingest/pythia.ts), so the respondent sessions live under this id.
 */
export async function computeDisaggregation(campaignId: string): Promise<Disaggregation> {
  const sessions = await listSessions(campaignId);
  const demos: Demographics[] = sessions.map((s) => s.demographics).filter((d): d is Demographics => !!d);
  const base = DEMOGRAPHICS[campaignId];
  const empty: Disaggregation = {
    respondents: demos.length, withStance: 0, overallMeanStance: null,
    gender: [], indigenous: [], age: [], relationship: [], underrepresented: [],
    baselineSource: base?.source,
  };
  if (demos.length === 0) return { ...empty, note: 'No conversations with demographics yet.' };

  const stances = demos.map((d) => d.preStance).filter((n): n is number => typeof n === 'number');
  const overallMeanStance = stances.length ? Math.round(stances.reduce((a, b) => a + b, 0) / stances.length) : null;

  const notPNTS = (v?: string) => (v && v !== 'prefer_not_to_say' ? v : undefined);
  const gender = tally(demos, (d) => notPNTS(d.gender), GENDER_LABELS);
  const indigenous = tally(demos, (d) => notPNTS(d.indigenous), INDIG_LABELS);
  const age = tally(demos, (d) => notPNTS(d.ageRange), AGE_LABELS);
  const relationship = tally(demos, (d) => notPNTS(d.relationshipToArea), REL_LABELS);

  return {
    respondents: demos.length,
    withStance: stances.length,
    overallMeanStance,
    gender, indigenous, age, relationship,
    underrepresented: underrep(campaignId, gender, age),
    baselineSource: base?.source,
  };
}
