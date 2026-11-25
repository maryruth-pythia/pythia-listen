/**
 * Project-specific research questions — canonical library.
 *
 * Operators pick 3–7 of these per project at setup time. The AI receives
 * the selected questions as guidance: "by the end of this conversation,
 * you should have a sense of the participant's view on the following — IF
 * they bring relevant content. Never ask in survey order, never repeat
 * verbatim, let the participant lead."
 *
 * IDs are stable; question prose can be edited without breaking project
 * records. Add new entries here over time.
 */

import type { ResearchQuestionId } from './types';

export interface ResearchQuestion {
  id: ResearchQuestionId;
  /** Operator-facing label (used in the project setup checkbox list). */
  label: string;
  /** What this question is trying to surface, in plain language. */
  description: string;
  /** Hint to the AI on how to surface this organically (story-frame, never survey-y). */
  framingHint: string;
}

export const RESEARCH_QUESTIONS: readonly ResearchQuestion[] = [
  {
    id: 'community_ask',
    label: 'What does the community most want from this project?',
    description: 'The affirmative ask — benefits, commitments, design choices the community is hoping for.',
    framingHint: "Don't ask 'what do you want from the developer.' Ask: 'If a project like this went well — really well — what would have happened?' Let them describe positive outcomes; the asks emerge from there.",
  },
  {
    id: 'community_fears',
    label: 'What does the community most fear about this project?',
    description: 'Specific harms, losses, or risks they worry about.',
    framingHint: "Don't ask 'what are your fears.' Ask: 'When you think about this project going forward, what keeps you up at night about it?' Or: 'Has anyone in the community lost something to a project like this before?'",
  },
  {
    id: 'past_project_history',
    label: 'How have past projects in this area gone — what taught them what to expect?',
    description: 'The specific past experiences that shape current views.',
    framingHint: "Story-frame: 'Tell me about a past project — energy, mining, infrastructure, anything — that came through this area. How did it go?'",
  },
  {
    id: 'who_is_trusted',
    label: 'Who in the community do they trust to deliver on commitments?',
    description: 'Names, roles, institutions, or types of people the community trusts as messengers / counterparts.',
    framingHint: "'When you've seen something like this go well, who was usually in the room making it work?' Or: 'Who in the community would you trust to hold this developer accountable?'",
  },
  {
    id: 'meaningful_engagement',
    label: 'What would meaningful engagement look like?',
    description: 'What the community is asking developers to do differently from the usual playbook.',
    framingHint: "'Has there ever been a process around land or a project that felt genuinely respectful? What made it different?' Then: 'What would change if a process like that happened here?'",
  },
  {
    id: 'shared_interests',
    label: 'Where do their interests overlap with the developer\'s?',
    description: 'Concrete points of alignment — both sides want the same thing — that often go undeclared.',
    framingHint: "Surface gently, near the end of substantive turns. Reflect what you've heard: 'It sounds like you and they might both want X — am I reading that right?' Never assume; let them confirm or refute.",
  },
  {
    id: 'information_gap',
    label: 'What information do they need but don\'t have?',
    description: "Specific facts, documents, or assessments the community wants but can't currently get.",
    framingHint: "'Is there something about this project you wish you knew, but haven't been able to find out?' Listen for hydrology studies, lease terms, financing source, anything specific.",
  },
  {
    id: 'language_culture',
    label: 'What language and cultural considerations should shape engagement?',
    description: 'Languages, cultural protocols, materials, channels.',
    framingHint: "Don't ask 'what languages do you speak' (that's demographics). Ask: 'When companies or governments come to talk to your community, what works for how they communicate? What doesn't?'",
  },
  {
    id: 'who_is_missing',
    label: 'Who is typically NOT in these conversations, and why?',
    description: 'Voices structurally excluded from current engagement processes.',
    framingHint: "'When decisions about land or resources get made in your community, who is usually in the room? Who is usually not?' Listen for names of groups, then dig into why.",
  },
  {
    id: 'design_changes',
    label: 'What specific design changes to the project would they want?',
    description: 'Concrete operational asks: re-route, resize, retime, restructure.',
    framingHint: "Only when the participant has invited engagement on the project itself: 'If you could change one thing about how this is being designed, what would it be?'",
  },
  {
    id: 'benefits_reach',
    label: 'What benefits, if any, would actually reach them?',
    description: 'Whether promised benefits — jobs, lower bills, community funds — would actually accrue to this community.',
    framingHint: "'When companies promise benefits — jobs, lower bills, community programs — do those usually reach people like you, or do they go elsewhere?' Concrete: dollars, jobs, services.",
  },
  {
    id: 'harms_anticipated',
    label: 'What harms or risks do they anticipate?',
    description: 'Specific harms — environmental, economic, cultural, health — they expect.',
    framingHint: "Don't ask 'what harms do you expect.' Ask: 'If this project went badly for your community, what would going badly look like?' Concrete language emerges.",
  },
  {
    id: 'precedent',
    label: 'What precedent — local or elsewhere — helps or hurts?',
    description: 'Examples from other projects, communities, or jurisdictions that inform their view.',
    framingHint: "'Have you seen a project like this work somewhere — anywhere? What was different about that one?'",
  },
  {
    id: 'governance_oversight',
    label: 'What governance or oversight structures do they want?',
    description: 'Boards, veto rights, review processes, community ownership stakes.',
    framingHint: "Surface only if the participant brings up control, accountability, or trust. Then: 'If your community had a real seat at the table for this project, what would that seat actually do?'",
  },
];

/** Lookup by ID. Returns undefined if not found (forwards-compatible). */
export function getResearchQuestion(
  id: ResearchQuestionId
): ResearchQuestion | undefined {
  return RESEARCH_QUESTIONS.find((q) => q.id === id);
}

/** Filter the library by selected IDs, preserving canonical order. */
export function selectedResearchQuestions(
  ids: ResearchQuestionId[] | undefined
): ResearchQuestion[] {
  if (!ids?.length) return [];
  const set = new Set(ids);
  return RESEARCH_QUESTIONS.filter((q) => set.has(q.id));
}
