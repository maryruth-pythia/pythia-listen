/**
 * Shared types for Pythia Listen.
 *
 * Storage is currently file-based JSON. The shape of these types is the same
 * shape we want in Postgres / Supabase later, so the swap is a single-file
 * change in lib/db.ts.
 */

export type Language = 'en' | 'es' | 'tl' | 'pt' | 'hi';

export type SessionStatus = 'active' | 'recap' | 'consented' | 'closed';

/**
 * Identification preference at the sharing-consent gate.
 *
 * We never ask for participant names anywhere in the app, so the options
 * here describe how a participant wants to appear in any output that's
 * shared per their consent — not which names to redact.
 *
 * - 'anonymous': appear as "a community participant" in any report.
 * - 'self_described': appear with the participant's own self-chosen
 *   identifier (a name, a pseudonym, a role, "a renter near the site",
 *   whatever they choose to type into `identificationDescription`).
 */
export type IdentificationPreference = 'anonymous' | 'self_described';

/**
 * Beginning-of-conversation consent: did the participant agree to begin?
 * Distinct from end-of-conversation sharing consent.
 */
export type ParticipationConsentState =
  | 'yes_begin'
  | 'questions_first'
  | 'declined';

/**
 * Demographic capture, all fields optional. Stored on the session.
 * Used for synthesis disaggregation; never repeated back to the participant.
 */
export interface Demographics {
  language?: Language | 'olelo' | 'other';
  relationshipToArea?:
    | 'lives_immediate'
    | 'lives_nearby'
    | 'works_or_business'
    | 'family_or_land'
    | 'visiting'
    | 'other'
    | 'prefer_not_to_say';
  gender?:
    | 'woman'
    | 'man'
    | 'nonbinary'
    | 'two_spirit'
    | 'genderqueer'
    | 'trans_woman'
    | 'trans_man'
    | 'self_describe'
    | 'prefer_not_to_say';
  /** Optional self-describe text when gender = 'self_describe'. */
  genderSelfDescribe?: string;
  indigenous?: 'yes' | 'no' | 'prefer_not_to_say';
  /** Optional self-describe text when indigenous = 'yes'. */
  indigenousSelfDescribe?: string;
  ageRange?: '18_24' | '25_34' | '35_49' | '50_64' | '65_plus' | 'prefer_not_to_say';
  /**
   * Pre-interview stance on the project. 0 = Strongly opposed, 100 = Strongly supportive.
   * Captured alongside demographics (before the conversation) so we can measure movement
   * against the post-conversation signifier score.
   */
  preStance?: number;
  /** When the demographics were captured. */
  capturedAt?: string;
}

/**
 * Re-export signifier types from the signifier library so call sites can
 * import them from lib/types alongside other shared types.
 */
export type { SignifierId, SignifierKind, Signifier, SignifierResponse } from './signifiers';

/** Stable IDs for the project-specific research question library. */
export type ResearchQuestionId =
  | 'community_ask'
  | 'community_fears'
  | 'past_project_history'
  | 'who_is_trusted'
  | 'meaningful_engagement'
  | 'shared_interests'
  | 'information_gap'
  | 'language_culture'
  | 'who_is_missing'
  | 'design_changes'
  | 'benefits_reach'
  | 'harms_anticipated'
  | 'precedent'
  | 'governance_oversight';

export interface Project {
  id: string;
  name: string;
  location: string;
  briefMarkdown: string;
  /** Sampled real public comments (with source). Used to seed the AI's
   * awareness of what concerns are out there. NOT shown verbatim to participants. */
  publicComments: PublicComment[];
  languages: Language[];
  /** Operator-selected research questions (3–7) the AI weaves in via story-frame.
   * IDs reference the canonical library in lib/research-questions.ts. */
  researchQuestionIds?: ResearchQuestionId[];
  /** Operator-selected signifiers (4–6) the participant self-scores after the
   * substantive conversation. IDs reference the canonical library in
   * lib/signifiers.ts. */
  signifierIds?: import('./signifiers').SignifierId[];
  /** If true, participant is invited to submit photos + captions ("photovoice"). */
  photovoiceEnabled?: boolean;
  /** Whether to collect the optional demographic intake before the conversation (default: true). */
  demographicsEnabled?: boolean;
  /** If true, participant is invited to mark pins on a map. */
  mappingEnabled?: boolean;
  /** Map center for the mapping flow (defaults to a sensible project-area center). */
  mapCenter?: { lat: number; lng: number; zoom?: number };
  createdAt: string;
}

/**
 * Photovoice — participant uploads a photo with a caption.
 * Each session may have multiple entries.
 *
 * Storage note: for MVP, images are stored as base64 data URLs in JSONB.
 * Client resizes to max 1280px / JPEG q=0.7 before upload so typical
 * payload stays under ~200KB. Migrate to Vercel Blob when volume grows.
 */
export interface PhotovoiceEntry {
  id: string;
  /** Base64 data URL (e.g., 'data:image/jpeg;base64,/9j/4AAQ...') */
  imageDataUrl: string;
  caption: string;
  capturedAt: string;
}

/**
 * Map pin — participant drops on the project map to mark a place of
 * concern, importance, or affected area.
 */
export interface MapPin {
  id: string;
  lat: number;
  lng: number;
  label: string;
  /** Optional longer note (why this pin matters). */
  note?: string;
  /** Pin category — concern, important place, affected area, opportunity. */
  kind?: 'concern' | 'important' | 'affected' | 'opportunity' | 'other';
  capturedAt: string;
}

export interface PublicComment {
  id: string;
  /** Verbatim or close paraphrase. */
  text: string;
  /** Where it came from. */
  source: string;
  /** Optional: if the comment names a stakeholder type, capture it. */
  stakeholderType?: string;
}

export interface Session {
  id: string;
  projectId: string;
  language: Language;
  status: SessionStatus;
  createdAt: string;
  updatedAt: string;
  /** Beginning-of-conversation consent: yes/questions/no. Captured after AI's opening. */
  participationConsentState?: ParticipationConsentState;
  participationConsentAt?: string;
  /** Optional demographic capture, all fields individually optional. */
  demographics?: Demographics;
  /** Self-signification responses captured after the substantive conversation. */
  signifierResponses?: import('./signifiers').SignifierResponse[];
  /** Photovoice entries — photos + captions submitted by the participant. */
  photovoiceEntries?: PhotovoiceEntry[];
  /** Map pins dropped by the participant to mark concerns / important places. */
  mapPins?: MapPin[];
  /** Set after recap once participant decides identification. */
  identification?: IdentificationPreference;
  /** Set after recap once participant decides what may be shared. */
  consent?: ConsentRecord;
}

export interface ConsentRecord {
  mayShareWithDeveloper: boolean;
  mayShareWithFunder: boolean;
  mayShareInPublicReport: boolean;
  identification: IdentificationPreference;
  /** Free-text descriptor the participant chooses to be identified by, if
   * identification is 'self_described'. Optional; can be a name, pseudonym,
   * role, or any phrase the participant types. */
  identificationDescription?: string;
  notes?: string;
  recordedAt: string;
}

export interface Message {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  /** Internal: which conversation stage this message belongs to. */
  stage?: 'opening' | 'consent' | 'listen' | 'recap' | 'sharing' | 'advocacy' | 'close';
}

export interface SynthesisRun {
  id: string;
  projectId: string;
  includedSessionIds: string[];
  outputMarkdown: string;
  createdAt: string;
}

export interface Report {
  id: string;
  /** Either tied to a single session (advocacy summary, Tier 1 single-conversation)
   * or to a synthesis run (Tier 1 across many). */
  sessionId?: string;
  synthesisRunId?: string;
  kind: 'tier1' | 'advocacy_summary';
  contentMarkdown: string;
  createdAt: string;
}

/* ------------------------------------------------------------------ *
 * Signals — the normalized cross-source unit.
 *
 * A Signal is one distinct, citable observation about a campaign, from any
 * of the three buckets. Direct-listening self-signification (from sessions)
 * is the 'pythia' source; ingested public record is 'civic'; org/desk
 * research is 'desk'. Keeping them in one shape lets the dashboard blend
 * and compare across sources.
 * ------------------------------------------------------------------ */

/** Which bucket a signal came from. */
export type SignalSource = 'desk' | 'civic' | 'pythia' | 'survey';

/** Posture a signal reflects toward the project. Aligns with dashboard colors. */
export type SignalStance =
  | 'opposition'
  | 'concern'
  | 'mixed'
  | 'support'
  | 'neutral';

/** A source reference attached to a signal (for the "no hallucination" rule). */
export interface SignalCitation {
  url: string;
  title?: string;
  publisher?: string;
  /** Short verbatim excerpt (<= ~240 chars) if available. */
  citedText?: string;
  /** ISO date the cited item was published, if known. */
  publishedAt?: string;
}

export interface Signal {
  id: string;
  /** Campaign/project this belongs to (free string; the pilot is the Frasier id). */
  campaignId: string;
  source: SignalSource;
  /** Fine-grained kind, e.g. 'order','staff_report','public_comment','news'. */
  sourceType: string;
  title: string;
  summary: string;
  stance: SignalStance;
  themes: string[];
  /** Organisation/party/role — never a private individual's name. */
  actor?: string;
  citations: SignalCitation[];
  /** 0–100 relative prominence/consequence. */
  salience?: number;
  /** 0–1 extraction confidence. */
  confidence?: number;
  /** ISO date the underlying event happened. */
  observedAt?: string;
  /** ISO date we captured/refreshed this record. */
  ingestedAt: string;
  /** Stable key used to build the deterministic id (idempotent upserts). */
  dedupeKey?: string;
  /** How this record was produced. */
  origin: 'seed' | 'web_search' | 'manual' | 'computed' | 'channel';
}

/**
 * A website/source the operator has chosen to monitor for a campaign's civic
 * bucket. Added manually, or suggested by the source-scout agent and then
 * approved. Active sources are fed into the civic ingestion pass.
 */
export interface MonitoredSource {
  id: string;
  campaignId: string;
  url: string;
  label?: string;
  /** Why this source is relevant (from the agent suggestion). */
  rationale?: string;
  addedBy: 'manual' | 'agent';
  /** 'suggested' = awaiting approval; 'active' = monitored; 'declined' = rejected. */
  status: 'active' | 'suggested' | 'declined';
  createdAt: string;
}

/** A record of one ingestion pass (for transparency + the sync log). */
export interface IngestionRun {
  id: string;
  campaignId: string;
  source: SignalSource;
  startedAt: string;
  finishedAt?: string;
  status: 'running' | 'ok' | 'error';
  model?: string;
  /** Raw source items consulted. */
  collected: number;
  /** New signals stored this pass (incl. seed inserts). */
  created: number;
  /** Existing signals refreshed this pass. */
  updated: number;
  searchQueries?: string[];
  error?: string;
  notes?: string;
}


/**
 * A published survey — a SurveySpec made shareable. `spec` is the SurveySpec
 * emitted by the Survey Builder (kept loose here to avoid coupling the storage
 * layer to agent code).
 */
export interface Survey {
  id: string;
  campaignId: string;
  spec: Record<string, unknown>;
  status: 'draft' | 'published' | 'closed';
  languages: string[];
  createdAt: string;
}

/**
 * One anonymous survey response. NO identity, NO IP, NO precise timestamp —
 * only a coarse `submittedDate` (YYYY-MM-DD), per the retaliation-protection
 * requirement. Demographics, if present, are coarse and optional.
 */
export interface SurveyResponse {
  id: string;
  surveyId: string;
  answers: Record<string, string | number>;
  demographics?: Record<string, string>;
  submittedDate: string;
}
