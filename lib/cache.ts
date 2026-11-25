/**
 * Tiny result cache for expensive AI analyses (opinion clusters, top
 * questions, Scout). The dashboard renders on every page load; without this
 * each load would re-run several Claude calls for data that hasn't changed.
 *
 * Backed by the app's DB (Postgres in prod / JSON locally) so it survives
 * serverless cold starts and is shared across instances. Cache failures are
 * swallowed — we always fall back to computing fresh.
 */

import { getCache, setCache, clearCache } from './db';

/**
 * Freshness window for dashboard analyses. Analyses are AI-written, so re-running
 * them produces different wording (and sometimes different findings) — two people
 * loading the same board half an hour apart used to see different dashboards.
 * They now stay fixed until the board's data changes (every ingest / seed / tune /
 * weight change calls bustAnalysisCache), with a 7-day safety net for data paths
 * that don't bust yet (survey responses, conversations).
 */
export const ANALYSIS_TTL_MS = Number(
  process.env.PYTHIA_ANALYSIS_TTL_MS ?? String(7 * 24 * 60 * 60 * 1000)
);

/**
 * Return a cached value if it's younger than ttlMs; otherwise run `fn`, store
 * the result (only if `shouldStore` passes), and return it.
 */
export async function cached<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>,
  shouldStore: (result: T) => boolean = () => true
): Promise<T> {
  try {
    const hit = await getCache(key);
    if (hit && Date.now() - new Date(hit.updatedAt).getTime() < ttlMs) {
      return hit.value as T;
    }
  } catch {
    /* cache read failed — compute fresh */
  }
  const startedAt = Date.now();
  const result = await fn();
  try {
    if (shouldStore(result)) {
      // If someone else's run finished and stored while ours was computing, keep
      // theirs, so everyone who loads the board converges on ONE version.
      const raced = await getCache(key).catch(() => null);
      if (raced && new Date(raced.updatedAt).getTime() >= startedAt) return raced.value as T;
      await setCache(key, result);
    }
  } catch {
    /* cache write failed — non-fatal */
  }
  return result;
}

/** Invalidate all cached analyses for a campaign (call after new ingestion). */
export async function bustAnalysisCache(campaignId?: string): Promise<void> {
  try {
    await clearCache(campaignId ? `analysis:${campaignId}:` : 'analysis:');
  } catch {
    /* non-fatal */
  }
}
