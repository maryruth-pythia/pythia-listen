/**
 * Relevance-gated diversity sampling for the AI analyses.
 *
 * The analyses can only fit the top ~70–90 signals in a prompt. Taking those by
 * salience alone silently drops rare-but-important dissent — the lone strong
 * objection, the unique concern — before the model ever sees it. This keeps a
 * salience "core" but RESERVES a slice for outliers: signals with a minority
 * stance or a rare theme. Reserved picks must express a VIEW (never neutral
 * "just information") and are ranked by rarity × relevance, so we surface
 * relevant dissent, not random low-signal noise.
 */
import { Signal } from '../types';

const RESERVE_FRAC = 0.25;

export function selectForAnalysis(all: Signal[], max: number): Signal[] {
  if (all.length <= max) return [...all];

  const salDesc = (a: Signal, b: Signal) => (b.salience ?? 0) - (a.salience ?? 0);
  const sorted = [...all].sort(salDesc);

  const reserve = Math.min(Math.floor(max * RESERVE_FRAC), max - 1);
  const coreN = max - reserve;
  const core = sorted.slice(0, coreN);
  const coreIds = new Set(core.map((s) => s.id));

  // Frequencies over the full corpus → how rare a stance / theme is.
  const n = all.length || 1;
  const stanceFreq: Record<string, number> = {};
  const themeFreq: Record<string, number> = {};
  for (const s of all) {
    stanceFreq[s.stance] = (stanceFreq[s.stance] ?? 0) + 1;
    for (const t of s.themes ?? []) themeFreq[t] = (themeFreq[t] ?? 0) + 1;
  }

  // Candidates for the reserved slots: express a view (relevant, not neutral)
  // and not already in the core.
  const candidates = sorted.filter(
    (s) => !coreIds.has(s.id) && s.stance !== 'neutral'
  );

  const rarity = (s: Signal): number => {
    const stanceRarity = 1 - (stanceFreq[s.stance] ?? 0) / n; // rarer stance → higher
    const themeRarity = (s.themes ?? []).reduce(
      (m, t) => Math.max(m, 1 - (themeFreq[t] ?? 0) / n),
      0
    );
    const relevance = (s.salience ?? 45) / 100; // gate: prefer relevant outliers
    return (stanceRarity + themeRarity) * (0.5 + relevance);
  };

  const reserved = candidates
    .sort((a, b) => rarity(b) - rarity(a))
    .slice(0, reserve);

  return [...core, ...reserved];
}
