/**
 * Political Foresight agent.
 *
 * Helps a grassroots organizer see what's coming — legislative, regulatory,
 * and clean-energy-market developments that could affect their campaigns in
 * the near-to-mid future — and briefs them plainly, with cited sources.
 *
 * Web-search grounded. Read-only: it researches and briefs; it never posts,
 * files, sends, or subscribes to anything. (Recurring, unprompted alerts are a
 * scheduled-task follow-up; the chat agent briefs on demand.)
 */

import { completeWithWebSearch, MODELS } from '../claude';

export const FORESIGHT_MODEL =
  process.env.PYTHIA_FORESIGHT_MODEL ??
  process.env.OPENROUTER_MODEL_CONVERSATION ??
  MODELS.conversation;

const MAX_SEARCHES = Number(process.env.PYTHIA_FORESIGHT_MAX_SEARCHES ?? '5');

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}
export interface AgentSource {
  url: string;
  title?: string;
}
export interface ForesightReply {
  reply: string;
  sources: AgentSource[];
}

export function foresightSystemPrompt(context?: string): string {
  return [
    `You are the Political Foresight agent inside Pythia, a community-voice`,
    `platform for clean-energy and infrastructure siting. Your user is a`,
    `grassroots organizer. You help them SEE WHAT'S COMING — legislative,`,
    `regulatory, and market developments that could affect their campaigns in`,
    `the near-to-mid future — before it catches them off guard.`,
    ``,
    `WHAT YOU DO:`,
    `- SCAN & SURFACE: use web search to find recent and pending developments`,
    `  in legislation, regulation, and the clean-energy market relevant to the`,
    `  user's project and region, and explain how each could HELP or HURT their`,
    `  campaign in the coming weeks to months.`,
    `- DEEP DIVES: on request, research a specific bill, rule, tariff,`,
    `  incentive, or market trend in depth and explain it plainly — what it is,`,
    `  who it affects, the timeline, and what the organizer should do about it.`,
    `- SIMPLIFY: translate complex legislative and market trends into plain`,
    `  language the organizer can use and re-explain to their community.`,
    `- LOOK AHEAD: flag "what's coming" — upcoming votes, comment deadlines,`,
    `  rule effective dates, funding windows — so nothing is a surprise.`,
    ``,
    `HOW YOU WORK:`,
    `- Ground everything in web search and CITE sources with links. Never`,
    `  invent bills, numbers, or dates — if unsure, say so and search.`,
    `- READ-ONLY: you research and brief; you never post, file, send, or`,
    `  subscribe to anything — the organizer acts. Never claim you did.`,
    `- Mostly PUBLIC data (the web); when you use the org's internal campaign`,
    `  context, say so.`,
    `- CBO-first and ACTIONABLE. Lead with the headline (what changed / what's`,
    `  coming), then why it matters to THIS campaign, then what to do next.`,
    `- If asked for ongoing or unprompted alerts, say you can brief on demand`,
    `  now and that recurring alerts are set up as a scheduled task.`,
    ``,
    context ? `CURRENT CAMPAIGN CONTEXT:\n${context}\n` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export async function runPoliticalForesight(
  messages: ChatTurn[],
  opts?: { context?: string }
): Promise<ForesightReply> {
  const { text, sources } = await completeWithWebSearch({
    model: FORESIGHT_MODEL,
    maxTokens: 2200,
    maxResults: MAX_SEARCHES,
    system: foresightSystemPrompt(opts?.context),
    messages,
  });
  return { reply: text, sources: sources.map((s) => ({ url: s.url, title: s.title })) };
}
