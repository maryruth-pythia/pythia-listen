/**
 * Signifier library — canonical, reusable dyads and triads for community
 * engagement on clean-energy and energy-transition projects.
 *
 * Operators pick 4–6 of these per project at setup time. Participants
 * score themselves on the selected signifiers after the substantive
 * conversation, before the recap. Self-signification is the
 * methodological commitment (SenseMaker lineage) — the participant tags
 * their own story, not the AI.
 *
 * IDs are stable; question prose can be edited without breaking project
 * records. Add new entries here over time.
 */

export type SignifierKind = 'dyad' | 'triad';

export type SignifierId =
  // Dyads (bipolar — slider between two opposing poles)
  | 'stance'
  | 'felt_heard'
  | 'trust_developer'
  | 'trust_process'
  | 'engagement_respect'
  | 'personal_impact'
  | 'community_impact'
  | 'information_access'
  | 'time_pressure'
  | 'decision_power'
  | 'cultural_impact'
  | 'economic_impact'
  // Triads (three-pole — position inside a triangle)
  | 'project_framing'
  | 'whats_at_stake'
  | 'who_decides'
  | 'trust_grounded_in'
  | 'benefit_flows_to'
  | 'engagement_should';

export interface Dyad {
  id: SignifierId;
  kind: 'dyad';
  /** Operator-facing label. */
  label: string;
  /** Short prompt shown to the participant at signifying time. */
  prompt: string;
  /** Left pole. */
  poleLow: string;
  /** Right pole. */
  poleHigh: string;
  /** Optional voice-mode prompt the AI uses to elicit the position. */
  voicePrompt: string;
}

export interface Triad {
  id: SignifierId;
  kind: 'triad';
  /** Operator-facing label. */
  label: string;
  /** Short prompt shown to the participant. */
  prompt: string;
  /** The three poles, in order: A (top), B (bottom-right), C (bottom-left). */
  poles: [string, string, string];
  /** Voice-mode prompt the AI uses to elicit position via ranking. */
  voicePrompt: string;
}

export type Signifier = Dyad | Triad;

export const SIGNIFIERS: readonly Signifier[] = [
  // ---- Dyads ----
  {
    id: 'stance',
    kind: 'dyad',
    label: 'Overall stance on the project',
    prompt: 'Where would you place yourself on this project, overall?',
    poleLow: 'Strongly opposed',
    poleHigh: 'Strongly supportive',
    voicePrompt:
      'Overall on this project, would you say you are more on the opposed side or the supportive side — or somewhere in between?',
  },
  {
    id: 'felt_heard',
    kind: 'dyad',
    label: 'Felt heard in past engagement',
    prompt: 'When you think about past consultations in your area, how heard did people feel?',
    poleLow: 'Not heard at all',
    poleHigh: 'Genuinely heard',
    voicePrompt:
      'Thinking about past consultations in your area, would you say people felt mostly not heard at all, or genuinely heard, or somewhere in between?',
  },
  {
    id: 'trust_developer',
    kind: 'dyad',
    label: 'Trust in the developer',
    prompt: 'How much do you trust the company proposing this project?',
    poleLow: 'No trust',
    poleHigh: 'Full trust',
    voicePrompt:
      'How much do you trust the company proposing this project — no trust, full trust, or somewhere in between?',
  },
  {
    id: 'trust_process',
    kind: 'dyad',
    label: 'Trust in the process',
    prompt: 'How much do you trust the formal review and permitting process for this kind of project?',
    poleLow: 'No trust',
    poleHigh: 'Full trust',
    voicePrompt:
      'How much do you trust the formal review process — public hearings, permitting, environmental review — to handle this project well?',
  },
  {
    id: 'engagement_respect',
    kind: 'dyad',
    label: 'How engagement has felt',
    prompt: 'How has the engagement on this project felt so far?',
    poleLow: 'Coercive / extractive',
    poleHigh: 'Respectful',
    voicePrompt:
      'How has the engagement felt so far — more coercive or more respectful, or somewhere in between?',
  },
  {
    id: 'personal_impact',
    kind: 'dyad',
    label: 'Expected personal impact',
    prompt: 'How do you expect this project to affect you personally?',
    poleLow: 'Strongly negative',
    poleHigh: 'Strongly positive',
    voicePrompt:
      'For you personally — do you expect this project to be more negative, more positive, or somewhere in between?',
  },
  {
    id: 'community_impact',
    kind: 'dyad',
    label: 'Expected community impact',
    prompt: 'How do you expect this project to affect your community overall?',
    poleLow: 'Strongly negative',
    poleHigh: 'Strongly positive',
    voicePrompt:
      'For your community overall — do you expect this project to be more negative, more positive, or somewhere in between?',
  },
  {
    id: 'information_access',
    kind: 'dyad',
    label: 'Access to information',
    prompt: 'How much of what you need to know about this project can you actually find out?',
    poleLow: 'Nothing — totally blocked',
    poleHigh: 'Everything I need',
    voicePrompt:
      'About this project — would you say you can find out everything you need to know, almost nothing, or somewhere in between?',
  },
  {
    id: 'time_pressure',
    kind: 'dyad',
    label: 'Pace of engagement',
    prompt: 'How does the pace of engagement feel?',
    poleLow: 'Far too rushed',
    poleHigh: 'Right pace',
    voicePrompt:
      'How does the pace feel — far too rushed, about right, or somewhere in between?',
  },
  {
    id: 'decision_power',
    kind: 'dyad',
    label: 'Decision power',
    prompt: 'How much real say does your community have over what happens with this project?',
    poleLow: 'None at all',
    poleHigh: 'Meaningful say',
    voicePrompt:
      'How much real say does your community have over what happens here — none at all, meaningful say, or somewhere in between?',
  },
  {
    id: 'cultural_impact',
    kind: 'dyad',
    label: 'Cultural / place impact',
    prompt: 'How concerned are you about cultural sites, sacred places, or the integrity of the land?',
    poleLow: 'Very concerned',
    poleHigh: 'Not concerned',
    voicePrompt:
      'How concerned are you about cultural sites, sacred places, or the land itself — very concerned, not at all, or somewhere in between?',
  },
  {
    id: 'economic_impact',
    kind: 'dyad',
    label: 'Economic impact',
    prompt: 'How do you expect this project to affect the local economy?',
    poleLow: 'Strongly negative',
    poleHigh: 'Strongly positive',
    voicePrompt:
      'For the local economy — do you expect this project to be more negative, more positive, or somewhere in between?',
  },

  // ---- Triads ----
  {
    id: 'project_framing',
    kind: 'triad',
    label: 'How the project gets framed',
    prompt: 'How would you describe this project, between these three framings?',
    poles: ['Necessary', 'Wanted by us', 'Imposed on us'],
    voicePrompt:
      'I want to ask about three ways people describe this kind of project: it can feel Necessary, it can feel Wanted by the community, or it can feel Imposed on the community. Which of those is closest to how YOU see this project? And of the other two, which is second-closest?',
  },
  {
    id: 'whats_at_stake',
    kind: 'triad',
    label: 'What is most at stake',
    prompt: 'When you think about what this project puts at stake, what matters most?',
    poles: ['Land', 'Livelihood', 'Identity'],
    voicePrompt:
      'When you think about what this project puts at stake for your community — is it most about the Land, about Livelihood, or about Identity? And which of the other two is second?',
  },
  {
    id: 'who_decides',
    kind: 'triad',
    label: 'Who should hold decision power',
    prompt: 'Who should have the most say over what happens?',
    poles: ['The community', 'The developer', 'The government'],
    voicePrompt:
      'On who should have the most say over what happens — is it the Community, the Developer, or the Government? Which is closest to your view, and which is second?',
  },
  {
    id: 'trust_grounded_in',
    kind: 'triad',
    label: 'Where trust is grounded',
    prompt: 'When you trust (or don\'t trust) someone on a project like this, what does it come down to?',
    poles: ['The people involved', 'The process used', 'The outcomes delivered'],
    voicePrompt:
      'When you trust or don\'t trust someone on a project like this — is it mostly about the People involved, the Process they use, or the Outcomes they deliver? Which is most important to you, and which is second?',
  },
  {
    id: 'benefit_flows_to',
    kind: 'triad',
    label: 'Where benefits will flow',
    prompt: 'If this project is built, who do you think will actually benefit?',
    poles: ['This community', 'Other communities', 'Shareholders'],
    voicePrompt:
      'If this project is built, who do you think will actually benefit — This community, Other communities far away, or Shareholders and investors? Which is most likely, and which is second?',
  },
  {
    id: 'engagement_should',
    kind: 'triad',
    label: 'What engagement should primarily do',
    prompt: 'What\'s the most important thing community engagement should do?',
    poles: ['Educate the community', 'Listen to the community', 'Let the community decide'],
    voicePrompt:
      'In your view, what should community engagement most do — Educate the community, Listen to the community, or Let the community decide? Which is closest to your view, and which is second?',
  },
];

/** Lookup by ID. */
export function getSignifier(id: SignifierId): Signifier | undefined {
  return SIGNIFIERS.find((s) => s.id === id);
}

/** Filter the library by selected IDs, preserving canonical order. */
export function selectedSignifiers(ids: SignifierId[] | undefined): Signifier[] {
  if (!ids?.length) return [];
  const set = new Set(ids);
  return SIGNIFIERS.filter((s) => set.has(s.id));
}

/** A single participant's response to one signifier. */
export interface SignifierResponse {
  signifierId: SignifierId;
  /** For dyads: 0–100 representing position on the slider (0 = poleLow, 100 = poleHigh). */
  dyadValue?: number;
  /**
   * For triads: barycentric coordinates (a, b, c) where each is 0–1 and they sum to 1.
   * a = weight on poles[0] (top), b = weight on poles[1] (bottom-right), c = weight on poles[2] (bottom-left).
   */
  triadCoords?: { a: number; b: number; c: number };
  /** Captured via screen-mode or voice-mode. */
  capturedVia: 'screen' | 'voice';
  /** Optional free-text the participant added (some flows allow a brief note). */
  note?: string;
  capturedAt: string;
}
