/**
 * Conversational survey delivery (Phase C), with SAVE-AS-YOU-GO. Public
 * (allow-listed under /api/surveys/). Conducts a published survey as a warm
 * AI-led conversation grounded in the project. Every turn the model emits a
 * hidden STATE block with the running answers; we upsert a SurveyResponse each
 * turn so a partial (abandoned) conversation is still captured. Marked complete
 * once every question + signifier is covered.
 */
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { getSurvey, upsertSurveyResponse } from '@/lib/db';
import { resolveProject } from '@/lib/resolve-project';
import { complete } from '@/lib/claude';
import { getLocale } from '@/lib/locales';
import type { SurveyResponse } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface Spec {
  title: string;
  intro: string;
  closing?: string;
  signifiers: Array<{ id: string; label: string; poleLow?: string; poleHigh?: string }>;
  questions: Array<{ id: string; prompt: string }>;
}
interface Turn {
  role: 'user' | 'assistant';
  content: string;
}

function extractState(text: string): {
  clean: string;
  answers: Record<string, string | number> | null;
  complete: boolean;
} {
  const m = text.match(/<<<STATE([\s\S]*?)>>>/);
  if (!m) return { clean: text.trim(), answers: null, complete: false };
  const clean = text.replace(/<<<STATE[\s\S]*?>>>/, '').trim();
  try {
    const raw = m[1].trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
    const obj = JSON.parse(raw) as { answers?: Record<string, unknown>; complete?: unknown };
    const answers: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(obj.answers ?? {})) {
      if (typeof v === 'string' || typeof v === 'number') answers[k] = v;
    }
    return {
      clean,
      answers: Object.keys(answers).length ? answers : null,
      complete: obj.complete === true,
    };
  } catch {
    return { clean, answers: null, complete: false };
  }
}

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const survey = await getSurvey(id);
  if (!survey || survey.status !== 'published') {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  const spec = survey.spec as unknown as Spec;

  let body: { messages?: unknown; responseId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
  const messages: Turn[] = (Array.isArray(body.messages) ? body.messages : [])
    .filter(
      (m): m is Turn =>
        !!m &&
        typeof m === 'object' &&
        ((m as Turn).role === 'user' || (m as Turn).role === 'assistant') &&
        typeof (m as Turn).content === 'string'
    )
    .slice(-24);
  const responseId =
    typeof body.responseId === 'string' && body.responseId ? body.responseId : randomUUID();

  const lang = survey.languages?.[0] ?? 'en';
  const langName = getLocale(lang).label;
  const proj = await resolveProject(survey.campaignId);
  const bg = proj && proj.publicComments.length
    ? `\nBACKGROUND — sampled concerns for this project area (illustrative, NOT real survey data; never quote verbatim; use only to listen better):\n` +
      proj.publicComments.slice(0, 10).map((c) => `- ${c.text}`).join('\n')
    : '';
  const grounding = proj
    ? `This survey is for the project "${proj.name}"${proj.location ? ` (${proj.location})` : ''}.${proj.briefMarkdown ? `\n${proj.briefMarkdown}` : ''}${bg}`
    : '';

  const qList =
    spec.questions.map((q, i) => `${i + 1}. [id:${q.id}] ${q.prompt}`).join('\n') || '(none)';
  const sList =
    spec.signifiers
      .map(
        (s, i) =>
          `${i + 1}. [id:${s.id}] "${s.label}" — a 0–100 scale from "${s.poleLow ?? 'low'}" (0) to "${s.poleHigh ?? 'high'}" (100)`
      )
      .join('\n') || '(none)';

  const system = [
    `You are a warm, patient community listener conducting a short survey AS A CONVERSATION — never a rigid form.`,
    grounding,
    lang !== 'en' ? `Speak ENTIRELY in ${langName}.` : '',
    `The respondent already saw this intro: "${spec.intro}"`,
    ``,
    `Cover these OPEN questions, ONE AT A TIME, in a natural order and in the respondent's own words. Reflect briefly and probe gently for a sentence or two — never leading, never judging:`,
    qList,
    ``,
    `Also invite them to place themselves on each of these, in plain everyday language (ask for a rough 0–100, or words you convert to a number):`,
    sList,
    ``,
    `RULES: exactly ONE question per turn; warm, plain language; never lead or put words in their mouth; NEVER ask for their name or any identifying information; if they'd rather skip something, that's fine.`,
    ``,
    `AT THE END OF EVERY REPLY, append a hidden state block EXACTLY in this shape (never describe it or show its contents in your visible prose):`,
    `<<<STATE {"answers":{"a_question_id":"their words so far","a_signifier_id":72},"complete":false}>>>`,
    `In "answers" put EVERYTHING gathered so far (running, cumulative) — short text for questions, a 0–100 number for signifiers, omitting anything declined. Set "complete":true ONLY once every question and signifier is covered, or the respondent chooses to stop — and in that same reply thank them warmly${spec.closing ? ` (you may say: "${spec.closing}")` : ''}.`,
  ]
    .filter(Boolean)
    .join('\n');

  const convo: Turn[] = messages.length
    ? messages
    : [{ role: 'user', content: '(The respondent just opened the survey. Greet them warmly and ask your first question.)' }];

  try {
    const reply = await complete({ system, messages: convo, maxTokens: 700, temperature: 0.6 });
    const { clean, answers, complete: isComplete } = extractState(reply);
    if (answers) {
      const resp: SurveyResponse = {
        id: responseId,
        surveyId: survey.id,
        answers,
        submittedDate: new Date().toISOString().slice(0, 10),
      };
      await upsertSurveyResponse(resp);
    }
    return NextResponse.json({ reply: clean, done: isComplete, responseId });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
