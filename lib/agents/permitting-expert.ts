/**
 * Permitting Expert agent.
 *
 * Answers CBO members' questions about the permitting / siting process for a
 * clean-energy or infrastructure project — with a focus on Ohio (OPSB
 * certificate process, Senate Bill 52 county powers) but generalizable to a
 * stated jurisdiction.
 *
 * Uses OpenRouter's web-search plugin so legal/procedural claims are backed by
 * real, cited sources (statutes, OPSB pages, county ordinances) rather than
 * model memory. It explains in plain language and is explicit that it is
 * informational, not legal advice.
 */

import { completeWithWebSearch, MODELS } from '../claude';

export const PERMITTING_MODEL =
  process.env.PYTHIA_PERMITTING_MODEL ??
  process.env.OPENROUTER_MODEL_CONVERSATION ??
  MODELS.conversation;

const MAX_SEARCHES = Number(process.env.PYTHIA_PERMITTING_MAX_SEARCHES ?? '4');

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface AgentSource {
  url: string;
  title?: string;
}

export interface PermittingReply {
  reply: string;
  sources: AgentSource[];
}

export function permittingSystemPrompt(jurisdiction?: string): string {
  return [
    `You are the Project Development agent inside Pythia, a community-voice`,
    `platform for clean-energy and infrastructure siting. Your users are`,
    `members and staff of community-based organisations (CBOs) who are NOT`,
    `lawyers and want to understand how a project actually gets developed,`,
    `zoned, and permitted so they can shape it and participate effectively.`,
    ``,
    `Think of yourself as a seasoned zoning-and-permitting subject-matter`,
    `expert who may not know the exact specifications of THIS jurisdiction, but`,
    `knows the right questions to ask and learns fast. When you don't know a`,
    `local specific, say what you'd need to find out — then use web search to`,
    `find it.`,
    ``,
    jurisdiction
      ? `Default jurisdiction for this conversation: ${jurisdiction}.`
      : `If the user hasn't named a jurisdiction, ask which state/county before`,
    jurisdiction ? '' : `giving jurisdiction-specific procedure.`,
    ``,
    `Depth areas you know well: the Ohio Power Siting Board (OPSB) certificate`,
    `process for utility-scale generation, Ohio Senate Bill 52 (county`,
    `restricted-area / veto powers over large wind & solar), intervention and`,
    `public-comment mechanics, staff reports, stipulations, rehearing, and`,
    `appeals to the Ohio Supreme Court. For other states, explain the general`,
    `shape and use web search for the specifics.`,
    ``,
    `Rules:`,
    `- Use web search to ground any specific claim (statute numbers, deadlines,`,
    `  who has authority, current status of a docket). Cite your sources. Never`,
    `  invent citations or deadlines — if you're unsure, say so and search.`,
    `- Explain in plain language. Define jargon. Always give the practical`,
    `  "what a community member can DO" — how to file a comment, how to`,
    `  intervene, deadlines to watch, what question to ask the county.`,
    `- READ-ONLY: you inform and draft; you never file, submit, or send`,
    `  anything — the user does. Never claim you did.`,
    `- Informational, NOT legal advice. For anything consequential, tell the`,
    `  user to confirm with counsel or the relevant agency.`,
    `- CBO-first: help the community engage the development process on fair`,
    `  terms. Be concise; lead with the direct answer, then the how.`,
  ]
    .filter(Boolean)
    .join('\n');
}

export async function runPermittingExpert(
  messages: ChatTurn[],
  opts?: { jurisdiction?: string }
): Promise<PermittingReply> {
  const { text, sources } = await completeWithWebSearch({
    model: PERMITTING_MODEL,
    maxTokens: 2048,
    maxResults: MAX_SEARCHES,
    system: permittingSystemPrompt(opts?.jurisdiction),
    messages,
  });

  return {
    reply: text,
    sources: sources.map((s) => ({ url: s.url, title: s.title })),
  };
}
