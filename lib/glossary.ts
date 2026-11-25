/**
 * Plain-language definitions for the terms that show up around the operator
 * dashboard. Surfaced via the InfoTip "i" hover icon so nothing on the page is
 * jargon a first-time CBO user can't decode. Keep each definition to a sentence
 * or two, plain and non-technical.
 */

export const GLOSSARY: Record<string, string> = {
  signal:
    'One piece of community input Pythia has captured — an email, a message, a public comment, a news item, or a self-scored response. Signals are the raw units everything else is built from.',
  'signal source':
    'Where a signal came from. Pythia keeps three separate: desk research, the public civic record, and direct community listening — and never blends them into a single number.',
  'social licence':
    'How much a community actually accepts a project, on a scale from opposition to co-ownership. It’s about trust and consent, not legal permits.',
  'desk research':
    'Background material your team gathered — reports, studies, briefings. It’s context, not community opinion, so Pythia keeps it in its own bucket.',
  'civic record':
    'The public, on-the-record trail: official actions, hearing comments, filings by organized groups, and news coverage.',
  'direct listening':
    'Sentiment straight from community members — their own words and self-scored responses — rather than what officials or news report about them.',
  'self-signification':
    'The person tags their own story (what it’s about, how they feel) instead of an analyst deciding for them. It keeps the meaning in the community’s hands.',
  'meta-synthesis':
    'A cross-source read: where the public record and direct listening agree, where they pull apart, and whose voice looks under-represented.',
  origination:
    'A map of the project area showing which places the community actually talks about, sized by how much they come up and coloured by the sentiment there.',
  'issue spectrum':
    'For each issue, a marker per source showing where it sits from opposition to support — so you can see exactly where sources agree or diverge.',
  'heat map':
    'A grid of issues by source showing where each concern is loud and where it’s faint — quickly spotting what one source cares about that another misses.',
  'opinion clusters':
    'The 4–5 distinct camps within a community, rather than a simple for-vs-against split. Most communities hold several overlapping views at once.',
  consensus:
    'What a super-majority agrees on across the different camps — the shared ground a community and a developer can actually build on.',
  stance:
    'Which way a signal leans: opposition, concern, mixed, support, or neutral.',
  'trusted messenger':
    'A person or group the community already listens to — often the most effective carrier of information, whichever side they’re on.',
  coalition:
    'The web of people and organizations active around a project and how often each is mentioned — a picture of the community’s own network.',
  precedent:
    'How comparable projects elsewhere reached agreement — usually by writing the community’s concerns into enforceable commitments.',
  'engagement memory':
    'A community-owned record of who said what, and when — institutional memory that stays with the CBO and is shared only with permission.',
  campaign:
    'One thing Pythia is listening about — either a specific project (like a named solar farm) or general sentiment about a topic across an area.',
};

export function define(term: string): string | undefined {
  return GLOSSARY[term.toLowerCase()];
}
