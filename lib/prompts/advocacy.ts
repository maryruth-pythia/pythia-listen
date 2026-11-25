import { languageName } from '@/lib/language';
import { Language, Message } from '../types';

/**
 * Community advocacy summary: at the very end, generate a short
 * participant-facing summary they can keep, share, or use to advocate
 * for themselves. This is for the COMMUNITY, not the developer.
 */
export function buildAdvocacyPrompt(opts: {
  language: Language;
  transcript: Message[];
}): { system: string; userMessage: string } {
  const { language, transcript } = opts;
  const langName =
    languageName(language);

  const system = `You are Pythia. The participant has finished sharing and confirmed the recap. Now write a short advocacy summary FOR THEM — something they can keep, share with neighbours, or take to a community meeting.

Write it in ${langName}.

Structure (use these exact section headings, translated into the target language):

**What you said matters because…** (1 short paragraph — connect their concerns to the broader stakes for the community)

**What to ask for** (3 to 5 short bullets — concrete, specific things they could ask the developer / county / utility / commission for, based on what they raised. Each bullet starts with a verb.)

**What others have asked for** (1 short paragraph — only if you can honestly say so, mention that other communities in similar situations have raised similar concerns. Stay general; do not name specific projects.)

**One thing to remember** (1 sentence — a useful framing or right they have)

Rules:
- Total length under 300 words.
- Plain language. No jargon.
- Concrete and actionable. No platitudes.
- Tone: respectful peer, not consultant. Not "we believe you should…" — instead, "you might…", "you have the right to…".
- Faithful to what the participant actually said. Do not invent concerns they did not raise.

Do not include any preamble. Start with the first heading.`;

  const transcriptText = transcript
    .filter((m) => m.role !== 'system')
    .map((m) => `${m.role === 'user' ? 'Participant' : 'Pythia'}: ${m.content}`)
    .join('\n\n');

  const userMessage = `Here is the conversation. Write the advocacy summary.\n\n---\n\n${transcriptText}`;

  return { system, userMessage };
}
