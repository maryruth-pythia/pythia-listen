/**
 * Pythia data layer.
 *
 * Picks a backend at boot:
 * - If POSTGRES_URL is set → Postgres (production / Vercel)
 * - Otherwise → file-backed JSON (local dev)
 *
 * All exported functions have identical signatures across backends.
 * To swap to a different backend (Supabase, Turso, etc.), implement
 * lib/db/<name>.ts with the same exports and add a switch below.
 */

import * as jsonDb from './db/json';
import * as pgDb from './db/postgres';

const usePostgres = !!process.env.POSTGRES_URL;
const backend = usePostgres ? pgDb : jsonDb;

export const listProjects = backend.listProjects;
export const getProject = backend.getProject;
export const upsertProject = backend.upsertProject;
export const listSessions = backend.listSessions;
export const getSession = backend.getSession;
export const upsertSession = backend.upsertSession;
export const recordConsent = backend.recordConsent;
export const listMessages = backend.listMessages;
export const appendMessage = backend.appendMessage;
export const listSynthesisRuns = backend.listSynthesisRuns;
export const appendSynthesisRun = backend.appendSynthesisRun;
export const listReports = backend.listReports;
export const getReport = backend.getReport;
export const appendReport = backend.appendReport;
export const listSignals = backend.listSignals;
export const upsertSignal = backend.upsertSignal;
export const deleteChannelSignals = backend.deleteChannelSignals;
export const deleteSignalsByIds = backend.deleteSignalsByIds;
export const getSurvey = backend.getSurvey;
export const listSurveys = backend.listSurveys;
export const upsertSurvey = backend.upsertSurvey;
export const deleteSurvey = backend.deleteSurvey;
export const listSurveyResponses = backend.listSurveyResponses;
export const appendSurveyResponse = backend.appendSurveyResponse;
export const upsertSurveyResponse = backend.upsertSurveyResponse;
export const getCache = backend.getCache;
export const setCache = backend.setCache;
export const clearCache = backend.clearCache;
export const appendIngestionRun = backend.appendIngestionRun;
export const updateIngestionRun = backend.updateIngestionRun;
export const listIngestionRuns = backend.listIngestionRuns;
export const listMonitoredSources = backend.listMonitoredSources;
export const upsertMonitoredSource = backend.upsertMonitoredSource;
export const deleteMonitoredSource = backend.deleteMonitoredSource;
export const wipeAll = backend.wipeAll;

export const activeBackend: 'postgres' | 'json' = usePostgres ? 'postgres' : 'json';
