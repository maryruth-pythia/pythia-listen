/**
 * Signal Scout — a human-in-the-loop check-in.
 *
 * Reads the current live dashboard data for a campaign and reports, in plain
 * language, what's notable or shifting — divergences between sources, rising
 * themes, the overall drift — then asks the operator whether it matches what
 * they're hearing on the ground. It observes; the human stays in charge.
 *
 * No web search — runs on any chat-capable model.
 */

import { complete, MODELS } from '../claude';
import { computeDashboard } from '../dashboard/aggregate';
import { getCache } from '../db';

export const SCOUT_MODEL =
  process.env.PYTHIA_AGENT_MODEL ?? MODELS.conversation;

export async function runSignalScout(campaignId: string): Promise<string> {
  const d = await computeDashboard(campaignId);
  if (d.total === 0) {
    return 'No signal to report on yet. Seed the civic record and connect a listening channel, then I can check in on what’s shifting.';
  }

  const drift =
    d.trend.length >= 2
      ? d.trend[d.trend.length - 1].score - d.trend[0].score
      : 0;

  const perSource = d.sources
    .map((s) => `${s.source}: ${s.count} signals, score ${s.score}/100`)
    .join('; ');

  const topThemes = d.themes
    .slice(0, 6)
    .map((t) => `${t.theme} (${t.count})`)
    .join(', ');

  // Themes where the public record and direct listening lean differently.
  const divergences = d.heatmap
    .filter(
      (r) =>
        r.cells.civic.stance &&
        r.cells.pythia.stance &&
        r.cells.civic.stance !== r.cells.pythia.stance
    )
    .map(
      (r) =>
        `${r.theme}: civic reads "${r.cells.civic.stance}", direct listening reads "${r.cells.pythia.stance}"`
    )
    .join('; ');

  const topActors = d.actors
    .slice(0, 5)
    .map((a) => `${a.actor} (${a.count})`)
    .join(', ');

  const context = [
    `Overall social-licence score: ${d.score}/100 (${d.band.label}).`,
    drift !== 0
      ? `Trend: moved ${Math.abs(drift)} points toward ${drift < 0 ? 'opposition' : 'support'} over the record.`
      : '',
    `By source: ${perSource}.`,
    `Top themes: ${topThemes}.`,
    divergences
      ? `Source divergences: ${divergences}.`
      : 'No major source divergences.',
    topActors ? `Most active voices: ${topActors}.` : '',
  ]
    .filter(Boolean)
    .join('\n');

  // Fold in the operator's own recent ground-truth notes so the check-in
  // reflects corrections they've already made (closes the human-in-the-loop).
  let operatorNotes = '';
  try {
    const fb = (await getCache(`scout:feedback:${campaignId}`)) as
      | Array<{ at?: string; aligns?: string | null; note?: string }>
      | null;
    const recent = (fb ?? []).filter((e) => e && (e.note || e.aligns)).slice(-3);
    if (recent.length) {
      operatorNotes = recent
        .map((e) => {
          const verdict =
            e.aligns === 'match' ? 'confirmed the read' : e.aligns === 'off' ? 'said the read was off' : 'noted';
          return `- The organiser ${verdict}${e.note ? `: "${e.note}"` : ''}.`;
        })
        .join('\n');
    }
  } catch {
    /* feedback is optional context */
  }

  const system = [
    `You are Signal Scout inside Pythia, a community-voice platform for`,
    `clean-energy siting. Give a very short check-in on what the data shows —`,
    `the most important shift, then one notable source divergence or rising`,
    `theme — so a community organiser can sanity-check it against what they're`,
    `hearing. You observe and flag; you never decide. Be specific and grounded`,
    `ONLY in the numbers given — do not invent facts.`,
    ``,
    `FORMAT (strict): write ONE short flowing paragraph, 2-3 sentences, UNDER 55`,
    `words, in plain prose. NO markdown, NO headings, NO bold, NO bullet points,`,
    `NO lists. End with a brief question asking whether it matches what they're`,
    `hearing on the ground.`,
    operatorNotes
      ? `\nThe organiser has left recent ground-truth notes below. Weigh them: if they contradict the numbers, acknowledge the organiser's read rather than overriding it.`
      : ``,
  ].filter(Boolean).join('\n');

  return complete({
    model: SCOUT_MODEL,
    maxTokens: 220,
    temperature: 0.5,
    system,
    messages: [
      {
        role: 'user',
        content: `Here is the current signal for this campaign:\n\n${context}${operatorNotes ? `\n\nOrganiser's recent ground-truth notes:\n${operatorNotes}` : ''}\n\nGive me your check-in.`,
      },
    ],
  });
}
