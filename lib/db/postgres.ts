/**
 * Postgres backend (Neon serverless / any Postgres via POSTGRES_URL).
 *
 * Used when POSTGRES_URL or DATABASE_URL is set — i.e., production / staging.
 * Function signatures match lib/db/json.ts exactly.
 *
 * Vercel's managed Postgres is now Neon under the hood. The SDK we use is
 * @neondatabase/serverless, which is the recommended Vercel-supported client.
 */

import { neon, NeonQueryFunction } from '@neondatabase/serverless';
import {
  Project,
  Session,
  Message,
  ConsentRecord,
  SynthesisRun,
  Report,
  Signal,
  SignalSource,
  IngestionRun,
  MonitoredSource,
  Survey,
  SurveyResponse,
} from '../types';

let _sql: NeonQueryFunction<false, false> | null = null;
function getSql(): NeonQueryFunction<false, false> {
  if (_sql) return _sql;
  const url = process.env.POSTGRES_URL ?? process.env.DATABASE_URL ?? '';
  if (!url) {
    throw new Error(
      'POSTGRES_URL (or DATABASE_URL) is not set. Postgres backend cannot be used.'
    );
  }
  _sql = neon(url);
  return _sql;
}

/**
 * Self-healing schema for the tables this build adds (signals, ingestion_runs,
 * monitored_sources). Runs CREATE TABLE IF NOT EXISTS the first time any of
 * their functions is called, so the app works on a database that hasn't had
 * `npm run db:migrate` run against it. Memoized per process.
 */
let _extSchema: Promise<void> | null = null;
function ensureExtSchema(): Promise<void> {
  if (_extSchema) return _extSchema;
  const sql = getSql();
  _extSchema = (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS signals (
        id TEXT PRIMARY KEY,
        campaign_id TEXT NOT NULL,
        source TEXT NOT NULL,
        source_type TEXT NOT NULL,
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        stance TEXT NOT NULL,
        themes JSONB NOT NULL DEFAULT '[]'::jsonb,
        actor TEXT,
        citations JSONB NOT NULL DEFAULT '[]'::jsonb,
        salience INTEGER,
        confidence REAL,
        observed_at TIMESTAMPTZ,
        ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        dedupe_key TEXT,
        origin TEXT NOT NULL DEFAULT 'web_search'
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_signals_campaign ON signals(campaign_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_signals_source ON signals(source)`;
    await sql`
      CREATE TABLE IF NOT EXISTS ingestion_runs (
        id TEXT PRIMARY KEY,
        campaign_id TEXT NOT NULL,
        source TEXT NOT NULL,
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        finished_at TIMESTAMPTZ,
        status TEXT NOT NULL,
        model TEXT,
        collected INTEGER NOT NULL DEFAULT 0,
        created INTEGER NOT NULL DEFAULT 0,
        updated INTEGER NOT NULL DEFAULT 0,
        search_queries JSONB,
        error TEXT,
        notes TEXT
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_ingestion_campaign ON ingestion_runs(campaign_id)`;
    await sql`
      CREATE TABLE IF NOT EXISTS monitored_sources (
        id TEXT PRIMARY KEY,
        campaign_id TEXT NOT NULL,
        url TEXT NOT NULL,
        label TEXT,
        rationale TEXT,
        added_by TEXT NOT NULL DEFAULT 'manual',
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_monitored_campaign ON monitored_sources(campaign_id)`;
    await sql`
      CREATE TABLE IF NOT EXISTS analysis_cache (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS surveys (
        id TEXT PRIMARY KEY,
        campaign_id TEXT NOT NULL,
        spec JSONB NOT NULL DEFAULT '{}'::jsonb,
        status TEXT NOT NULL DEFAULT 'published',
        languages JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TEXT NOT NULL
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_surveys_campaign ON surveys(campaign_id)`;
    await sql`
      CREATE TABLE IF NOT EXISTS survey_responses (
        id TEXT PRIMARY KEY,
        survey_id TEXT NOT NULL,
        answers JSONB NOT NULL DEFAULT '{}'::jsonb,
        demographics JSONB,
        submitted_date TEXT NOT NULL
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_survey_responses_survey ON survey_responses(survey_id)`;
  })().catch((err) => {
    // Reset so a transient failure can be retried on the next call.
    _extSchema = null;
    throw err;
  });
  return _extSchema;
}

// ---- Projects ----

export async function listProjects(): Promise<Project[]> {
  const sql = getSql();
  const rows = await sql`SELECT * FROM projects ORDER BY created_at DESC`;
  return rows.map(mapProject);
}

export async function getProject(id: string): Promise<Project | null> {
  const sql = getSql();
  const rows = await sql`SELECT * FROM projects WHERE id = ${id}`;
  return rows.length ? mapProject(rows[0]) : null;
}

export async function upsertProject(p: Project): Promise<void> {
  const sql = getSql();
  await sql`
    INSERT INTO projects (
      id, name, location, brief_markdown, public_comments, languages,
      research_question_ids, signifier_ids,
      photovoice_enabled, mapping_enabled, map_center,
      created_at
    )
    VALUES (
      ${p.id}, ${p.name}, ${p.location}, ${p.briefMarkdown},
      ${JSON.stringify(p.publicComments)}::jsonb,
      ${p.languages as unknown as string[]},
      ${p.researchQuestionIds ? JSON.stringify(p.researchQuestionIds) : null}::jsonb,
      ${p.signifierIds ? JSON.stringify(p.signifierIds) : null}::jsonb,
      ${p.photovoiceEnabled ?? false},
      ${p.mappingEnabled ?? false},
      ${p.mapCenter ? JSON.stringify(p.mapCenter) : null}::jsonb,
      ${p.createdAt}
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      location = EXCLUDED.location,
      brief_markdown = EXCLUDED.brief_markdown,
      public_comments = EXCLUDED.public_comments,
      languages = EXCLUDED.languages,
      research_question_ids = EXCLUDED.research_question_ids,
      signifier_ids = EXCLUDED.signifier_ids,
      photovoice_enabled = EXCLUDED.photovoice_enabled,
      mapping_enabled = EXCLUDED.mapping_enabled,
      map_center = EXCLUDED.map_center
  `;
}

function mapProject(r: Record<string, unknown>): Project {
  return {
    id: r.id as string,
    name: r.name as string,
    location: r.location as string,
    briefMarkdown: r.brief_markdown as string,
    publicComments: r.public_comments as Project['publicComments'],
    languages: r.languages as Project['languages'],
    researchQuestionIds:
      (r.research_question_ids as Project['researchQuestionIds']) ?? undefined,
    signifierIds:
      (r.signifier_ids as Project['signifierIds']) ?? undefined,
    photovoiceEnabled: (r.photovoice_enabled as boolean) ?? false,
    mappingEnabled: (r.mapping_enabled as boolean) ?? false,
    mapCenter: (r.map_center as Project['mapCenter']) ?? undefined,
    createdAt:
      r.created_at instanceof Date
        ? r.created_at.toISOString()
        : (r.created_at as string),
  };
}

// ---- Sessions ----

export async function listSessions(projectId?: string): Promise<Session[]> {
  const sql = getSql();
  const rows = projectId
    ? await sql`SELECT * FROM sessions WHERE project_id = ${projectId} ORDER BY created_at DESC`
    : await sql`SELECT * FROM sessions ORDER BY created_at DESC`;
  return rows.map(mapSession);
}

export async function getSession(id: string): Promise<Session | null> {
  const sql = getSql();
  const rows = await sql`SELECT * FROM sessions WHERE id = ${id}`;
  return rows.length ? mapSession(rows[0]) : null;
}

export async function upsertSession(s: Session): Promise<void> {
  const sql = getSql();
  await sql`
    INSERT INTO sessions (
      id, project_id, language, status, created_at, updated_at,
      participation_consent_state, participation_consent_at, demographics,
      signifier_responses, photovoice_entries, map_pins,
      identification, consent
    )
    VALUES (
      ${s.id}, ${s.projectId}, ${s.language}, ${s.status},
      ${s.createdAt}, ${s.updatedAt},
      ${s.participationConsentState ?? null},
      ${s.participationConsentAt ?? null},
      ${s.demographics ? JSON.stringify(s.demographics) : null}::jsonb,
      ${s.signifierResponses ? JSON.stringify(s.signifierResponses) : null}::jsonb,
      ${s.photovoiceEntries ? JSON.stringify(s.photovoiceEntries) : null}::jsonb,
      ${s.mapPins ? JSON.stringify(s.mapPins) : null}::jsonb,
      ${s.identification ?? null},
      ${s.consent ? JSON.stringify(s.consent) : null}::jsonb
    )
    ON CONFLICT (id) DO UPDATE SET
      status = EXCLUDED.status,
      updated_at = EXCLUDED.updated_at,
      participation_consent_state = EXCLUDED.participation_consent_state,
      participation_consent_at = EXCLUDED.participation_consent_at,
      demographics = EXCLUDED.demographics,
      signifier_responses = EXCLUDED.signifier_responses,
      photovoice_entries = EXCLUDED.photovoice_entries,
      map_pins = EXCLUDED.map_pins,
      identification = EXCLUDED.identification,
      consent = EXCLUDED.consent
  `;
}

export async function recordConsent(
  sessionId: string,
  consent: ConsentRecord
): Promise<void> {
  const sql = getSql();
  await sql`
    UPDATE sessions
    SET consent = ${JSON.stringify(consent)}::jsonb,
        identification = ${consent.identification},
        status = 'consented',
        updated_at = NOW()
    WHERE id = ${sessionId}
  `;
}

function mapSession(r: Record<string, unknown>): Session {
  const consentAt = r.participation_consent_at;
  return {
    id: r.id as string,
    projectId: r.project_id as string,
    language: r.language as Session['language'],
    status: r.status as Session['status'],
    createdAt:
      r.created_at instanceof Date
        ? r.created_at.toISOString()
        : (r.created_at as string),
    updatedAt:
      r.updated_at instanceof Date
        ? r.updated_at.toISOString()
        : (r.updated_at as string),
    participationConsentState:
      (r.participation_consent_state as Session['participationConsentState']) ?? undefined,
    participationConsentAt: consentAt
      ? consentAt instanceof Date
        ? consentAt.toISOString()
        : (consentAt as string)
      : undefined,
    demographics: (r.demographics as Session['demographics']) ?? undefined,
    signifierResponses:
      (r.signifier_responses as Session['signifierResponses']) ?? undefined,
    photovoiceEntries:
      (r.photovoice_entries as Session['photovoiceEntries']) ?? undefined,
    mapPins: (r.map_pins as Session['mapPins']) ?? undefined,
    identification: (r.identification as Session['identification']) ?? undefined,
    consent: (r.consent as ConsentRecord) ?? undefined,
  };
}

// ---- Messages ----

export async function listMessages(sessionId: string): Promise<Message[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT * FROM messages WHERE session_id = ${sessionId} ORDER BY created_at ASC
  `;
  return rows.map(mapMessage);
}

export async function appendMessage(m: Message): Promise<void> {
  const sql = getSql();
  await sql`
    INSERT INTO messages (id, session_id, role, content, created_at, stage)
    VALUES (${m.id}, ${m.sessionId}, ${m.role}, ${m.content}, ${m.createdAt}, ${m.stage ?? null})
    ON CONFLICT (id) DO UPDATE
      SET content = EXCLUDED.content,
          stage   = EXCLUDED.stage
  `;
}

function mapMessage(r: Record<string, unknown>): Message {
  return {
    id: r.id as string,
    sessionId: r.session_id as string,
    role: r.role as Message['role'],
    content: r.content as string,
    createdAt:
      r.created_at instanceof Date
        ? r.created_at.toISOString()
        : (r.created_at as string),
    stage: (r.stage as Message['stage']) ?? undefined,
  };
}

// ---- Synthesis runs ----

export async function listSynthesisRuns(
  projectId?: string
): Promise<SynthesisRun[]> {
  const sql = getSql();
  const rows = projectId
    ? await sql`SELECT * FROM synthesis_runs WHERE project_id = ${projectId} ORDER BY created_at DESC`
    : await sql`SELECT * FROM synthesis_runs ORDER BY created_at DESC`;
  return rows.map(mapRun);
}

export async function appendSynthesisRun(run: SynthesisRun): Promise<void> {
  const sql = getSql();
  await sql`
    INSERT INTO synthesis_runs (id, project_id, included_session_ids, output_markdown, created_at)
    VALUES (
      ${run.id}, ${run.projectId},
      ${JSON.stringify(run.includedSessionIds)}::jsonb,
      ${run.outputMarkdown}, ${run.createdAt}
    )
  `;
}

function mapRun(r: Record<string, unknown>): SynthesisRun {
  return {
    id: r.id as string,
    projectId: r.project_id as string,
    includedSessionIds: r.included_session_ids as string[],
    outputMarkdown: r.output_markdown as string,
    createdAt:
      r.created_at instanceof Date
        ? r.created_at.toISOString()
        : (r.created_at as string),
  };
}

// ---- Reports ----

export async function listReports(): Promise<Report[]> {
  const sql = getSql();
  const rows = await sql`SELECT * FROM reports ORDER BY created_at DESC`;
  return rows.map(mapReport);
}

export async function getReport(id: string): Promise<Report | null> {
  const sql = getSql();
  const rows = await sql`SELECT * FROM reports WHERE id = ${id}`;
  return rows.length ? mapReport(rows[0]) : null;
}

export async function appendReport(r: Report): Promise<void> {
  const sql = getSql();
  await sql`
    INSERT INTO reports (id, session_id, synthesis_run_id, kind, content_markdown, created_at)
    VALUES (
      ${r.id}, ${r.sessionId ?? null}, ${r.synthesisRunId ?? null},
      ${r.kind}, ${r.contentMarkdown}, ${r.createdAt}
    )
    ON CONFLICT (id) DO UPDATE
      SET content_markdown = EXCLUDED.content_markdown
  `;
}

function mapReport(r: Record<string, unknown>): Report {
  return {
    id: r.id as string,
    sessionId: (r.session_id as string) ?? undefined,
    synthesisRunId: (r.synthesis_run_id as string) ?? undefined,
    kind: r.kind as Report['kind'],
    contentMarkdown: r.content_markdown as string,
    createdAt:
      r.created_at instanceof Date
        ? r.created_at.toISOString()
        : (r.created_at as string),
  };
}

// ---- Signals ----

export async function listSignals(
  campaignId?: string,
  source?: SignalSource
): Promise<Signal[]> {
  await ensureExtSchema();
  const sql = getSql();
  let rows;
  if (campaignId && source) {
    rows = await sql`SELECT * FROM signals WHERE campaign_id = ${campaignId} AND source = ${source} ORDER BY salience DESC NULLS LAST, ingested_at DESC`;
  } else if (campaignId) {
    rows = await sql`SELECT * FROM signals WHERE campaign_id = ${campaignId} ORDER BY salience DESC NULLS LAST, ingested_at DESC`;
  } else if (source) {
    rows = await sql`SELECT * FROM signals WHERE source = ${source} ORDER BY salience DESC NULLS LAST, ingested_at DESC`;
  } else {
    rows = await sql`SELECT * FROM signals ORDER BY salience DESC NULLS LAST, ingested_at DESC`;
  }
  return rows.map(mapSignal);
}

export async function upsertSignal(s: Signal): Promise<void> {
  await ensureExtSchema();
  const sql = getSql();
  await sql`
    INSERT INTO signals (
      id, campaign_id, source, source_type, title, summary, stance,
      themes, actor, citations, salience, confidence, observed_at,
      ingested_at, dedupe_key, origin
    )
    VALUES (
      ${s.id}, ${s.campaignId}, ${s.source}, ${s.sourceType}, ${s.title},
      ${s.summary}, ${s.stance},
      ${JSON.stringify(s.themes ?? [])}::jsonb,
      ${s.actor ?? null},
      ${JSON.stringify(s.citations ?? [])}::jsonb,
      ${s.salience ?? null}, ${s.confidence ?? null},
      ${s.observedAt ?? null}, ${s.ingestedAt},
      ${s.dedupeKey ?? null}, ${s.origin}
    )
    ON CONFLICT (id) DO UPDATE SET
      source_type = EXCLUDED.source_type,
      title = EXCLUDED.title,
      summary = EXCLUDED.summary,
      stance = EXCLUDED.stance,
      themes = EXCLUDED.themes,
      actor = EXCLUDED.actor,
      citations = EXCLUDED.citations,
      salience = EXCLUDED.salience,
      confidence = EXCLUDED.confidence,
      observed_at = EXCLUDED.observed_at,
      ingested_at = EXCLUDED.ingested_at,
      origin = EXCLUDED.origin
  `;
}

function mapSignal(r: Record<string, unknown>): Signal {
  return {
    id: r.id as string,
    campaignId: r.campaign_id as string,
    source: r.source as SignalSource,
    sourceType: r.source_type as string,
    title: r.title as string,
    summary: r.summary as string,
    stance: r.stance as Signal['stance'],
    themes: (r.themes as string[]) ?? [],
    actor: (r.actor as string) ?? undefined,
    citations: (r.citations as Signal['citations']) ?? [],
    salience: r.salience != null ? Number(r.salience) : undefined,
    confidence: r.confidence != null ? Number(r.confidence) : undefined,
    observedAt:
      r.observed_at instanceof Date
        ? r.observed_at.toISOString()
        : ((r.observed_at as string) ?? undefined),
    ingestedAt:
      r.ingested_at instanceof Date
        ? r.ingested_at.toISOString()
        : (r.ingested_at as string),
    dedupeKey: (r.dedupe_key as string) ?? undefined,
    origin: r.origin as Signal['origin'],
  };
}

// ---- Ingestion runs ----

export async function listIngestionRuns(
  campaignId?: string
): Promise<IngestionRun[]> {
  await ensureExtSchema();
  const sql = getSql();
  const rows = campaignId
    ? await sql`SELECT * FROM ingestion_runs WHERE campaign_id = ${campaignId} ORDER BY started_at DESC`
    : await sql`SELECT * FROM ingestion_runs ORDER BY started_at DESC`;
  return rows.map(mapIngestionRun);
}

export async function appendIngestionRun(run: IngestionRun): Promise<void> {
  await ensureExtSchema();
  const sql = getSql();
  await sql`
    INSERT INTO ingestion_runs (
      id, campaign_id, source, started_at, finished_at, status, model,
      collected, created, updated, search_queries, error, notes
    )
    VALUES (
      ${run.id}, ${run.campaignId}, ${run.source}, ${run.startedAt},
      ${run.finishedAt ?? null}, ${run.status}, ${run.model ?? null},
      ${run.collected}, ${run.created}, ${run.updated},
      ${run.searchQueries ? JSON.stringify(run.searchQueries) : null}::jsonb,
      ${run.error ?? null}, ${run.notes ?? null}
    )
    ON CONFLICT (id) DO NOTHING
  `;
}

export async function updateIngestionRun(run: IngestionRun): Promise<void> {
  await ensureExtSchema();
  const sql = getSql();
  await sql`
    INSERT INTO ingestion_runs (
      id, campaign_id, source, started_at, finished_at, status, model,
      collected, created, updated, search_queries, error, notes
    )
    VALUES (
      ${run.id}, ${run.campaignId}, ${run.source}, ${run.startedAt},
      ${run.finishedAt ?? null}, ${run.status}, ${run.model ?? null},
      ${run.collected}, ${run.created}, ${run.updated},
      ${run.searchQueries ? JSON.stringify(run.searchQueries) : null}::jsonb,
      ${run.error ?? null}, ${run.notes ?? null}
    )
    ON CONFLICT (id) DO UPDATE SET
      finished_at = EXCLUDED.finished_at,
      status = EXCLUDED.status,
      model = EXCLUDED.model,
      collected = EXCLUDED.collected,
      created = EXCLUDED.created,
      updated = EXCLUDED.updated,
      search_queries = EXCLUDED.search_queries,
      error = EXCLUDED.error,
      notes = EXCLUDED.notes
  `;
}

function mapIngestionRun(r: Record<string, unknown>): IngestionRun {
  return {
    id: r.id as string,
    campaignId: r.campaign_id as string,
    source: r.source as SignalSource,
    startedAt:
      r.started_at instanceof Date
        ? r.started_at.toISOString()
        : (r.started_at as string),
    finishedAt:
      r.finished_at instanceof Date
        ? r.finished_at.toISOString()
        : ((r.finished_at as string) ?? undefined),
    status: r.status as IngestionRun['status'],
    model: (r.model as string) ?? undefined,
    collected: Number(r.collected ?? 0),
    created: Number(r.created ?? 0),
    updated: Number(r.updated ?? 0),
    searchQueries: (r.search_queries as string[]) ?? undefined,
    error: (r.error as string) ?? undefined,
    notes: (r.notes as string) ?? undefined,
  };
}

// ---- Monitored sources ----

export async function listMonitoredSources(
  campaignId?: string,
  status?: string
): Promise<MonitoredSource[]> {
  await ensureExtSchema();
  const sql = getSql();
  let rows;
  if (campaignId && status) {
    rows = await sql`SELECT * FROM monitored_sources WHERE campaign_id = ${campaignId} AND status = ${status} ORDER BY created_at DESC`;
  } else if (campaignId) {
    rows = await sql`SELECT * FROM monitored_sources WHERE campaign_id = ${campaignId} ORDER BY created_at DESC`;
  } else {
    rows = await sql`SELECT * FROM monitored_sources ORDER BY created_at DESC`;
  }
  return rows.map(mapMonitoredSource);
}

export async function upsertMonitoredSource(s: MonitoredSource): Promise<void> {
  await ensureExtSchema();
  const sql = getSql();
  await sql`
    INSERT INTO monitored_sources (
      id, campaign_id, url, label, rationale, added_by, status, created_at
    )
    VALUES (
      ${s.id}, ${s.campaignId}, ${s.url}, ${s.label ?? null},
      ${s.rationale ?? null}, ${s.addedBy}, ${s.status}, ${s.createdAt}
    )
    ON CONFLICT (id) DO UPDATE SET
      url = EXCLUDED.url,
      label = EXCLUDED.label,
      rationale = EXCLUDED.rationale,
      added_by = EXCLUDED.added_by,
      status = EXCLUDED.status
  `;
}

export async function deleteMonitoredSource(id: string): Promise<void> {
  await ensureExtSchema();
  const sql = getSql();
  await sql`DELETE FROM monitored_sources WHERE id = ${id}`;
}

function mapMonitoredSource(r: Record<string, unknown>): MonitoredSource {
  return {
    id: r.id as string,
    campaignId: r.campaign_id as string,
    url: r.url as string,
    label: (r.label as string) ?? undefined,
    rationale: (r.rationale as string) ?? undefined,
    addedBy: r.added_by as MonitoredSource['addedBy'],
    status: r.status as MonitoredSource['status'],
    createdAt:
      r.created_at instanceof Date
        ? r.created_at.toISOString()
        : (r.created_at as string),
  };
}

// ---- Analysis cache (key/value with timestamp) ----

export async function getCache(
  key: string
): Promise<{ value: unknown; updatedAt: string } | null> {
  await ensureExtSchema();
  const sql = getSql();
  const rows = await sql`SELECT value, updated_at FROM analysis_cache WHERE key = ${key}`;
  if (!rows[0]) return null;
  try {
    return { value: JSON.parse(rows[0].value as string), updatedAt: rows[0].updated_at as string };
  } catch {
    return null;
  }
}

export async function setCache(key: string, value: unknown): Promise<void> {
  await ensureExtSchema();
  const sql = getSql();
  await sql`
    INSERT INTO analysis_cache (key, value, updated_at)
    VALUES (${key}, ${JSON.stringify(value)}, NOW())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
  `;
}

export async function clearCache(prefix: string): Promise<void> {
  await ensureExtSchema();
  const sql = getSql();
  await sql`DELETE FROM analysis_cache WHERE key LIKE ${prefix + '%'}`;
}

// ---- Maintenance ----

/**
 * Delete channel-origin signals (email/WhatsApp/Drive listening). Optionally
 * scoped to one campaign. Used to reset the listening inbox so a fresh
 * ingestion re-routes every message by content. Does NOT touch civic/seed data.
 */
export async function deleteChannelSignals(campaignId?: string): Promise<number> {
  await ensureExtSchema();
  const sql = getSql();
  const rows = campaignId
    ? await sql`DELETE FROM signals WHERE origin = 'channel' AND campaign_id = ${campaignId} RETURNING id`
    : await sql`DELETE FROM signals WHERE origin = 'channel' RETURNING id`;
  return rows.length;
}

/** Delete specific signals by id (used to prune stale demo-seed signals). */
export async function deleteSignalsByIds(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  await ensureExtSchema();
  const sql = getSql();
  const rows = await sql`DELETE FROM signals WHERE id = ANY(${ids}) RETURNING id`;
  return rows.length;
}

export async function wipeAll(): Promise<void> {
  const sql = getSql();
  await sql`DELETE FROM reports`;
  await sql`DELETE FROM synthesis_runs`;
  await sql`DELETE FROM messages`;
  await sql`DELETE FROM sessions`;
}


// ---- Surveys ----

function mapSurvey(r: Record<string, unknown>): Survey {
  return {
    id: String(r.id),
    campaignId: String(r.campaign_id),
    spec: (r.spec as Record<string, unknown>) ?? {},
    status: (r.status as Survey['status']) ?? 'published',
    languages: Array.isArray(r.languages) ? (r.languages as string[]) : [],
    createdAt: String(r.created_at),
  };
}

function mapResponse(r: Record<string, unknown>): SurveyResponse {
  return {
    id: String(r.id),
    surveyId: String(r.survey_id),
    answers: (r.answers as Record<string, string | number>) ?? {},
    demographics: (r.demographics as Record<string, string>) ?? undefined,
    submittedDate: String(r.submitted_date),
  };
}

export async function getSurvey(id: string): Promise<Survey | null> {
  await ensureExtSchema();
  const sql = getSql();
  const rows = await sql`SELECT * FROM surveys WHERE id = ${id} LIMIT 1`;
  return rows.length ? mapSurvey(rows[0] as Record<string, unknown>) : null;
}

export async function listSurveys(campaignId?: string): Promise<Survey[]> {
  await ensureExtSchema();
  const sql = getSql();
  const rows = campaignId
    ? await sql`SELECT * FROM surveys WHERE campaign_id = ${campaignId} ORDER BY created_at DESC`
    : await sql`SELECT * FROM surveys ORDER BY created_at DESC`;
  return rows.map((r) => mapSurvey(r as Record<string, unknown>));
}

export async function deleteSurvey(id: string): Promise<void> {
  await ensureExtSchema();
  const sql = getSql();
  await sql`DELETE FROM surveys WHERE id = ${id}`;
}

export async function upsertSurvey(s: Survey): Promise<void> {
  await ensureExtSchema();
  const sql = getSql();
  await sql`
    INSERT INTO surveys (id, campaign_id, spec, status, languages, created_at)
    VALUES (
      ${s.id}, ${s.campaignId}, ${JSON.stringify(s.spec ?? {})}::jsonb,
      ${s.status}, ${JSON.stringify(s.languages ?? [])}::jsonb, ${s.createdAt}
    )
    ON CONFLICT (id) DO UPDATE SET
      spec = EXCLUDED.spec, status = EXCLUDED.status, languages = EXCLUDED.languages
  `;
}

export async function listSurveyResponses(
  surveyId: string
): Promise<SurveyResponse[]> {
  await ensureExtSchema();
  const sql = getSql();
  const rows = await sql`SELECT * FROM survey_responses WHERE survey_id = ${surveyId} ORDER BY submitted_date DESC`;
  return rows.map((r) => mapResponse(r as Record<string, unknown>));
}

export async function appendSurveyResponse(r: SurveyResponse): Promise<void> {
  await ensureExtSchema();
  const sql = getSql();
  await sql`
    INSERT INTO survey_responses (id, survey_id, answers, demographics, submitted_date)
    VALUES (
      ${r.id}, ${r.surveyId}, ${JSON.stringify(r.answers ?? {})}::jsonb,
      ${r.demographics ? JSON.stringify(r.demographics) : null}::jsonb, ${r.submittedDate}
    )
    ON CONFLICT (id) DO NOTHING
  `;
}

export async function upsertSurveyResponse(r: SurveyResponse): Promise<void> {
  await ensureExtSchema();
  const sql = getSql();
  await sql`
    INSERT INTO survey_responses (id, survey_id, answers, demographics, submitted_date)
    VALUES (
      ${r.id}, ${r.surveyId}, ${JSON.stringify(r.answers ?? {})}::jsonb,
      ${r.demographics ? JSON.stringify(r.demographics) : null}::jsonb, ${r.submittedDate}
    )
    ON CONFLICT (id) DO UPDATE SET answers = EXCLUDED.answers, demographics = EXCLUDED.demographics
  `;
}
