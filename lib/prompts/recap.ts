import { languageName } from '@/lib/language';
import { Language, Message } from '../types';

/**
 * Recap prompt: at the close of a conversation, generate a short,
 * faithful summary of what the participant said. Read back to them
 * for confirmation before any sharing decisions.
 */
export function buildRecapPrompt(opts: {
  language: Language;
  transcript: Message[];
}): { system: string; userMessage: string } {
  const { language, transcript } = opts;
  const langName =
    languageName(language);

  const system = `You are Pythia. The conversation with this community participant is winding down. Write a short recap of what THE PARTICIPANT shared — in ${langName}, in their voice and emphasis, not yours.

Rules:
- Maximum 200 words.
- Use second person ("you said…", "you mentioned…").
- Concrete: name the specific concerns, the specific stories, the specific shared interests they raised. No abstractions.
- Faithful: only what they actually said. Do not extrapolate or infer beyond their words.
- Plain language. No analytic or academic vocabulary.
- End with one sentence inviting them to correct anything you got wrong.

Do not include any introduction or framing — just the recap text.`;

  const transcriptText = transcript
    .filter((m) => m.role !== 'system')
    .map((m) => `${m.role === 'user' ? 'Participant' : 'Pythia'}: ${m.content}`)
    .join('\n\n');

  const userMessage = `Here is the full conversation transcript. Write the recap.\n\n---\n\n${transcriptText}`;

  return { system, userMessage };
}
