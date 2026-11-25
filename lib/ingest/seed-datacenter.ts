/**
 * Verified real civic-record signals for the Prince William Digital Gateway
 * data-center campaign (Prince William County, Virginia).
 *
 * Like the Frasier seed, every entry carries a real citation URL and nothing
 * is fabricated. Facts verified 2026-07 from Virginia Business, Prince William
 * Times, NBC Washington, and the American Battlefield Trust.
 */

import type { ExtractedSignal } from './extract';
import type { CollectionContext } from './types';

export const DGATEWAY_CAMPAIGN_ID = 'pw-digital-gateway-va';

export const DGATEWAY_CONTEXT: CollectionContext = {
  campaignId: DGATEWAY_CAMPAIGN_ID,
  projectName: 'Prince William Digital Gateway',
  jurisdiction: 'Prince William County, Virginia',
  docket: 'Comprehensive Plan Amendment + rezoning (CPA/REZ)',
  hints:
    'A ~2,100-acre, ~23 million sq ft data-center corridor next to Manassas National Battlefield Park, developed by QTS (GW Acquisition) and Compass (H&H Capital). Board of Supervisors approved the rezoning Dec 2023 after a 29-hour hearing; courts voided it for public-notice failures; the project ended July 2026.',
};

export const DGATEWAY_SEED_SIGNALS: ExtractedSignal[] = [
  {
    sourceType: 'county_action',
    title: 'Board of Supervisors approves Digital Gateway rezoning after 29-hour hearing',
    summary:
      'On December 12, 2023, the Prince William County Board of Supervisors voted to approve the rezoning for the ~2,100-acre, ~23 million sq ft Digital Gateway data-center corridor, following a marathon public hearing that ran roughly 29 hours.',
    stance: 'neutral',
    themes: ['rezoning', 'process', 'land_use'],
    actor: 'Prince William Board of Supervisors',
    salience: 78,
    observedAt: '2023-12-12',
    confidence: 0.9,
    citations: [
      {
        url: 'https://virginiabusiness.com/prince-william-digital-gateway-data-center-project-officially-dies/',
        title: 'Prince William Digital Gateway data center project officially dies',
        publisher: 'Virginia Business',
      },
    ],
  },
  {
    sourceType: 'court_action',
    title: 'Circuit Court voids the Digital Gateway rezonings over public-notice failure',
    summary:
      'In August 2025, a Prince William Circuit Court judge voided the rezonings, finding the county failed to meet public-notice requirements — a required advertisement never ran because the county did not confirm its placement with the newspaper.',
    stance: 'opposition',
    themes: ['process', 'legal', 'transparency'],
    actor: 'Prince William Circuit Court',
    salience: 82,
    observedAt: '2025-08-01',
    confidence: 0.9,
    citations: [
      {
        url: 'https://www.princewilliamtimes.com/news/breaking-judge-overturns-prince-william-digital-gateway/article_951d6362-1bbd-416f-89c5-ff322bf49fa8.html',
        title: 'Judge overturns Prince William Digital Gateway',
        publisher: 'Prince William Times',
      },
    ],
  },
  {
    sourceType: 'court_action',
    title: 'Virginia Court of Appeals halts the project; developer later withdraws',
    summary:
      'The Virginia Court of Appeals affirmed the lower-court decision in March 2026, and on July 2, 2026 QTS withdrew its appeal petitions — officially ending the Digital Gateway project.',
    stance: 'opposition',
    themes: ['legal', 'process'],
    actor: 'Virginia Court of Appeals',
    salience: 80,
    observedAt: '2026-03-31',
    confidence: 0.9,
    citations: [
      {
        url: 'https://www.nbcwashington.com/news/local/prince-william-digital-gateway-project-halted-by-virginia-court-of-appeals/4084112/',
        title: 'Prince William Digital Gateway project halted by Virginia Court of Appeals',
        publisher: 'NBC Washington',
      },
    ],
  },
  {
    sourceType: 'intervention',
    title: 'American Battlefield Trust opposes project to protect Manassas Battlefield',
    summary:
      'The American Battlefield Trust campaigned against the Digital Gateway, warning that a data-center corridor immediately adjacent to Manassas National Battlefield Park would overwhelm the historic landscape.',
    stance: 'opposition',
    themes: ['battlefield_preservation', 'historic', 'viewshed'],
    actor: 'American Battlefield Trust',
    salience: 74,
    observedAt: '2023-01-01',
    confidence: 0.85,
    citations: [
      {
        url: 'https://www.battlefields.org/preserve/speak-out/stop-prince-william-digital-gateway-and-protect-manassas-battlefield',
        title: 'Stop the Prince William Digital Gateway and Protect Manassas Battlefield',
        publisher: 'American Battlefield Trust',
      },
    ],
  },
  {
    sourceType: 'public_comment',
    title: 'Oak Valley homeowners cite property values, noise, light, and water',
    summary:
      'The 254-member Oak Valley Homeowners Association opposed the project, citing loss of property values, noise, light and sound pollution, and degradation of the water supply.',
    stance: 'opposition',
    themes: ['property_values', 'noise', 'light_pollution', 'water'],
    actor: 'Oak Valley Homeowners Association',
    salience: 66,
    confidence: 0.85,
    citations: [
      {
        url: 'https://virginiabusiness.com/prince-william-digital-gateway-data-center-project-officially-dies/',
        title: 'Prince William Digital Gateway data center project officially dies',
        publisher: 'Virginia Business',
      },
    ],
  },
  {
    sourceType: 'intervention',
    title: 'Coalition warns of unsustainable energy demand and environmental risk',
    summary:
      'The Coalition to Protect Prince William County opposed the Digital Gateway over the data centers’ unsustainable electricity demand and broader environmental risks to the area, including the Occoquan watershed.',
    stance: 'opposition',
    themes: ['energy_demand', 'environment', 'water'],
    actor: 'Coalition to Protect Prince William County',
    salience: 68,
    confidence: 0.8,
    citations: [
      {
        url: 'https://northernvirginiamag.com/news/2026/07/08/prince-william-county-votes-against-massive-data-center-plan/',
        title: 'Prince William County Votes Against Massive Data Center Plan',
        publisher: 'Northern Virginia Magazine',
      },
    ],
  },
  {
    sourceType: 'news',
    title: 'Developers pitched tens of billions in investment, tax revenue, and jobs',
    summary:
      'Supporters of the Digital Gateway, including the developers QTS and Compass, argued the project would deliver tens of billions of dollars in capital investment, substantial county tax revenue, and thousands of jobs.',
    stance: 'support',
    themes: ['tax_revenue', 'jobs', 'economic_development'],
    actor: 'QTS / Compass Datacenters',
    salience: 64,
    confidence: 0.8,
    citations: [
      {
        url: 'https://virginiabusiness.com/prince-william-digital-gateway-data-center-project-officially-dies/',
        title: 'Prince William Digital Gateway data center project officially dies',
        publisher: 'Virginia Business',
      },
    ],
  },
  {
    sourceType: 'news',
    title: 'Project officially dies after developer drops appeal',
    summary:
      'After years of litigation, QTS dropped its appeal in July 2026 and the Prince William Digital Gateway — once one of the largest planned data-center developments in the country — was officially dead.',
    stance: 'mixed',
    themes: ['legal', 'outcome'],
    actor: 'QTS Data Centers',
    salience: 76,
    observedAt: '2026-07-02',
    confidence: 0.9,
    citations: [
      {
        url: 'https://www.fox5dc.com/news/qts-drops-appeal-ending-plans-massive-prince-william-county-data-center',
        title: 'QTS drops appeal, ending plans for massive Prince William County data center',
        publisher: 'FOX 5 DC',
      },
    ],
  },
];
