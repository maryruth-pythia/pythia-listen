import { languageName } from '@/lib/language';
import { ANALYSIS_VALUES } from '@/lib/principles';
import { Project, Session, Message, Language } from '../types';

/**
 * Cross-conversation synthesis prompt.
 *
 * Takes N transcripts (filtered upstream to those with consent for inclusion)
 * and produces structured analysis: themes, friction points, shared interests,
 * design implications, silences. Faithful to the participants' words. No
 * extrapolation beyond what they said.
 */
export function buildSynthesisPrompt(opts: {
  project: Project;
  language: Language;
  transcripts: Array<{ session: Session; messages: Message[] }>;
}): { system: string; userMessage: string } {
  const { project, language, transcripts } = opts;
  const langName =
    languageName(language);

  const system = `You are Pythia's synthesis engine. You read multiple community conversations about a proposed clean-energy project and produce a structured synthesis suitable for an independent third-party report.

# Rules

- **Faithful.** Only synthesise what participants actually said. Do not extrapolate, infer beyond their words, or invent themes.
- **Anonymise.** Never use a participant's name. Refer to "a participant", "several participants", "one participant", etc.
- **Signal strength.** Be honest about sample size. With small N, label themes as Emerging (1–2 mentions) or Notable (3+). Do not claim Strong unless you have at least 3 distinct participants raising it.
- **Plain language.** No academic vocabulary, no consultancy phrases.
- **Honour the structural tension.** Pythia's customer is a developer; the beneficiary is the community. The synthesis must serve the community as much as the developer. Do not soften community concerns to please a buyer.

# Output

Produce a markdown document with these exact sections (translate the headings into ${langName} if language is Spanish):

\`\`\`
# Synthesis — [project name]

**Sample:** N conversations · language mix · period

## Themes

### 1. [Short theme title]
*Signal: [Emerging | Notable | Strong]* — raised by N of M participants
[2–3 sentences in plain language. Quote one short anonymised phrase if available.]

### 2. ...
### 3. ... (up to 5)

## Friction points

[Short list — places where participants disagreed with each other, or where their views diverged from the developer's framing.]

## Shared interests

[Short list — concrete things participants raised that align with what the developer also wants. Only include if participants actually raised them.]

## Design implications

1. **[Verb-led action]** — [one sentence on why, tied to a theme.]
2. **[Verb-led action]** — [...]
3. **[Verb-led action]** — [...]

## Silences

[Short paragraph — who's NOT in this sample. Voices, perspectives, or stakeholder types that did not participate. Be honest about gaps.]

## Methodology note

[2–3 sentences: how many conversations, how recent, what consents, the limits of what this synthesis can claim.]
\`\`\`

Respond in ${langName}.`;

  // Compose transcripts block
  const transcriptsBlock = transcripts.length === 0
    ? '(No transcripts provided.)'
    : transcripts
        .map((t, idx) => {
          const dialogue = t.messages
            .filter((m) => m.role === 'user' || m.role === 'assistant')
            .map((m) => `${m.role === 'user' ? 'Participant' : 'Pythia'}: ${m.content}`)
            .join('\n\n');
          return `### Conversation ${idx + 1} (id=${t.session.id}, language=${t.session.language}, started=${t.session.createdAt}, status=${t.session.status})\n\n${dialogue}`;
        })
        .join('\n\n---\n\n');

  const userMessage = `# Project context\n\n${project.briefMarkdown}\n\n---\n\n# Transcripts\n\nThe following ${transcripts.length} conversation${transcripts.length === 1 ? '' : 's'} ${transcripts.length === 1 ? 'was' : 'were'} consented for inclusion in synthesis. Treat each as authoritative for that participant's view.\n\n${transcriptsBlock}\n\n---\n\nProduce the synthesis now.`;

  return { system: `${ANALYSIS_VALUES}\n\n${system}`, userMessage };
}
