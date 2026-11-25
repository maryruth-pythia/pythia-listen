/**
 * Civic-record ingestion orchestrator.
 *
 * Flow:
 *   ensureSeed()  → guarantee a verified, cited baseline exists
 *   collect()     → gather current public-record material (web search)
 *   extract()     → normalize into Signals
 *   upsert()      → store idempotently (deterministic id by dedupe key)
 *
 * The live collect/extract steps are best-effort: if they fail (web search
 * unavailable, model error, empty record), the seeded baseline remains and
 * the run is recorded with an error note rather than throwing. This keeps the
 * civic view populated with real cited data at all times.
 */

import { createHash, randomUUID } from 'node:crypto';
import {
  listSignals,
  upsertSignal,
  appendIngestionRun,
  updateIngestionRun,
  listMonitoredSources,
} from '../db';
import type { Signal, SignalSource, IngestionRun } from '../types';
import type { ExtractedSignal } from './extract';
import { extractSignals } from './extract';
import { webSearchCollector, INGEST_MODEL } from './collectors/web-search';
import type { CollectionContext } from './types';
import {
  FRASIER_CONTEXT,
  FRASIER_SEED_SIGNALS,
  FRASIER_CAMPAIGN_ID,
} from './seed-frasier';

function nowIso() {
  return new Date().toISOString();
}

/** Reject a promise if it doesn't settle within `ms` (keeps the route responsive). */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms)
    ),
  ]);
}

/** Stable dedupe key from the signal's primary URL + normalized title. */
function dedupeKeyFor(sig: ExtractedSignal): string {
  const url = sig.citations[0]?.url ?? '';
  const title = sig.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  return createHash('sha1').update(`${url}::${title}`).digest('hex').slice(0, 16);
}

/** Deterministic id so re-ingesting the same item overwrites rather than dupes. */
function idFor(campaignId: string, source: SignalSource, key: string): string {
  return `sig_${source}_${campaignId}_${key}`;
}

function toSignal(
  ex: ExtractedSignal,
  campaignId: string,
  source: SignalSource,
  origin: Signal['origin']
): Signal {
  const dedupeKey = dedupeKeyFor(ex);
  return {
    id: idFor(campaignId, source, dedupeKey),
    campaignId,
    source,
    sourceType: ex.sourceType,
    title: ex.title,
    summary: ex.summary,
    stance: ex.stance,
    themes: ex.themes,
    actor: ex.actor,
    citations: ex.citations,
    salience: ex.salience,
    confidence: ex.confidence,
    observedAt: ex.observedAt,
    ingestedAt: nowIso(),
    dedupeKey,
    origin,
  };
}

/** The deterministic id a seed signal gets in a campaign + source (for pruning). */
export function seedSignalId(seed: ExtractedSignal, campaignId: string, source: SignalSource): string {
  return idFor(campaignId, source, dedupeKeyFor(seed));
}

/**
 * Insert the verified seed signals for a campaign if they are not already
 * present. Idempotent — deterministic ids mean re-running is a no-op upsert.
 */
export async function ensureSeed(
  campaignId: string,
  seeds: ExtractedSignal[],
  source: SignalSource = 'civic'
): Promise<number> {
  const existing = await listSignals(campaignId, source);
  const existingIds = new Set(existing.map((s) => s.id));
  let inserted = 0;
  for (const seed of seeds) {
    const sig = toSignal(seed, campaignId, source, 'seed');
    if (!existingIds.has(sig.id)) {
      await upsertSignal(sig);
      inserted++;
    }
  }
  return inserted;
}

export interface CivicIngestionResult {
  run: IngestionRun;
  seedInserted: number;
}

/** Run one civic-record ingestion pass for a campaign. */
export async function runCivicIngestion(
  ctx: CollectionContext,
  seeds: ExtractedSignal[]
): Promise<CivicIngestionResult> {
  const run: IngestionRun = {
    id: `run_${randomUUID()}`,
    campaignId: ctx.campaignId,
    source: 'civic',
    startedAt: nowIso(),
    status: 'running',
    model: INGEST_MODEL,
    collected: 0,
    created: 0,
    updated: 0,
  };
  await appendIngestionRun(run);

  // 1) Guarantee the verified baseline.
  const seedInserted = await ensureSeed(ctx.campaignId, seeds);

  // 2) Live augmentation is OPT-IN. It only runs when a web-search-capable
  //    model is configured via PYTHIA_INGEST_MODEL. Without it, we seed and
  //    return immediately — so "Refresh now" never hangs on a model that
  //    can't use the web-search tool.
  if (!process.env.PYTHIA_INGEST_MODEL) {
    run.status = 'ok';
    run.created = seedInserted;
    run.notes =
      seedInserted > 0
        ? `Seeded ${seedInserted} verified record(s). Live web search is off — set PYTHIA_INGEST_MODEL to a web-search-capable model to discover more.`
        : 'Verified baseline already present. Live web search is off (set PYTHIA_INGEST_MODEL to enable).';
    run.finishedAt = nowIso();
    await updateIngestionRun(run);
    return { run, seedInserted };
  }

  try {
    const activeSources = await listMonitoredSources(ctx.campaignId, 'active');
    const ctxWithSources = {
      ...ctx,
      monitoredUrls: [
        ...(ctx.monitoredUrls ?? []),
        ...activeSources.map((s) => s.url),
      ],
    };
    const collection = await withTimeout(
      webSearchCollector.collect(ctxWithSources),
      40000
    );
    run.searchQueries = collection.queries;
    const extracted = await extractSignals(ctx, collection);
    run.collected = collection.sources.length;

    const existing = await listSignals(ctx.campaignId, 'civic');
    const existingIds = new Set(existing.map((s) => s.id));

    let created = 0;
    let updated = 0;
    for (const ex of extracted) {
      const sig = toSignal(ex, ctx.campaignId, 'civic', 'web_search');
      if (existingIds.has(sig.id)) updated++;
      else created++;
      await upsertSignal(sig);
    }
    run.created = created + seedInserted;
    run.updated = updated;
    run.status = 'ok';
    run.notes = `web search ok — ${extracted.length} signals extracted from ${collection.sources.length} sources`;
  } catch (err) {
    run.status = 'error';
    run.created = seedInserted;
    run.error = err instanceof Error ? err.message : String(err);
    run.notes =
      'Live web-search augmentation failed; verified seed baseline is intact. ' +
      'If the model lacks web-search access, set PYTHIA_INGEST_MODEL to a ' +
      'web-search-capable model.';
  }

  run.finishedAt = nowIso();
  await updateIngestionRun(run);
  return { run, seedInserted };
}

/** Convenience: run the Frasier pilot ingestion. */
export function runFrasierIngestion(): Promise<CivicIngestionResult> {
  return runCivicIngestion(FRASIER_CONTEXT, FRASIER_SEED_SIGNALS);
}

export { FRASIER_CAMPAIGN_ID, FRASIER_CONTEXT };
