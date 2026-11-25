/**
 * Backfill a newly-created Watch from data Pythia ALREADY has.
 *
 * When an operator creates a new Watch, no new upload happens — their email and
 * Drive are already ingested as channel signals. This re-reads the existing
 * channel signals and, using the new Watch's routing definition, pulls the ones
 * that clearly belong into it (moving them out of whatever bucket the router
 * had previously guessed). It is conservative: it only MOVES a signal INTO the
 * new Watch when the model is confident it belongs; it never reshuffles signals
 * between the other existing Watches.
 *
 * The signal's stable `id` is left unchanged (its dedupeKey, not its campaign,
 * is what makes ingestion idempotent); only the `campaignId` field is updated,
 * which is what every dashboard query filters on.
 */

import { complete } from '../claude';
import { EXTRACT_MODEL } from './extract';
import { listSignals, upsertSignal } from '../db';
import { getCampaignById } from '../campaigns';
import { bustAnalysisCache } from '../cache';
import type { Signal } from '../types';

interface Candidate {
  n: number;
  signal: Signal;
}

function matchPrompt(routing: string, watchName: string, batch: Candidate[]): string {
  const blocks = batch
    .map((c) => {
      const themes = (c.signal.themes ?? []).join(', ');
      return `#${c.n} | ${c.signal.title}\n${c.signal.summary}${
        themes ? `\n(themes: ${themes})` : ''
      }`;
    })
    .join('\n\n---\n\n');
  return [
    `A Pythia operator just created a new "Watch" (a dashboard topic bucket)`,
    `named "${watchName}". Here is exactly what belongs in it:`,
    ``,
    `=== WATCH DEFINITION ===`,
    routing,
    ``,
    `Below are community signals Pythia already collected, which may currently`,
    `sit in other buckets. Decide which ones CLEARLY belong in this new Watch`,
    `per the definition above. Be strict: include a number ONLY if the signal`,
    `is really about this Watch's subject. When unsure, leave it out.`,
    ``,
    `Return ONLY a JSON array of the matching item numbers (integers), e.g.`,
    `[1, 4, 5]. If none match, return [].`,
    ``,
    `=== SIGNALS ===`,
    blocks,
  ].join('\n');
}

function parseNumbers(raw: string): number[] {
  let t = raw.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const start = t.indexOf('[');
  const end = t.lastIndexOf(']');
  if (start === -1 || end === -1 || end < start) return [];
  try {
    const parsed = JSON.parse(t.slice(start, end + 1));
    return Array.isArray(parsed)
      ? parsed.filter((x): x is number => typeof x === 'number' && Number.isFinite(x))
      : [];
  } catch {
    return [];
  }
}

async function mapLimit<T, R>(
  arr: T[],
  limit: number,
  fn: (x: T) => Promise<R>
): Promise<R[]> {
  const res: R[] = new Array(arr.length);
  let i = 0;
  async function worker(): Promise<void> {
    while (i < arr.length) {
      const idx = i++;
      res[idx] = await fn(arr[idx]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, arr.length) }, () => worker())
  );
  return res;
}

export interface BackfillResult {
  campaignId: string;
  scanned: number;
  moved: number;
}

/**
 * Re-classify existing channel signals against the new Watch and move matches
 * into it. Signals already in this Watch are skipped.
 */
export async function backfillWatch(campaignId: string): Promise<BackfillResult> {
  const watch = await getCampaignById(campaignId);
  if (!watch) throw new Error('Unknown Watch id.');

  const all = await listSignals();
  const candidates: Candidate[] = all
    .filter((s) => s.origin === 'channel' && s.campaignId !== campaignId)
    .map((s, i) => ({ n: i + 1, signal: s }));

  if (candidates.length === 0) {
    return { campaignId, scanned: 0, moved: 0 };
  }

  const BATCH = Number(process.env.PYTHIA_BACKFILL_BATCH ?? '12');
  const batches: Candidate[][] = [];
  for (let i = 0; i < candidates.length; i += BATCH) {
    batches.push(candidates.slice(i, i + BATCH));
  }

  const perBatch = await mapLimit(batches, 4, async (batch) => {
    try {
      const raw = await complete({
        model: EXTRACT_MODEL,
        maxTokens: 500,
        temperature: 0,
        messages: [
          { role: 'user', content: matchPrompt(watch.routing, watch.name, batch) },
        ],
      });
      const hits = new Set(parseNumbers(raw));
      return batch.filter((c) => hits.has(c.n)).map((c) => c.signal);
    } catch {
      return [] as Signal[];
    }
  });

  const toMove = perBatch.flat();
  let moved = 0;
  for (const sig of toMove) {
    await upsertSignal({ ...sig, campaignId });
    moved++;
  }
  if (moved > 0) await bustAnalysisCache();

  return { campaignId, scanned: candidates.length, moved };
}
