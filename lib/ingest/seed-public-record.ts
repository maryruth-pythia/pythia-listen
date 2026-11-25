/**
 * Public-record-only boards: seed rows generated from public records (a docket, hearing
 * testimony, public comments), one signal per issue per voice, each paraphrasing its cited
 * source. The client boards' rows are left out of this public snapshot.
 */
import type { ExtractedSignal } from './extract';
import type { SignalSource } from '@/lib/types';

export const PR_CAMPAIGN_IDS = [] as string[];

export interface PrSignal extends ExtractedSignal {
  campaigns: string[];
  source: SignalSource;
}

export interface PrSeedGroup {
  campaignId: string;
  source: SignalSource;
  signals: ExtractedSignal[];
}

export const PR_SIGNALS: PrSignal[] = [
];

export function prSeedGroups(): PrSeedGroup[] {
  const map = new Map<string, PrSeedGroup>();
  for (const { campaigns, source, ...signal } of PR_SIGNALS) {
    for (const campaignId of campaigns) {
      const key = `${campaignId}|${source}`;
      let g = map.get(key);
      if (!g) {
        g = { campaignId, source, signals: [] };
        map.set(key, g);
      }
      g.signals.push(signal);
    }
  }
  return [...map.values()];
}
