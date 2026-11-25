/**
 * Civic-record collector backed by OpenRouter's web-search plugin.
 *
 * OpenRouter runs the retrieval for us and returns cited URL annotations, so
 * we get real, sourced results with no extra infrastructure. Web search works
 * with any model via the plugin, so no provider-specific tool is needed.
 *
 * The model is configurable via PYTHIA_INGEST_MODEL (an OpenRouter slug). Live
 * augmentation stays opt-in at the orchestrator level (see lib/ingest/civic.ts)
 * for cost control; without it the verified seed baseline is used.
 */

import { completeWithWebSearch, MODELS } from '../../claude';
import type {
  Collector,
  CollectionContext,
  CollectionResult,
  RawSourceItem,
} from '../types';

export const INGEST_MODEL = process.env.PYTHIA_INGEST_MODEL ?? MODELS.conversation;

/** Max web-search results to pull per ingestion pass (cost control). */
const MAX_SEARCHES = Number(process.env.PYTHIA_INGEST_MAX_SEARCHES ?? '6');

function buildPrompt(ctx: CollectionContext): string {
  const docketLine = ctx.docket
    ? `Regulatory docket / case number: ${ctx.docket}.`
    : '';
  const hintsLine = ctx.hints ? `Other context: ${ctx.hints}.` : '';
  const monitoredLine =
    ctx.monitoredUrls && ctx.monitoredUrls.length
      ? `Also specifically check these operator-designated sources this pass:\n${ctx.monitoredUrls.map((u) => `  - ${u}`).join('\n')}`
      : '';
  return [
    `You are a civic-record research assistant for a community-siting project.`,
    `Project: "${ctx.projectName}" in ${ctx.jurisdiction}.`,
    docketLine,
    hintsLine,
    monitoredLine,
    ``,
    `Search the public record for the CURRENT state of community signal and`,
    `official proceedings around this project. Prioritise, in order:`,
    `1. The regulatory docket (siting board / PUC orders, staff reports,`,
    `   intervenor filings, applications for rehearing, appeals).`,
    `2. Official government pages (siting board news, county commissioner and`,
    `   township actions, moratoriums, restricted-area designations).`,
    `3. Reputable local news covering hearings, public comments, and positions`,
    `   of named organisations (not private individuals).`,
    ``,
    `Report what you find as a factual digest. For every distinct development,`,
    `state: what happened, the date, which organisation/party, and whether it`,
    `reflects support, opposition, or a neutral/procedural posture toward the`,
    `project. Capture the substance of recurring public-comment THEMES`,
    `(e.g. farmland loss, property values, glare, drainage, tax revenue/PILOT,`,
    `decommissioning, setbacks) rather than any private individual's name.`,
    `Ground every claim in a cited source. If the record is quiet, say so.`,
  ]
    .filter(Boolean)
    .join('\n');
}

export const webSearchCollector: Collector = {
  kind: 'civic',
  async collect(ctx: CollectionContext): Promise<CollectionResult> {
    const { text, sources } = await completeWithWebSearch({
      model: INGEST_MODEL,
      maxTokens: 4096,
      maxResults: MAX_SEARCHES,
      messages: [{ role: 'user', content: buildPrompt(ctx) }],
    });

    const sourceMap = new Map<string, RawSourceItem>();
    for (const s of sources) {
      if (s.url && !sourceMap.has(s.url)) {
        sourceMap.set(s.url, { url: s.url, title: s.title });
      }
    }

    return {
      digest: text,
      sources: Array.from(sourceMap.values()),
      // OpenRouter's web plugin does not expose the individual queries it ran.
      queries: [],
      model: INGEST_MODEL,
    };
  },
};
