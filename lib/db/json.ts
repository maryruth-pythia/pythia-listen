/**
 * File-backed JSON storage backend.
 *
 * Used when POSTGRES_URL is unset — i.e., local development.
 * Reads and writes one JSON file per table under data/runtime/.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
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

const DATA_DIR = process.env.PYTHIA_DATA_DIR
  ? path.resolve(process.env.PYTHIA_DATA_DIR)
  : path.resolve(process.cwd(), 'data', 'runtime');

const FILES = {
  projects: 'projects.json',
  sessions: 'sessions.json',
  messages: 'messages.json',
  synthesis: 'synthesis_runs.json',
  reports: 'reports.json',
  signals: 'signals.json',
  ingestionRuns: 'ingestion_runs.json',
  monitoredSources: 'monitored_sources.json',
  surveys: 'surveys.json',
  surveyResponses: 'survey_responses.json',
  cache: 'analysis_cache.json',
} as const;

interface CacheRow {
  key: string;
  value: unknown;
  updatedAt: string;
}

type TableName = keyof typeof FILES;

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

/** Recover the first complete top-level JSON array from a possibly-corrupt
 * string (e.g. a half-written or double-written file from a concurrent write).
 * Returns null if nothing usable is found. */
function recoverJsonArray(raw: string): unknown[] | null {
  const start = raw.indexOf('[');
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < raw.length; i++) {
    const c = raw[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === '[') depth++;
    else if (c === ']') {
      depth--;
      if (depth === 0) {
        try {
          const v = JSON.parse(raw.slice(start, i + 1));
          return Array.isArray(v) ? v : null;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

async function readTable<T>(name: TableName): Promise<T[]> {
  await ensureDataDir();
  const filePath = path.join(DATA_DIR, FILES[name]);
  let raw: string;
  try {
    raw = await fs.readFile(filePath, 'utf-8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }
  try {
    return JSON.parse(raw) as T[];
  } catch {
    // Corrupt/half-written file (e.g. a concurrent write raced). Recover the
    // first valid array rather than crashing the whole page; if nothing is
    // salvageable, fall back to empty (caches regenerate).
    const recovered = recoverJsonArray(raw);
    return (recovered ?? []) as T[];
  }
}

async function writeTable<T>(name: TableName, rows: T[]): Promise<void> {
  await ensureDataDir();
  const filePath = path.join(DATA_DIR, FILES[name]);
  const tmp = filePath + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(rows, null, 2), 'utf-8');
  await fs.rename(tmp, filePath);
}

export async function listProjects(): Promise<Project[]> {
  return readTable<Project>('projects');
}

export async function getProject(id: string): Promise<Project | null> {
  const rows = await readTable<Project>('projects');
  return rows.find((r) => r.id === id) ?? null;
}

export async function upsertProject(p: Project): Promise<void> {
  const rows = await readTable<Project>('projects');
  const i = rows.findIndex((r) => r.id === p.id);
  if (i >= 0) rows[i] = p;
  else rows.push(p);
  await writeTable('projects', rows);
}

export async function listSessions(projectId?: string): Promise<Session[]> {
  const rows = await readTable<Session>('sessions');
  return projectId ? rows.filter((s) => s.projectId === projectId) : rows;
}

export async function getSession(id: string): Promise<Session | null> {
  const rows = await readTable<Session>('sessions');
  return rows.find((s) => s.id === id) ?? null;
}

export async function upsertSession(s: Session): Promise<void> {
  const rows = await readTable<Session>('sessions');
  const i = rows.findIndex((r) => r.id === s.id);
  if (i >= 0) rows[i] = s;
  else rows.push(s);
  await writeTable('sessions', rows);
}

export async function recordConsent(
  sessionId: string,
  consent: ConsentRecord
): Promise<void> {
  const session = await getSession(sessionId);
  if (!session) throw new Error(`Session ${sessionId} not found`);
  session.consent = consent;
  session.identification = consent.identification;
  session.status = 'consented';
  session.updatedAt = new Date().toISOString();
  await upsertSession(session);
}

export async function listMessages(sessionId: string): Promise<Message[]> {
  const rows = await readTable<Message>('messages');
  return rows
    .filter((m) => m.sessionId === sessionId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function appendMessage(m: Message): Promise<void> {
  const rows = await readTable<Message>('messages');
  rows.push(m);
  await writeTable('messages', rows);
}

export async function listSynthesisRuns(
  projectId?: string
): Promise<SynthesisRun[]> {
  const rows = await readTable<SynthesisRun>('synthesis');
  return projectId ? rows.filter((r) => r.projectId === projectId) : rows;
}

export async function appendSynthesisRun(run: SynthesisRun): Promise<void> {
  const rows = await readTable<SynthesisRun>('synthesis');
  rows.push(run);
  await writeTable('synthesis', rows);
}

export async function listReports(): Promise<Report[]> {
  return readTable<Report>('reports');
}

export async function getReport(id: string): Promise<Report | null> {
  const rows = await readTable<Report>('reports');
  return rows.find((r) => r.id === id) ?? null;
}

export async function appendReport(r: Report): Promise<void> {
  const rows = await readTable<Report>('reports');
  rows.push(r);
  await writeTable('reports', rows);
}

// ---- Signals ----

export async function listSignals(
  campaignId?: string,
  source?: SignalSource
): Promise<Signal[]> {
  const rows = await readTable<Signal>('signals');
  return rows
    .filter((s) => (campaignId ? s.campaignId === campaignId : true))
    .filter((s) => (source ? s.source === source : true));
}

export async function upsertSignal(sig: Signal): Promise<void> {
  const rows = await readTable<Signal>('signals');
  const i = rows.findIndex((r) => r.id === sig.id);
  if (i >= 0) rows[i] = sig;
  else rows.push(sig);
  await writeTable('signals', rows);
}

export async function getCache(
  key: string
): Promise<{ value: unknown; updatedAt: string } | null> {
  const rows = await readTable<CacheRow>('cache');
  const hit = rows.find((r) => r.key === key);
  return hit ? { value: hit.value, updatedAt: hit.updatedAt } : null;
}

export async function setCache(key: string, value: unknown): Promise<void> {
  const rows = await readTable<CacheRow>('cache');
  const i = rows.findIndex((r) => r.key === key);
  const row: CacheRow = { key, value, updatedAt: new Date().toISOString() };
  if (i >= 0) rows[i] = row;
  else rows.push(row);
  await writeTable('cache', rows);
}

export async function clearCache(prefix: string): Promise<void> {
  const rows = await readTable<CacheRow>('cache');
  await writeTable(
    'cache',
    rows.filter((r) => !r.key.startsWith(prefix))
  );
}

export async function deleteChannelSignals(campaignId?: string): Promise<number> {
  const rows = await readTable<Signal>('signals');
  const kept = rows.filter(
    (s) =>
      !(s.origin === 'channel' && (campaignId ? s.campaignId === campaignId : true))
  );
  await writeTable('signals', kept);
  return rows.length - kept.length;
}

/** Delete specific signals by id (used to prune stale demo-seed signals). */
export async function deleteSignalsByIds(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const drop = new Set(ids);
  const rows = await readTable<Signal>('signals');
  const kept = rows.filter((s) => !drop.has(s.id));
  await writeTable('signals', kept);
  return rows.length - kept.length;
}

// ---- Ingestion runs ----

export async function listIngestionRuns(
  campaignId?: string
): Promise<IngestionRun[]> {
  const rows = await readTable<IngestionRun>('ingestionRuns');
  return rows
    .filter((r) => (campaignId ? r.campaignId === campaignId : true))
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export async function appendIngestionRun(run: IngestionRun): Promise<void> {
  const rows = await readTable<IngestionRun>('ingestionRuns');
  rows.push(run);
  await writeTable('ingestionRuns', rows);
}

export async function updateIngestionRun(run: IngestionRun): Promise<void> {
  const rows = await readTable<IngestionRun>('ingestionRuns');
  const i = rows.findIndex((r) => r.id === run.id);
  if (i >= 0) rows[i] = run;
  else rows.push(run);
  await writeTable('ingestionRuns', rows);
}

// ---- Monitored sources ----

export async function listMonitoredSources(
  campaignId?: string,
  status?: string
): Promise<MonitoredSource[]> {
  const rows = await readTable<MonitoredSource>('monitoredSources');
  return rows
    .filter((s) => (campaignId ? s.campaignId === campaignId : true))
    .filter((s) => (status ? s.status === status : true))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function upsertMonitoredSource(s: MonitoredSource): Promise<void> {
  const rows = await readTable<MonitoredSource>('monitoredSources');
  const i = rows.findIndex((r) => r.id === s.id);
  if (i >= 0) rows[i] = s;
  else rows.push(s);
  await writeTable('monitoredSources', rows);
}

export async function deleteMonitoredSource(id: string): Promise<void> {
  const rows = await readTable<MonitoredSource>('monitoredSources');
  await writeTable(
    'monitoredSources',
    rows.filter((r) => r.id !== id)
  );
}

export async function wipeAll(): Promise<void> {
  await ensureDataDir();
  for (const name of Object.values(FILES)) {
    const fp = path.join(DATA_DIR, name);
    try {
      await fs.unlink(fp);
    } catch {
      /* ignore */
    }
  }
}


// ---- Surveys ----

export async function getSurvey(id: string): Promise<Survey | null> {
  const rows = await readTable<Survey>('surveys');
  return rows.find((s) => s.id === id) ?? null;
}

export async function listSurveys(campaignId?: string): Promise<Survey[]> {
  const rows = await readTable<Survey>('surveys');
  return rows.filter((s) => (campaignId ? s.campaignId === campaignId : true));
}

export async function upsertSurvey(s: Survey): Promise<void> {
  const rows = await readTable<Survey>('surveys');
  const i = rows.findIndex((r) => r.id === s.id);
  if (i >= 0) rows[i] = s;
  else rows.push(s);
  await writeTable('surveys', rows);
}

export async function deleteSurvey(id: string): Promise<void> {
  const rows = await readTable<Survey>('surveys');
  await writeTable(
    'surveys',
    rows.filter((s) => s.id !== id)
  );
}

export async function listSurveyResponses(
  surveyId: string
): Promise<SurveyResponse[]> {
  const rows = await readTable<SurveyResponse>('surveyResponses');
  return rows.filter((r) => r.surveyId === surveyId);
}

export async function appendSurveyResponse(r: SurveyResponse): Promise<void> {
  const rows = await readTable<SurveyResponse>('surveyResponses');
  rows.push(r);
  await writeTable('surveyResponses', rows);
}

export async function upsertSurveyResponse(r: SurveyResponse): Promise<void> {
  const rows = await readTable<SurveyResponse>('surveyResponses');
  const i = rows.findIndex((x) => x.id === r.id);
  if (i >= 0) rows[i] = r;
  else rows.push(r);
  await writeTable('surveyResponses', rows);
}
