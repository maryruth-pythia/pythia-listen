/**
 * Survey-sourced agree/disagree findings.
 *
 * Turns real, anonymous survey responses into per-statement agreement for a
 * project. Each dyad signifier is a 0–100 slider between two poles; we report
 * how the community leans, never averaging distinct statements into one number.
 *
 * Deterministic and cheap — pure aggregation over stored responses, NO model
 * call. Safe to run on every brief render.
 */

import { listSurveys, listSurveyResponses } from '@/lib/db';

export interface SurveyStatement {
  id: string;
  /** Operator-facing label / the statement itself. */
  label: string;
  poleLow: string;
  poleHigh: string;
  n: number;
  /** Mean 0–100 (0 = fully poleLow, 100 = fully poleHigh). */
  mean: number;
  /** Share leaning toward the high pole (score > 55). */
  agreePct: number;
  /** Share leaning toward the low pole (score < 45). */
  disagreePct: number;
  /** Share in the middle (45–55). */
  mixedPct: number;
}

export interface SurveyFinding {
  surveyId: string;
  title: string;
  /** Total responses to this survey. */
  n: number;
  /** The survey's stated purpose/intro, shown under the title. */
  purpose?: string;
  statements: SurveyStatement[];
  /** Pre/post sentiment shift, if the survey captured it. */
  stanceShift?: { before: number; after: number; n: number };
}

export interface SurveyFindingsResult {
  campaignId: string;
  surveys: SurveyFinding[];
  generated: boolean;
  updatedAt: string;
}

type SpecSignifier = {
  id: string;
  kind: 'dyad' | 'triad';
  label?: string;
  poleLow?: string;
  poleHigh?: string;
};
type Spec = {
  title?: string;
  intro?: string;
  signifiers?: SpecSignifier[];
  prePostSentiment?: boolean;
};

const mean = (ns: number[]) => (ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : 0);
const pct = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0);

export async function computeSurveyFindings(campaignId: string): Promise<SurveyFindingsResult> {
  const now = new Date().toISOString();
  const surveys = (await listSurveys(campaignId)).filter((s) => s.status === 'published');

  const out: SurveyFinding[] = [];
  for (const survey of surveys) {
    const responses = await listSurveyResponses(survey.id);
    if (responses.length === 0) continue;

    const spec = (survey.spec ?? {}) as Spec;
    const dyads = (spec.signifiers ?? []).filter((s) => s.kind === 'dyad');

    const statements: SurveyStatement[] = [];
    for (const dy of dyads) {
      const vals = responses
        .map((r) => r.answers?.[dy.id])
        .filter((v): v is number => typeof v === 'number');
      if (vals.length === 0) continue;
      const agree = vals.filter((v) => v > 55).length;
      const disagree = vals.filter((v) => v < 45).length;
      const mixed = vals.length - agree - disagree;
      statements.push({
        id: dy.id,
        label: dy.label ?? dy.id,
        poleLow: dy.poleLow ?? 'Disagree',
        poleHigh: dy.poleHigh ?? 'Agree',
        n: vals.length,
        mean: Math.round(mean(vals)),
        agreePct: pct(agree, vals.length),
        disagreePct: pct(disagree, vals.length),
        mixedPct: pct(mixed, vals.length),
      });
    }
    // Sort by strongest signal away from the middle (most decisive first).
    statements.sort((a, b) => Math.abs(b.mean - 50) - Math.abs(a.mean - 50));

    let stanceShift: SurveyFinding['stanceShift'];
    if (spec.prePostSentiment) {
      const before = responses
        .map((r) => r.answers?.['stance_before'])
        .filter((v): v is number => typeof v === 'number');
      const after = responses
        .map((r) => r.answers?.['stance_after'])
        .filter((v): v is number => typeof v === 'number');
      if (before.length && after.length) {
        stanceShift = {
          before: Math.round(mean(before)),
          after: Math.round(mean(after)),
          n: Math.min(before.length, after.length),
        };
      }
    }

    out.push({
      surveyId: survey.id,
      title: (spec.title as string) || 'Community survey',
      purpose: typeof spec.intro === 'string' && spec.intro.trim() ? spec.intro.trim() : undefined,
      n: responses.length,
      statements,
      stanceShift,
    });
  }

  // Surveys with the most responses first.
  out.sort((a, b) => b.n - a.n);
  return { campaignId, surveys: out, generated: out.length > 0, updatedAt: now };
}
