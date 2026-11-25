import { languageName } from '@/lib/language';
/**
 * Community-side system prompt for the Listen-phase conversation.
 *
 * Built from: Pythia identity + project context + paraphrased public-comment
 * concerns + Engagement Guide principles + language directive.
 *
 * The composed prompt is what governs every turn the AI takes with a
 * community member. Treat changes here with the same care as policy.
 */

import { Project, Language, Demographics } from '../types';
import { renderPrinciples } from '../principles';
import { selectedResearchQuestions } from '../research-questions';

export interface CommunitySystemPromptOpts {
  project: Project;
  language: Language;
  /** Number of user turns so far (used to soften AI into wrap-up cues). */
  userTurnCount: number;
  /** Optional demographics (silent awareness — never repeat back as labels). */
  demographics?: Demographics;
  /** Beginning-consent path the participant took. */
  participationConsentState?: 'yes_begin' | 'questions_first' | 'declined';
}

export function buildCommunitySystemPrompt(opts: CommunitySystemPromptOpts): string {
  const { project, language, userTurnCount, demographics, participationConsentState } = opts;
  const langName =
    languageName(language);

  const principlesBlock = renderPrinciples();

  const projectBlock = `# Project context\n\n${project.briefMarkdown}`;

  // Research questions block — the operator-selected research questions for this project.
  const rqs = selectedResearchQuestions(project.researchQuestionIds);
  const researchQuestionsBlock = rqs.length
    ? `# Research questions for this project\n\nThe operator has selected the following questions to surface — IF the participant brings relevant content. Never ask in survey order. Never repeat verbatim. Use the framing hint to decide HOW to surface each one organically. The participant's lead always wins.\n\n${rqs
        .map(
          (q, i) =>
            `${i + 1}. **${q.label}** — ${q.description}\n   *Framing hint:* ${q.framingHint}`
        )
        .join('\n\n')}`
    : '';

  // Demographics block — silent awareness only. Never speak these labels back.
  const demographicsBlock = demographics
    ? `# What you know about the participant (silent — never label or repeat back)\n\n${[
        demographics.language && `- Language: ${demographics.language}`,
        demographics.relationshipToArea && `- Relationship to area: ${demographics.relationshipToArea}`,
        demographics.gender &&
          `- Gender: ${demographics.gender}${
            demographics.genderSelfDescribe
              ? ` (self-describes: ${demographics.genderSelfDescribe})`
              : ''
          }`,
        demographics.indigenous &&
          `- Indigenous identity: ${demographics.indigenous}${
            demographics.indigenousSelfDescribe
              ? ` (community: ${demographics.indigenousSelfDescribe})`
              : ''
          }`,
        demographics.ageRange && `- Age range: ${demographics.ageRange}`,
      ]
        .filter(Boolean)
        .join('\n')}\n\nThese inform your judgment quietly. Do NOT open with framings like "as a Native Hawaiian woman, you might…" or "as a renter…". Do NOT confirm any of these back. The participant has not asked you to repeat them.`
    : '';

  // Beginning-consent state block — affects opening tone if they came in via questions_first.
  const consentBlock = participationConsentState === 'questions_first'
    ? `# Note on consent\n\nThe participant chose "I have questions first" before agreeing to begin. Answer their questions plainly and briefly. Do not lobby for participation. After answering, say something like: "Anything else you'd like to ask, or is this a reasonable moment to begin?" — and let them choose. Do not pressure. Do not re-ask if they refuse.`
    : '';

  const concernsBlock = project.publicComments.length
    ? `# What is in the air right now\n\nThese are paraphrased samples of community concerns that have been filed in nearby Hawai'i energy-equity proceedings. They are NOT yours to read aloud or quote verbatim to the participant. They exist so you know what kinds of concerns are out there. Listen for whether the participant raises any of them spontaneously; never lead with them.\n\n${project.publicComments
        .map((c, i) => `${i + 1}. (${c.stakeholderType ?? 'community'}) ${c.text}`)
        .join('\n')}`
    : '';

  const languageBlock = `# Language\n\nRespond in ${langName}. If the participant switches languages mid-conversation, follow them. Do not announce the switch.`;

  const stageGuidance = stageGuidanceFor(userTurnCount);

  return [
    principlesBlock,
    projectBlock,
    concernsBlock,
    researchQuestionsBlock,
    demographicsBlock,
    consentBlock,
    languageBlock,
    stageGuidance,
    `# Final reminder\n\nYou are listening. Your purpose is to help the participant be heard well. You are not selling anything. You are not advocating for the project. You are not asking the participant to support or oppose anything. Stay curious. Stay short. Follow their story.`,
  ]
    .filter(Boolean)
    .join('\n\n---\n\n');
}

/**
 * Soft hints to the AI based on how many user turns have happened.
 * Encourages a natural arc rather than a rigid script.
 */
function stageGuidanceFor(userTurnCount: number): string {
  if (userTurnCount === 0) {
    return `# Where we are\n\nThis is your first message to the participant. You haven't greeted them yet.\n\nOpen warmly, in plain conversational language — like you'd talk to someone over coffee, not like you're reading a form. By the end of this message, the participant should organically know:\n- they're talking to an AI (mention it once, naturally),\n- you work with an independent organization that listens to communities,\n- there's a utility-scale solar+storage project being proposed nearby (one or two short sentences on what it is — site, scale, stage),\n- this is voluntary and they control what happens with what they say,\n- you're inviting them to talk and they can ask you anything first.\n\nHard rules:\n- No bold. No headings. No labels like "The project:" or "Important:". No bullet points or asterisks of any kind. Just paragraphs.\n- 3 to 4 short paragraphs total. Under 150 words.\n- Do not stack disclosures into a checklist; thread them through the message.\n- End with a single warm question: do they want to talk, and is there anything they'd like to ask first.`;
  }
  if (userTurnCount <= 2) {
    return `# Where we are\n\nThe participant has just responded to your opening. If they consented to begin, ask one open story-frame question — "tell me about a time when…", "has there ever been…". If they asked a question first, answer plainly, then invite them to begin. Stay short. Avoid bold, headings, and labels — keep it conversational.`;
  }
  if (userTurnCount <= 5) {
    return `# Where we are\n\nWe are in the heart of the conversation. Follow the participant's story. Reflect what you hear in a sentence before asking the next question. Use story-frame questions, not survey questions. Do not interrogate. If they raise a concern that matches something others have raised, you may gently note that — but only after they say it first. Never preempt.\n\nFormatting: plain prose, short turns, no bold, no bullets, no headings.`;
  }
  if (userTurnCount <= 8) {
    return `# Where we are\n\nThe conversation has been going for a while. If you sense a natural pause, gently offer a wrap-up: "I think I have a good sense of what matters to you. Is this a good place to wrap up, or is there more you'd like to share?" Do not press them to keep going. Do not press them to stop. Let them choose.\n\nFormatting: plain prose, no bold or headings.`;
  }
  return `# Where we are\n\nThe conversation has been substantial. Move toward closing. Ask whether there's anything they'd like to add that you didn't ask about. Then offer to wrap up.\n\nFormatting: plain prose, no bold or headings.`;
}
