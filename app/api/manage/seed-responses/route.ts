import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { getSurvey, listSurveyResponses, appendSurveyResponse } from '@/lib/db';
import type { SurveyResponse } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Operator-only demo helper (gated by the site password wall — lives under
 * /api/manage/*, NOT in the public /api/surveys allowlist).
 *
 * Generates realistic ANONYMOUS responses for a published survey so the
 * survey-sourced sections (agree/disagree) can be demonstrated with real
 * numbers. Respects the anonymity contract: no identity, no IP, coarse
 * submittedDate only. This is seed/demo data, clearly not real people.
 */

type Spec = {
  signifiers?: Array<{ id: string; kind: 'dyad' | 'triad'; corners?: string[] }>;
  questions?: Array<{ id: string; kind: 'open' | 'choice'; choices?: string[]; prompt?: string }>;
  prePostSentiment?: boolean;
};

// Deterministic per-id offset so different dyads don't all read identically.
function hashOffset(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return ((Math.abs(h) % 31) - 15); // -15..+15
}

// Gaussian-ish noise via central limit of a few uniforms.
function noise(scale: number): number {
  let s = 0;
  for (let i = 0; i < 4; i++) s += Math.random();
  return ((s / 4) - 0.5) * 2 * scale;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

// A small pool of short, plausible open-ended lines (demo only).
const OPEN_LINES = [
  'I want to see the details before I decide.',
  'My biggest worry is what happens at the end of the project.',
  'If the community actually benefits, I could support it.',
  'Nobody asked us before this got this far.',
  'The land matters to my family — that comes first.',
  'Show me the plan for jobs and I will listen.',
  'I trust it more if the commitments are in writing.',
  'It depends on drainage and traffic during construction.',
  'I like the idea but not the location.',
  'We need the tax revenue for our schools.',
  'Too many unknowns for me right now.',
  'As long as they clean up after, I am okay with it.',
];

function pickDated(daysBack: number): string {
  // Coarse date only, spread over the past `daysBack` days.
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysBack));
  return d.toISOString().slice(0, 10);
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
  const b = (body ?? {}) as { surveyId?: unknown; count?: unknown; daysBack?: unknown };
  const surveyId = typeof b.surveyId === 'string' ? b.surveyId : '';
  if (!surveyId) return NextResponse.json({ error: 'surveyId required' }, { status: 400 });

  const survey = await getSurvey(surveyId);
  if (!survey) return NextResponse.json({ error: 'survey not found' }, { status: 404 });

  const count = clamp(typeof b.count === 'number' ? b.count : 50, 1, 400);
  const daysBack = clamp(typeof b.daysBack === 'number' ? b.daysBack : 45, 1, 365);
  const spec = (survey.spec ?? {}) as Spec;
  const dyads = (spec.signifiers ?? []).filter((s) => s.kind === 'dyad');
  const triads = (spec.signifiers ?? []).filter((s) => s.kind === 'triad');
  const questions = spec.questions ?? [];

  // "Contested" latent-disposition mixture: a supportive-leaning camp, an
  // opposed-leaning camp, and a genuinely-mixed middle. Higher d => more
  // supportive / more agreement with the high pole.
  function drawDisposition(): number {
    const r = Math.random();
    if (r < 0.4) return clamp(0.66 + noise(0.14), 0, 1); // conditional supporters
    if (r < 0.72) return clamp(0.32 + noise(0.14), 0, 1); // skeptics / opposed
    return clamp(0.5 + noise(0.2), 0, 1); // genuinely mixed
  }

  const made: SurveyResponse[] = [];
  for (let i = 0; i < count; i++) {
    const d = drawDisposition();
    const answers: Record<string, string | number> = {};

    if (spec.prePostSentiment) {
      const before = clamp(Math.round(100 * d + noise(10)), 0, 100);
      // Engagement nudges sentiment up a touch on average, with spread.
      const after = clamp(Math.round(before + 4 + noise(9)), 0, 100);
      answers['stance_before'] = before;
      answers['stance_after'] = after;
    }

    for (const dy of dyads) {
      const v = clamp(Math.round(100 * d + hashOffset(dy.id) + noise(11)), 0, 100);
      answers[dy.id] = v;
    }
    for (const tr of triads) {
      const corners = tr.corners ?? [];
      if (corners.length) answers[tr.id] = corners[Math.floor(Math.random() * corners.length)];
    }
    for (const q of questions) {
      if (q.kind === 'choice' && q.choices?.length) {
        // If choices look like an agree scale, weight by disposition; else uniform.
        const n = q.choices.length;
        const idx = clamp(Math.floor((1 - d) * n + noise(0.8)), 0, n - 1);
        answers[q.id] = q.choices[idx];
      } else if (q.kind === 'open') {
        // ~70% leave a line; the rest skip (realistic).
        if (Math.random() < 0.7) {
          answers[q.id] = OPEN_LINES[Math.floor(Math.random() * OPEN_LINES.length)];
        }
      }
    }

    made.push({
      id: randomUUID(),
      surveyId: survey.id,
      answers,
      submittedDate: pickDated(daysBack),
    });
  }

  try {
    for (const r of made) await appendSurveyResponse(r);
    const total = (await listSurveyResponses(survey.id)).length;
    return NextResponse.json({ ok: true, seeded: made.length, totalNow: total });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `seed failed: ${message}` }, { status: 500 });
  }
}
