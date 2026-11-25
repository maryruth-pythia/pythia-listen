/**
 * Dated DEMO signals for Frasier's desk-research and direct-listening sources.
 *
 * The trend chart can only draw a line for a source that has signal across two
 * or more dated periods. Frasier's civic seeds carry real dates, but its demo
 * desk + direct material didn't — so only the civic line appeared. These add a
 * small set of dated desk and direct signals (clearly demo) spanning several
 * months so all three source lines render. Civic remains the real, cited data.
 */

import type { ExtractedSignal } from './extract';

const DESK_CITE = {
  url: 'https://thepythia.ai/reference?campaign=frasier-solar-knox-oh',
  title: 'Illustrative demo — Pythia desk research (Frasier Solar)',
  publisher: 'Pythia (demo data)',
};

/** Dated desk-research signals (source = desk). */
export const FRASIER_DESK_SIGNALS: ExtractedSignal[] = [
  { sourceType: 'desk_brief', title: 'Desk brief: OPSB timeline & conditions outlook (Frasier)', summary: '(Demo.) Early desk read on the likely OPSB certificate conditions for Frasier Solar.', stance: 'neutral', themes: ['process', 'conditions'], actor: 'Pythia desk research', salience: 52, confidence: 0.6, observedAt: '2025-09-14', citations: [DESK_CITE] },
  { sourceType: 'desk_brief', title: 'Desk brief: farmland-conversion context in Knox County', summary: '(Demo.) Context on prime-farmland acreage and agrivoltaics options around the Frasier site.', stance: 'concern', themes: ['farmland', 'agrivoltaics'], actor: 'Pythia desk research', salience: 50, confidence: 0.6, observedAt: '2025-11-03', citations: [DESK_CITE] },
  { sourceType: 'desk_brief', title: 'Desk brief: property-value evidence review (LBNL)', summary: '(Demo.) Summary of the Berkeley Lab property-value findings applied to the Frasier area.', stance: 'neutral', themes: ['property_values'], actor: 'Pythia desk research', salience: 51, confidence: 0.6, observedAt: '2025-12-10', citations: [DESK_CITE] },
  { sourceType: 'desk_brief', title: 'Desk brief: decommissioning bond benchmarks', summary: '(Demo.) Benchmarks for a funded decommissioning guarantee the community could ask for.', stance: 'neutral', themes: ['decommissioning'], actor: 'Pythia desk research', salience: 50, confidence: 0.6, observedAt: '2026-01-18', citations: [DESK_CITE] },
  { sourceType: 'desk_brief', title: 'Desk brief: benefit-sharing / PILOT options for Knox schools', summary: '(Demo.) Options for directing project tax revenue to local schools via a PILOT.', stance: 'support', themes: ['tax_revenue', 'schools'], actor: 'Pythia desk research', salience: 53, confidence: 0.6, observedAt: '2026-02-08', citations: [DESK_CITE] },
];

/** Dated direct-listening signals (source = pythia). Residents' own voices, demo. */
export const FRASIER_DIRECT_SIGNALS: ExtractedSignal[] = [
  { sourceType: 'channel_listening', title: 'Neighbor worry: drainage on low fields', summary: '(Demo.) A resident near the site worried the arrays would worsen drainage on adjacent low fields.', stance: 'opposition', themes: ['drainage', 'farmland'], actor: 'Miller Twp resident', salience: 48, confidence: 0.5, observedAt: '2025-09-22', citations: [] },
  { sourceType: 'channel_listening', title: 'Question about setbacks from homes', summary: '(Demo.) A neighbor asked what setback distance and screening would separate panels from homes.', stance: 'concern', themes: ['setbacks'], actor: 'Clinton Twp resident', salience: 46, confidence: 0.5, observedAt: '2025-10-30', citations: [] },
  { sourceType: 'channel_listening', title: 'Farmer open to lease income', summary: '(Demo.) A landowner said the lease income would help keep the family farm, if drainage is handled.', stance: 'mixed', themes: ['lease_income', 'farmland'], actor: 'Knox farmer', salience: 47, confidence: 0.5, observedAt: '2025-12-05', citations: [] },
  { sourceType: 'channel_listening', title: 'Support for school tax revenue', summary: '(Demo.) A parent voiced support, pointing to the property-tax revenue for Mount Vernon schools.', stance: 'support', themes: ['tax_revenue', 'schools'], actor: 'Mount Vernon parent', salience: 49, confidence: 0.5, observedAt: '2026-01-12', citations: [] },
  { sourceType: 'channel_listening', title: 'Distrust of an out-of-state developer', summary: '(Demo.) A resident said they doubt an out-of-state developer will keep its written commitments.', stance: 'concern', themes: ['trust', 'developer'], actor: 'Knox County resident', salience: 47, confidence: 0.5, observedAt: '2026-01-28', citations: [] },
  { sourceType: 'channel_listening', title: 'Mixed feelings after the info session', summary: '(Demo.) After a listening session a neighbor felt better informed but still undecided.', stance: 'mixed', themes: ['engagement'], actor: 'Miller Twp resident', salience: 46, confidence: 0.5, observedAt: '2026-02-14', citations: [] },
];
