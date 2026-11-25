/**
 * Top questions the community keeps asking.
 *
 * Clusters the recurring QUESTIONS embedded across a campaign's signals into a
 * short ranked list — the things people most want answered. Feeds both the
 * dashboard and the community reference page (so answers can be published where
 * the questions actually are).
 */

import { complete, MODELS } from '../claude';
import { loadCampaignSignals } from '../dashboard/signals';
import { collectNames, redactDeep } from '../redact';
import { getCampaignById } from '../campaigns';
import { relevanceLines } from './relevance';
import { selectForAnalysis } from './sampling';
import { cached, ANALYSIS_TTL_MS } from '../cache';
import type { Signal } from '../types';

export const QUESTIONS_MODEL =
  process.env.PYTHIA_QUESTIONS_MODEL ??
  process.env.PYTHIA_EXTRACT_MODEL ??
  MODELS.conversation;

const MAX_SIGNALS = 80;
const MIN_SIGNALS = 5;

export type QuestionFrequency = 'common' | 'recurring' | 'occasional';

export interface TopQuestion {
  question: string;
  frequency: QuestionFrequency;
  theme: string;
  /** Estimated number of the analyzed signals that raise this question. */
  mentions: number;
  /** Short note on why it matters / what answering it unlocks. */
  note?: string;
}

export interface QuestionAnalysis {
  campaignId: string;
  total: number;
  analyzed: number;
  questions: TopQuestion[];
  generated: boolean;
  note?: string;
  updatedAt: string;
}

function digest(signals: Signal[]): string {
  return signals
    .map((s, i) => {
      const themes = s.themes.length ? ` [${s.themes.join(', ')}]` : '';
      return `${i + 1}. <${s.stance}> ${s.title} — ${s.summary}${themes}`;
    })
    .join('\n');
}

function prompt(signals: Signal[], focus?: string, exclusions?: string): string {
  const lead = focus
    ? [
        `You are reading "signals" for a Watch whose ANALYSIS FOCUS is:`,
        focus,
        `Each signal is a distilled voice with a stance and themes. Identify the`,
        `QUESTIONS that matter most for THAT focus — the things people most want`,
        `answered (explicitly asked, or implied by a recurring worry).`,
      ]
    : [
        `You are reading community "signals" about a clean-energy siting project —`,
        `each a distilled community voice with a stance and themes. Identify the`,
        `QUESTIONS the community keeps asking: the things people most want answered`,
        `(explicitly asked, or clearly implied by a recurring worry).`,
      ];
  return [
    ...lead,
    ``,
    ...relevanceLines(exclusions),
    ``,
    `=== SIGNALS ===`,
    digest(signals),
    ``,
    `=== RETURN (JSON object only, no prose, no code fence) ===`,
    `{`,
    `  "questions": [   // 4 to 8, ranked most-asked first`,
    `    {`,
    `      "question": a clear, plain-language question in the community's`,
    `        voice (e.g. "Who pays to remove the panels in 30 years?"),`,
    `      "frequency": "common" | "recurring" | "occasional",`,
    `      "theme": one short snake_case tag (e.g. "decommissioning"),`,
    `      "note": one short clause on why answering it matters`,
    `    }`,
    `  ]`,
    `}`,
    ``,
    `Rules: base every question ONLY on the signals; do not invent concerns.`,
    `Merge near-duplicates into one. Phrase as genuine questions a resident`,
    `would ask. Output ONLY the JSON object.`,
  ].join('\n');
}

function parseObject(raw: string): Record<string, unknown> | null {
  let t = raw.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const a = t.indexOf('{');
  const b = t.lastIndexOf('}');
  if (a === -1 || b === -1 || b < a) return null;
  try {
    const p = JSON.parse(t.slice(a, b + 1));
    return p && typeof p === 'object' ? (p as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

const FREQ: QuestionFrequency[] = ['common', 'recurring', 'occasional'];

/** Cached wrapper — reuses a recent result instead of re-running the model. */
export async function computeTopQuestions(
  campaignId: string
): Promise<QuestionAnalysis> {
  return cached(
    `analysis:${campaignId}:questions:v2`, // v2: identity rule (no ethnic group as one bloc); old cached versions are ignored
    ANALYSIS_TTL_MS,
    () => _computeTopQuestions(campaignId),
    (r) => r.generated
  );
}

async function _computeTopQuestions(
  campaignId: string
): Promise<QuestionAnalysis> {
  const all = await loadCampaignSignals(campaignId, { lens: true });
  const _c = await getCampaignById(campaignId);
  const focus = _c?.analysisFocus?.trim() || undefined;
  const exclusions = _c?.exclusions?.trim() || undefined;
  const base: QuestionAnalysis = {
    campaignId,
    total: all.length,
    analyzed: 0,
    questions: [],
    generated: false,
    updatedAt: new Date().toISOString(),
  };
  if (all.length < MIN_SIGNALS) {
    return {
      ...base,
      note: `Not enough signal yet to surface recurring questions (have ${all.length}).`,
    };
  }

  const signals = selectForAnalysis(all, MAX_SIGNALS);

  let raw: string;
  try {
    raw = await complete({ values: 'analysis',
      model: QUESTIONS_MODEL,
      maxTokens: 2000,
      temperature: 0,
      messages: [{ role: 'user', content: prompt(signals, focus, exclusions) }],
    });
  } catch (e) {
    return {
      ...base,
      analyzed: signals.length,
      note: `Analysis temporarily unavailable: ${
        e instanceof Error ? e.message : String(e)
      }`,
    };
  }

  const obj = parseObject(raw);
  const rawQs = obj && Array.isArray(obj.questions) ? obj.questions : [];
  const questions: TopQuestion[] = [];
  for (const q of rawQs) {
    if (!q || typeof q !== 'object') continue;
    const r = q as Record<string, unknown>;
    const question = typeof r.question === 'string' ? r.question.trim() : '';
    if (!question) continue;
    questions.push({
      question: question.slice(0, 200),
      frequency: FREQ.includes(r.frequency as QuestionFrequency)
        ? (r.frequency as QuestionFrequency)
        : 'recurring',
      theme: typeof r.theme === 'string' ? r.theme : 'general',
      mentions: 0,
      note: typeof r.note === 'string' ? r.note : undefined,
    });
  }

  // Ground the count in real data: how many signals carry each question's
  // theme. A signal can raise several questions, so per-question counts overlap
  // (their sum can exceed the doc count) but no single count exceeds it.
  const themeCount = new Map<string, number>();
  for (const s of all) for (const t of s.themes) themeCount.set(t, (themeCount.get(t) ?? 0) + 1);
  for (const q of questions) q.mentions = Math.max(1, themeCount.get(q.theme) ?? 0);
  questions.sort((a, b) => b.mentions - a.mentions);
  return redactDeep({
    ...base,
    analyzed: signals.length,
    questions: questions.slice(0, 8),
    generated: questions.length > 0,
  }, collectNames(all));
}
