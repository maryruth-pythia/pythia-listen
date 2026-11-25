/**
 * Direct / Pythia-listening signals.
 *
 * Turns the app's REAL community-conversation data — participants'
 * self-signification scores (lib/signifiers) captured in sessions — into the
 * same normalized `Signal` shape used by the civic bucket, tagged
 * source = 'pythia'. This is live, computed from the database on read; there
 * is nothing seeded or invented here.
 *
 * Only aggregate distributions are produced (counts + means), never any
 * individual's response, so this respects the self-signification and consent
 * model: the operator sees the shape of their own community's signal, not any
 * one person's story.
 *
 * Dyads (0–100 sliders) reduce cleanly to a sentiment; triads are summarized
 * by their dominant pole. Higher dyad values are the more positive/reassuring
 * pole across the library, so a single mapping applies.
 */

import { listSessions } from '../db';
import { SIGNIFIERS, getSignifier } from '../signifiers';
import type { SignifierId } from '../signifiers';
import type { Signal, SignalStance } from '../types';

function meanToStance(mean: number, isOverallStance: boolean): SignalStance {
  if (isOverallStance) {
    if (mean < 20) return 'opposition';
    if (mean < 40) return 'concern';
    if (mean < 60) return 'mixed';
    return 'support';
  }
  // Per-dimension sentiment (low score = negative signal on that dimension).
  if (mean < 40) return 'concern';
  if (mean < 60) return 'mixed';
  return 'support';
}

function descriptor(mean: number): string {
  if (mean < 20) return 'strongly low';
  if (mean < 40) return 'leaning low';
  if (mean < 60) return 'mixed / middle';
  if (mean < 80) return 'leaning high';
  return 'strongly high';
}

/**
 * Build live pythia-source signals for a project from real session data.
 * Returns an empty array if there are no scored sessions.
 */
export async function buildPythiaSignals(projectId: string): Promise<Signal[]> {
  const sessions = await listSessions(projectId);
  const scored = sessions.filter(
    (s) => s.signifierResponses && s.signifierResponses.length > 0
  );
  if (scored.length === 0) return [];

  // Collect dyad values per signifier id.
  const dyadValues = new Map<SignifierId, number[]>();
  const latestAt = new Map<SignifierId, string>();
  for (const s of scored) {
    for (const r of s.signifierResponses ?? []) {
      if (typeof r.dyadValue === 'number') {
        const arr = dyadValues.get(r.signifierId) ?? [];
        arr.push(r.dyadValue);
        dyadValues.set(r.signifierId, arr);
        const prev = latestAt.get(r.signifierId);
        if (!prev || r.capturedAt > prev) latestAt.set(r.signifierId, r.capturedAt);
      }
    }
  }

  const nowIso = new Date().toISOString();
  const signals: Signal[] = [];

  // Preserve canonical library order.
  for (const sig of SIGNIFIERS) {
    if (sig.kind !== 'dyad') continue;
    const values = dyadValues.get(sig.id);
    if (!values || values.length === 0) continue;

    const n = values.length;
    const mean = Math.round(values.reduce((a, b) => a + b, 0) / n);
    const isOverall = sig.id === 'stance';
    const stance = meanToStance(mean, isOverall);
    const dyad = getSignifier(sig.id);
    const poleLow = dyad && dyad.kind === 'dyad' ? dyad.poleLow : '';
    const poleHigh = dyad && dyad.kind === 'dyad' ? dyad.poleHigh : '';

    // Salience: more responses + more polarized (far from 50) = more prominent.
    const polar = Math.abs(mean - 50) / 50; // 0..1
    const salience = Math.min(
      100,
      Math.round((isOverall ? 70 : 40) + polar * 25 + Math.min(n, 20))
    );

    signals.push({
      id: `sig_pythia_${projectId}_${sig.id}`,
      campaignId: projectId,
      source: 'pythia',
      sourceType: isOverall ? 'overall_stance' : 'self_signification',
      title: `${sig.label}: ${descriptor(mean)} (${mean}/100)`,
      summary: `${n} participant${n !== 1 ? 's' : ''} self-scored “${sig.label}”. Mean ${mean}/100 on the scale ${poleLow ? `“${poleLow}” ↔ “${poleHigh}”` : ''}.`,
      stance,
      themes: [sig.id],
      citations: [
        {
          url: '/operator/conversations',
          title: `${n} community conversation${n !== 1 ? 's' : ''} (self-signification)`,
        },
      ],
      salience,
      confidence: Math.min(1, 0.5 + n / 40),
      observedAt: latestAt.get(sig.id),
      ingestedAt: nowIso,
      dedupeKey: `pythia_${sig.id}`,
      origin: 'computed',
    });
  }

  // Headline (overall stance) first, then by salience.
  signals.sort((a, b) => {
    if (a.sourceType === 'overall_stance') return -1;
    if (b.sourceType === 'overall_stance') return 1;
    return (b.salience ?? 0) - (a.salience ?? 0);
  });

  return signals;
}
