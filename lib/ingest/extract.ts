/**
 * Signal extraction — turns a collector's cited digest into normalized,
 * structured Signal records.
 *
 * Runs a single non-web-search Claude call that must return a strict JSON
 * array. Each extracted signal must cite at least one URL drawn from the
 * source list the collector actually consulted, so we never invent sources.
 */

import { complete, MODELS } from '../claude';
import type { SignalStance, SignalCitation } from '../types';
import type { CollectionResult, CollectionContext } from './types';
import type { Signal } from '../types';
import { redactPII, collectNames, redactText } from '../redact';

export const EXTRACT_MODEL =
  process.env.PYTHIA_EXTRACT_MODEL ?? MODELS.conversation;

/** A signal as produced by the extractor (orchestrator adds ids/provenance). */
export interface ExtractedSignal {
  sourceType: string;
  title: string;
  summary: string;
  stance: SignalStance;
  themes: string[];
  actor?: string;
  citations: SignalCitation[];
  salience?: number;
  observedAt?: string;
  confidence?: number;
}

const VALID_STANCES: SignalStance[] = [
  'opposition',
  'concern',
  'mixed',
  'support',
  'neutral',
];

function extractionPrompt(
  ctx: CollectionContext,
  collection: CollectionResult
): string {
  const sourceList = collection.sources
    .map(
      (s, i) =>
        `${i + 1}. ${s.url}${s.title ? ` — ${s.title}` : ''}${
          s.pageAge ? ` (${s.pageAge})` : ''
        }`
    )
    .join('\n');

  return [
    `You convert a civic-record research digest into structured "signals".`,
    `A signal is one distinct, citable development or recurring public-comment`,
    `theme about the project below.`,
    ``,
    `PROJECT: ${ctx.projectName} — ${ctx.jurisdiction}${
      ctx.docket ? ` (${ctx.docket})` : ''
    }`,
    ``,
    `=== RESEARCH DIGEST ===`,
    redactPII(collection.digest || '') || '(empty)',
    ``,
    `=== SOURCES CONSULTED (cite ONLY these URLs) ===`,
    sourceList || '(none)',
    ``,
    `=== YOUR TASK ===`,
    `Return a JSON array (and nothing else) of signal objects. Each object:`,
    `{`,
    `  "sourceType": one of "opsb_docket","staff_report","order","rehearing",`,
    `     "appeal","intervention","public_comment","county_action",`,
    `     "township_action","legislation","news","other";`,
    `  "title": short headline (<= 90 chars);`,
    `  "summary": 1-3 plain-language sentences a community member could read;`,
    `  "stance": one of "opposition","concern","mixed","support","neutral"`,
    `     (the posture toward the project this signal reflects);`,
    `  "themes": array of short snake_case tags, e.g.`,
    `     ["farmland","property_values","tax_revenue","glare","drainage",`,
    `      "decommissioning","setbacks","process","wildlife","jobs"];`,
    `  "actor": the organisation/party/role involved (NEVER a private`,
    `     individual's name); omit if none;`,
    `  "citations": array of { "url", "title"?, "publisher"?, "citedText"?,`,
    `     "publishedAt"? } — url MUST be one of the sources listed above;`,
    `  "salience": integer 0-100 (how prominent/consequential this is);`,
    `  "observedAt": ISO date the underlying event happened, if known;`,
    `  "confidence": 0-1 (how well-supported this is by the sources).`,
    `}`,
    ``,
    `Rules:`,
    `- Only include signals actually supported by the digest + sources.`,
    `- Every signal needs >= 1 citation whose url is in the source list.`,
    `- Never include a private individual's name in any field.`,
    `- Prefer 6-14 distinct, non-overlapping signals. If the record is empty,`,
    `  return [].`,
    `- Output ONLY the JSON array. No markdown, no commentary.`,
  ].join('\n');
}

/** Pull the first JSON array out of a model response, tolerating code fences. */
function parseJsonArray(raw: string): unknown[] {
  let text = raw.trim();
  // Strip ```json fences if present.
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end === -1 || end < start) return [];
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function coerceSignal(
  obj: Record<string, unknown>,
  allowedUrls: Set<string>
): ExtractedSignal | null {
  const title = typeof obj.title === 'string' ? obj.title.trim() : '';
  const summary = typeof obj.summary === 'string' ? obj.summary.trim() : '';
  if (!title || !summary) return null;

  const stance = VALID_STANCES.includes(obj.stance as SignalStance)
    ? (obj.stance as SignalStance)
    : 'neutral';

  const themes = Array.isArray(obj.themes)
    ? obj.themes.filter((t): t is string => typeof t === 'string').slice(0, 12)
    : [];

  const rawCitations = Array.isArray(obj.citations) ? obj.citations : [];
  const citations: SignalCitation[] = [];
  for (const c of rawCitations) {
    if (!c || typeof c !== 'object') continue;
    const cc = c as Record<string, unknown>;
    const url = typeof cc.url === 'string' ? cc.url : '';
    if (!url) continue;
    // Only keep citations that point at a source the collector consulted.
    if (allowedUrls.size > 0 && !allowedUrls.has(url)) continue;
    citations.push({
      url,
      title: typeof cc.title === 'string' ? cc.title : undefined,
      publisher: typeof cc.publisher === 'string' ? cc.publisher : undefined,
      citedText:
        typeof cc.citedText === 'string'
          ? cc.citedText.slice(0, 240)
          : undefined,
      publishedAt:
        typeof cc.publishedAt === 'string' ? cc.publishedAt : undefined,
    });
  }
  // A signal with no verifiable citation is dropped — we only keep cited data.
  if (citations.length === 0) return null;

  const salience =
    typeof obj.salience === 'number'
      ? Math.max(0, Math.min(100, Math.round(obj.salience)))
      : undefined;
  const confidence =
    typeof obj.confidence === 'number'
      ? Math.max(0, Math.min(1, obj.confidence))
      : undefined;

  return {
    sourceType:
      typeof obj.sourceType === 'string' ? obj.sourceType : 'other',
    title: title.slice(0, 120),
    summary,
    stance,
    themes,
    actor: typeof obj.actor === 'string' ? obj.actor : undefined,
    citations,
    salience,
    confidence,
    observedAt:
      typeof obj.observedAt === 'string' ? obj.observedAt : undefined,
  };
}

export async function extractSignals(
  ctx: CollectionContext,
  collection: CollectionResult
): Promise<ExtractedSignal[]> {
  if (!collection.digest && collection.sources.length === 0) return [];

  const allowedUrls = new Set(collection.sources.map((s) => s.url));
  const raw = await complete({
    model: EXTRACT_MODEL,
    maxTokens: 4096,
    temperature: 0,
    messages: [{ role: 'user', content: extractionPrompt(ctx, collection) }],
  });

  const arr = parseJsonArray(raw);
  const out: ExtractedSignal[] = [];
  for (const item of arr) {
    if (item && typeof item === 'object') {
      const sig = coerceSignal(item as Record<string, unknown>, allowedUrls);
      if (sig) out.push(sig);
    }
  }
  // Store a de-identified body: strip any name/contact PII the model echoed
  // back, so what persists (and every downstream view) inherits it.
  const names = collectNames(out as unknown as Signal[]);
  for (const sig of out) {
    sig.title = redactText(sig.title, names);
    sig.summary = redactText(sig.summary, names);
  }
  return out;
}
