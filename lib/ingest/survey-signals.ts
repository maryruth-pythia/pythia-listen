/**
 * Survey-response signals.
 *
 * Turns each anonymous survey response into the same normalized `Signal` shape
 * the rest of the dashboard uses, tagged source = 'survey'. Computed live from
 * the responses on read (nothing seeded or persisted), so the dashboard's
 * source buckets, score, sentiment mix, and trend all reflect survey input the
 * moment responses come in. No individual identity is ever attached — responses
 * are anonymous by construction (coarse date only).
 */
import { listSurveys, listSurveyResponses } from '@/lib/db';
import type { Signal, SignalStance } from '@/lib/types';

function stanceFromScore(v: number): SignalStance {
  if (v < 20) return 'opposition';
  if (v < 40) return 'concern';
  if (v < 60) return 'mixed';
  return 'support';
}

type Spec = {
  title?: string;
  signifiers?: Array<{ id: string; kind: string; label?: string }>;
};

export async function buildSurveySignals(campaignId: string): Promise<Signal[]> {
  const surveys = (await listSurveys(campaignId)).filter((s) => s.status === 'published');
  const out: Signal[] = [];
  for (const survey of surveys) {
    const spec = (survey.spec ?? {}) as Spec;
    const title = spec.title || 'Community survey';
    const dyads = (spec.signifiers ?? []).filter((s) => s.kind === 'dyad');
    const labelById = new Map(dyads.map((d) => [d.id, d.label || d.id]));
    const responses = await listSurveyResponses(survey.id);
    for (const r of responses) {
      const a = r.answers ?? {};
      let overall: number | null =
        typeof a['stance_after'] === 'number' ? (a['stance_after'] as number)
        : typeof a['stance_before'] === 'number' ? (a['stance_before'] as number)
        : null;
      const dyadVals = dyads
        .map((d) => a[d.id])
        .filter((v): v is number => typeof v === 'number');
      if (overall === null && dyadVals.length) {
        overall = dyadVals.reduce((x, y) => x + y, 0) / dyadVals.length;
      }
      if (overall === null) overall = 50;
      const stance = stanceFromScore(overall);
      const themes = dyads
        .filter((d) => typeof a[d.id] === 'number' && Math.abs((a[d.id] as number) - 50) >= 18)
        .map((d) => labelById.get(d.id) as string)
        .slice(0, 4);
      const openAns = Object.entries(a)
        .filter(([k, v]) => typeof v === 'string' && k !== 'stance_before' && k !== 'stance_after')
        .map(([, v]) => String(v).trim())
        .filter(Boolean);
      const summary = openAns.length
        ? openAns.join(' · ').slice(0, 300)
        : `Anonymous survey response — overall ${Math.round(overall)}/100 (${stance}).`;
      const when = r.submittedDate ? `${r.submittedDate}T12:00:00.000Z` : new Date().toISOString();
      out.push({
        id: `survey-${r.id}`,
        campaignId,
        source: 'survey',
        sourceType: 'survey_response',
        title: `Survey response — ${title}`,
        summary,
        stance,
        themes,
        actor: 'Community survey respondent',
        citations: [],
        salience: 35,
        confidence: 0.9,
        observedAt: when,
        ingestedAt: when,
        dedupeKey: `survey:${r.id}`,
        origin: 'computed',
      });
    }
  }
  return out;
}
