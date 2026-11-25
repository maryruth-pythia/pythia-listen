/**
 * Illustrative seed data for the Cedar Ridge Solar DEMO campaign.
 *
 * Cedar Ridge is a fictional/illustrative project (Madison County, OH — Prairie
 * State Power, 180 MW). Unlike Frasier and the Digital Gateway, it has no real
 * public record, so these civic + desk signals are clearly-labelled DEMO data
 * used to show what a populated dashboard looks like. Nothing here cites a real
 * external source — every citation points at Pythia's own demo note.
 */

import type { ExtractedSignal } from './extract';

export const CEDAR_CAMPAIGN_ID = 'cedar-ridge-solar-madison-oh';

const DEMO_CITE = {
  url: 'https://thepythia.ai/reference?campaign=cedar-ridge-solar-madison-oh',
  title: 'Illustrative demo — Cedar Ridge Solar (Madison County, OH)',
  publisher: 'Pythia (demo data)',
};

/** Illustrative civic-record signals (source = civic). */
export const CEDAR_CIVIC_SIGNALS: ExtractedSignal[] = [
  {
    sourceType: 'county_action',
    title: 'Madison County commissioners hold SB 52 hearing on the Cedar Ridge area',
    summary:
      '(Illustrative demo.) County commissioners held a Senate Bill 52 hearing on whether to restrict large solar in the Somerford/Deer Creek area where Cedar Ridge Solar is proposed; no restriction was adopted, keeping the OPSB process open.',
    stance: 'neutral',
    themes: ['process', 'sb52', 'land_use'],
    actor: 'Madison County Commissioners',
    salience: 70,
    observedAt: '2026-03-10',
    confidence: 0.6,
    citations: [DEMO_CITE],
  },
  {
    sourceType: 'staff_report',
    title: 'OPSB staff report recommends approval of Cedar Ridge with conditions',
    summary:
      '(Illustrative demo.) Ohio Power Siting Board staff recommended approving the 180 MW Cedar Ridge Solar project (docket 24-0512-EL-BGN) subject to conditions on setbacks, drainage, and decommissioning.',
    stance: 'neutral',
    themes: ['process', 'conditions', 'decommissioning'],
    actor: 'Ohio Power Siting Board staff',
    salience: 72,
    observedAt: '2026-04-02',
    confidence: 0.6,
    citations: [DEMO_CITE],
  },
  {
    sourceType: 'intervention',
    title: 'Deer Creek Township trustees pass a resolution of concern over drainage',
    summary:
      '(Illustrative demo.) Deer Creek Township trustees passed a resolution asking the OPSB to require a detailed stormwater and drainage plan, citing low-lying farmland near Deer Creek.',
    stance: 'concern',
    themes: ['drainage', 'water', 'farmland'],
    actor: 'Deer Creek Township Trustees',
    salience: 64,
    observedAt: '2026-03-24',
    confidence: 0.6,
    citations: [DEMO_CITE],
  },
  {
    sourceType: 'public_comment',
    title: 'Somerford residents raise farmland-loss and property-value concerns',
    summary:
      '(Illustrative demo.) At the public hearing, several Somerford Township residents opposed Cedar Ridge, citing loss of prime farmland and worries about nearby home values.',
    stance: 'opposition',
    themes: ['farmland', 'property_values'],
    actor: 'Somerford Township residents',
    salience: 66,
    observedAt: '2026-04-15',
    confidence: 0.55,
    citations: [DEMO_CITE],
  },
  {
    sourceType: 'news',
    title: 'London-area coverage: Cedar Ridge tax revenue vs. farmland debate',
    summary:
      '(Illustrative demo.) Local coverage framed the Cedar Ridge decision as a trade-off between new property-tax revenue for schools and the conversion of active farmland, with the community split.',
    stance: 'mixed',
    themes: ['tax_revenue', 'farmland', 'schools'],
    actor: 'Local news (illustrative)',
    salience: 60,
    observedAt: '2026-04-20',
    confidence: 0.55,
    citations: [DEMO_CITE],
  },
  {
    sourceType: 'public_comment',
    title: 'Madison-Plains school district notes potential tax revenue',
    summary:
      '(Illustrative demo.) A Madison-Plains school-district representative noted the project could add meaningful property-tax revenue for local schools if approved with a PILOT-style arrangement.',
    stance: 'support',
    themes: ['tax_revenue', 'schools'],
    actor: 'Madison-Plains Local School District',
    salience: 58,
    observedAt: '2026-04-18',
    confidence: 0.55,
    citations: [DEMO_CITE],
  },
];

/** Illustrative desk-research signals (source = desk; internal context). */
export const CEDAR_DESK_SIGNALS: ExtractedSignal[] = [
  {
    sourceType: 'desk_brief',
    title: 'Desk brief: SB 52 county authority in Madison County',
    summary:
      '(Illustrative demo — internal research.) Overview of how Ohio Senate Bill 52 gives Madison County commissioners power to restrict or block large solar, and what that means for the Cedar Ridge timeline.',
    stance: 'neutral',
    themes: ['sb52', 'process', 'land_use'],
    actor: 'Pythia desk research',
    salience: 55,
    confidence: 0.6,
    citations: [DEMO_CITE],
  },
  {
    sourceType: 'desk_brief',
    title: 'Desk brief: agrivoltaics feasibility for Cedar Ridge',
    summary:
      '(Illustrative demo — internal research.) Assessment of sheep grazing and pollinator plantings under the Cedar Ridge arrays as a way to keep land in agricultural use and ease farmland concerns.',
    stance: 'neutral',
    themes: ['agrivoltaics', 'farmland'],
    actor: 'Pythia desk research',
    salience: 52,
    confidence: 0.6,
    citations: [DEMO_CITE],
  },
  {
    sourceType: 'desk_brief',
    title: 'Desk brief: Deer Creek drainage & watershed considerations',
    summary:
      '(Illustrative demo — internal research.) Notes on the Deer Creek watershed and the stormwater conditions a project like Cedar Ridge would typically need to satisfy.',
    stance: 'neutral',
    themes: ['drainage', 'water'],
    actor: 'Pythia desk research',
    salience: 50,
    confidence: 0.6,
    citations: [DEMO_CITE],
  },
  {
    sourceType: 'desk_brief',
    title: 'Desk brief: property-tax / PILOT estimate for Madison-Plains schools',
    summary:
      '(Illustrative demo — internal research.) Rough estimate of the property-tax or PILOT revenue a 180 MW project could generate for the Madison-Plains school district over its lifetime.',
    stance: 'neutral',
    themes: ['tax_revenue', 'schools'],
    actor: 'Pythia desk research',
    salience: 50,
    confidence: 0.55,
    citations: [DEMO_CITE],
  },
];
