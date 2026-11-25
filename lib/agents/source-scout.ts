/**
 * Source Scout — suggests civic-record sources to monitor for a campaign.
 *
 * Given a project + jurisdiction, it uses OpenRouter's web-search plugin to
 * find the specific local sources worth watching (local news outlets,
 * county/township government pages, the regulatory docket, organized
 * support/opposition groups). The operator then approves or declines each one;
 * approved sources are stored as monitored sources and fed into civic ingestion.
 */

import { completeWithWebSearch, MODELS } from '../claude';

export const SCOUT_MODEL =
  process.env.PYTHIA_INGEST_MODEL ??
  process.env.OPENROUTER_MODEL_CONVERSATION ??
  MODELS.conversation;

export interface SuggestedSource {
  url: string;
  label: string;
  rationale: string;
}

function prompt(projectName: string, jurisdiction: string, docket?: string) {
  return [
    `Find the best public sources to MONITOR for community signal on this`,
    `clean-energy or infrastructure siting project:`,
    `Project: ${projectName}`,
    `Jurisdiction: ${jurisdiction}`,
    docket ? `Regulatory docket: ${docket}` : '',
    ``,
    `Search the web and identify 6-10 specific, real sources worth watching:`,
    `local news outlets covering it, the county and township government pages,`,
    `the siting-board/PUC docket page, and any organized support or opposition`,
    `groups. Prefer specific pages/sections over site homepages.`,
    ``,
    `When done, output ONLY a JSON array (in a \`\`\`json code block) of:`,
    `[{ "url": "https://…", "label": "short name", "rationale": "one line on`,
    `   why it's worth monitoring" }]`,
    `Use only real URLs you found. No commentary outside the JSON.`,
  ]
    .filter(Boolean)
    .join('\n');
}

function parseSuggestions(text: string): SuggestedSource[] {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const start = t.indexOf('[');
  const end = t.lastIndexOf(']');
  if (start === -1 || end === -1) return [];
  try {
    const arr = JSON.parse(t.slice(start, end + 1));
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((s) => s && typeof s === 'object')
      .map((s: Record<string, unknown>) => ({
        url: typeof s.url === 'string' ? s.url : '',
        label: typeof s.label === 'string' ? s.label : '',
        rationale: typeof s.rationale === 'string' ? s.rationale : '',
      }))
      .filter((s) => s.url.startsWith('http'));
  } catch {
    return [];
  }
}

export async function suggestSources(
  projectName: string,
  jurisdiction: string,
  docket?: string
): Promise<SuggestedSource[]> {
  const { text } = await completeWithWebSearch({
    model: SCOUT_MODEL,
    maxTokens: 2048,
    maxResults: 5,
    messages: [
      { role: 'user', content: prompt(projectName, jurisdiction, docket) },
    ],
  });
  return parseSuggestions(text);
}
