/**
 * Verified real civic-record signals for the Frasier Solar pilot
 * (OPSB docket 23-0796-EL-BGN, Knox County, Ohio).
 *
 * These are hand-verified from primary and reputable secondary sources
 * (every entry carries a real citation URL). They are inserted as the
 * baseline for the civic bucket so the view shows genuine, cited data even
 * before — and independent of — any live web-search run. The live collector
 * augments and refreshes on top of this baseline.
 *
 * Nothing here is fabricated. Where an exact verbatim quote could not be
 * confirmed, `citedText` is omitted rather than invented.
 */

import type { ExtractedSignal } from './extract';
import type { CollectionContext } from './types';

export const FRASIER_CAMPAIGN_ID = 'frasier-solar-knox-oh';

export const FRASIER_CONTEXT: CollectionContext = {
  campaignId: FRASIER_CAMPAIGN_ID,
  projectName: 'Frasier Solar',
  jurisdiction: 'Knox County, Ohio',
  docket: 'OPSB 23-0796-EL-BGN',
  hints:
    '120 MW solar facility by Open Road Renewables, ~840 acres of arrays within a ~1,395-acre project area in Clinton and Miller townships; Ohio Power Siting Board certificate proceeding.',
};

export const FRASIER_SEED_SIGNALS: ExtractedSignal[] = [
  {
    sourceType: 'application',
    title: 'Open Road Renewables files for 120 MW Frasier Solar facility',
    summary:
      'Open Road Renewables applied to the Ohio Power Siting Board for a 120 MW solar facility covering roughly 840 acres of arrays within a ~1,395-acre project area across Clinton and Miller townships in Knox County.',
    stance: 'neutral',
    themes: ['application', 'land_use', 'capacity'],
    actor: 'Open Road Renewables',
    salience: 70,
    observedAt: '2023-01-01',
    confidence: 0.9,
    citations: [
      {
        url: 'https://dam.assets.ohio.gov/image/upload/puco.ohio.gov/OPSB/FactSheets/Frasier_Solar_Fact_Sheet_final.pdf',
        title: 'Frasier Solar Fact Sheet',
        publisher: 'Ohio Power Siting Board',
      },
    ],
  },
  {
    sourceType: 'staff_report',
    title: 'OPSB staff recommends approval with ~60 conditions',
    summary:
      'The Ohio Power Siting Board staff report of investigation recommended approval subject to roughly 60 conditions, including limited construction hours, wildlife-permeable fencing, and agricultural-land preservation measures.',
    stance: 'neutral',
    themes: ['staff_report', 'conditions', 'wildlife', 'setbacks'],
    actor: 'OPSB Staff',
    salience: 68,
    confidence: 0.85,
    citations: [
      {
        url: 'https://dam.assets.ohio.gov/image/upload/puco.ohio.gov/OPSB/FactSheets/Frasier_Solar_Fact_Sheet_final.pdf',
        title: 'Frasier Solar Fact Sheet',
        publisher: 'Ohio Power Siting Board',
      },
    ],
  },
  {
    sourceType: 'intervention',
    title: 'Ohio Farm Bureau files to intervene',
    summary:
      'The Ohio Farm Bureau Federation filed as an intervenor in the Frasier Solar docket, reflecting agricultural-community interest in how the project affects farmland.',
    stance: 'concern',
    themes: ['farmland', 'intervention', 'agriculture'],
    actor: 'Ohio Farm Bureau Federation',
    salience: 55,
    confidence: 0.85,
    citations: [
      {
        url: 'https://mountvernonnews.com/stories/655664462-ohio-farm-bureau-files-as-interveners-in-the-frasier-solar-project',
        title: 'Ohio Farm Bureau files as interveners in the Frasier Solar project',
        publisher: 'Mount Vernon News',
      },
    ],
  },
  {
    sourceType: 'intervention',
    title: 'Preserve Knox County Ohio LLC intervenes for 17+ property owners',
    summary:
      'Preserve Knox County Ohio LLC (PKCO) intervened as the lead opposition group, representing more than 17 affected property owners contesting the project.',
    stance: 'opposition',
    themes: ['opposition', 'property_owners', 'intervention'],
    actor: 'Preserve Knox County Ohio LLC',
    salience: 62,
    confidence: 0.85,
    citations: [
      {
        url: 'https://www.knoxpages.com/2025/07/27/landowners-appeal-ohio-power-siting-boards-approval-of-frasier-solar-project-in-knox-county/',
        title:
          'Landowners appeal Ohio Power Siting Board’s approval of Frasier Solar',
        publisher: 'Knox Pages',
      },
    ],
  },
  {
    sourceType: 'county_action',
    title: 'Knox County bans utility-scale solar in 20 of 22 townships',
    summary:
      'On Feb 27, 2025 the Knox County commissioners unanimously banned utility-scale solar in 20 of the county’s 22 townships (using Ohio Senate Bill 52 restricted-area powers). Frasier itself was grandfathered because its application predated the restrictions.',
    stance: 'opposition',
    themes: ['county_action', 'sb52', 'moratorium', 'process'],
    actor: 'Knox County Commissioners',
    salience: 78,
    observedAt: '2025-02-27',
    confidence: 0.9,
    citations: [
      {
        url: 'https://www.knoxpages.com/2025/02/27/commissioners-ban-solar-in-20-knox-county-townships/',
        title: 'Commissioners ban solar in 20 Knox County townships',
        publisher: 'Knox Pages',
      },
    ],
  },
  {
    sourceType: 'township_action',
    title: 'Miller Township votes unanimously for a solar ban',
    summary:
      'Miller Township trustees voted unanimously in favor of a solar ban, after the county prosecutor advised caution — one of several local governments to formalize opposition.',
    stance: 'opposition',
    themes: ['township_action', 'opposition', 'sb52'],
    actor: 'Miller Township Trustees',
    salience: 58,
    confidence: 0.85,
    citations: [
      {
        url: 'https://mountvernonnews.com/stories/653746590-after-county-prosecutor-advises-solar-stand-down-miller-township-votes-unanimously-for-solar-ban',
        title:
          'After county prosecutor advises solar stand-down, Miller Township votes unanimously for solar ban',
        publisher: 'Mount Vernon News',
      },
    ],
  },
  {
    sourceType: 'public_comment',
    title: 'Farmland loss is the dominant opposition theme at hearings',
    summary:
      'Across OPSB local hearings, loss of prime farmland to industrial-scale solar was the most repeated objection, alongside visual/glare impacts, drainage/flooding, and road-and-bridge wear.',
    stance: 'opposition',
    themes: ['farmland', 'glare', 'drainage', 'roads', 'public_comment'],
    salience: 72,
    confidence: 0.75,
    citations: [
      {
        url: 'https://mountvernonnews.com/stories/660233174-letter-to-the-editor-overwhelming-majority-against-industrial-solar-farmland-at-3rd-ohio-power-siting-board-hearing',
        title:
          'Letter: Overwhelming majority against industrial solar farmland at 3rd OPSB hearing',
        publisher: 'Mount Vernon News',
      },
    ],
  },
  {
    sourceType: 'public_comment',
    title: 'Roughly 40% of hearing participants voiced support',
    summary:
      'A substantial share of hearing participants (about 40%) supported the project, citing PILOT tax revenue, agrivoltaics (sheep grazing under panels), landowner property rights, and low-cost energy.',
    stance: 'support',
    themes: ['tax_revenue', 'agrivoltaics', 'property_rights', 'public_comment'],
    salience: 66,
    confidence: 0.7,
    citations: [
      {
        url: 'https://www.canarymedia.com/articles/solar/ohio-frasier-approved-local-opposition',
        title:
          'Ohio approved this solar project despite local opposition. Here’s how',
        publisher: 'Canary Media',
      },
    ],
  },
  {
    sourceType: 'public_comment',
    title: 'Project could deliver up to ~$42.8M in local revenue over its life',
    summary:
      'Supporters and the developer point to payment-in-lieu-of-taxes (PILOT) revenue estimated up to roughly $42.8M over the project’s life, including up to ~$19.4M to Mount Vernon City Schools.',
    stance: 'support',
    themes: ['tax_revenue', 'schools', 'pilot'],
    actor: 'Open Road Renewables',
    salience: 64,
    confidence: 0.75,
    citations: [
      {
        url: 'https://www.knoxpages.com/2025/06/26/ohio-power-siting-board-approves-frasier-solar-project-in-knox-county/',
        title: 'Ohio Power Siting Board approves Frasier Solar project in Knox County',
        publisher: 'Knox Pages',
      },
    ],
  },
  {
    sourceType: 'intervention',
    title: 'Ohio Environmental Council testifies in support',
    summary:
      'The Ohio Environmental Council submitted testimony supporting the project; its analysis of public comments concluded that a large share of opponents’ unique arguments were factually unsupported or already addressed by proposed conditions.',
    stance: 'support',
    themes: ['climate', 'testimony', 'process'],
    actor: 'Ohio Environmental Council',
    salience: 57,
    confidence: 0.75,
    citations: [
      {
        url: 'https://theoec.org/news-and-information/ohio-power-siting-boards-decision-in-frasier-solar/',
        title: 'Ohio Power Siting Board’s decision in Frasier Solar',
        publisher: 'Ohio Environmental Council',
      },
    ],
  },
  {
    sourceType: 'order',
    title: 'OPSB approves Frasier Solar 8–1 with 62 conditions',
    summary:
      'On June 26, 2025 the Ohio Power Siting Board voted 8–1 to approve Frasier Solar with 62 conditions (including 50-ft setbacks to non-participating parcels, 300-ft to residences, 7am–7pm construction hours, and a decommissioning bond). The Board found local-government opposition was not unanimous, which was legally pivotal.',
    stance: 'neutral',
    themes: ['order', 'conditions', 'setbacks', 'decommissioning', 'process'],
    actor: 'Ohio Power Siting Board',
    salience: 90,
    observedAt: '2025-06-26',
    confidence: 0.95,
    citations: [
      {
        url: 'https://www.knoxpages.com/2025/06/26/ohio-power-siting-board-approves-frasier-solar-project-in-knox-county/',
        title: 'Ohio Power Siting Board approves Frasier Solar project in Knox County',
        publisher: 'Knox Pages',
      },
      {
        url: 'https://www.wosu.org/2025-06-26/much-debated-knox-county-solar-project-receives-state-approval',
        title: 'Much-debated Knox County solar project receives state approval',
        publisher: 'WOSU',
      },
    ],
  },
  {
    sourceType: 'rehearing',
    title: 'OPSB denies rehearing 8–1',
    summary:
      'On Aug 21, 2025 the Board denied applications for rehearing (filed by Preserve Knox County Ohio and Knox Smart Development) by an 8–1 vote; opponents characterized the decision as a "rubber stamp."',
    stance: 'opposition',
    themes: ['rehearing', 'process', 'opposition'],
    actor: 'Ohio Power Siting Board',
    salience: 74,
    observedAt: '2025-08-21',
    confidence: 0.9,
    citations: [
      {
        url: 'https://www.knoxpages.com/2025/08/21/ohio-power-siting-board-denies-rehearing-request-on-frasier-solar-in-knox-county/',
        title:
          'Ohio Power Siting Board denies rehearing request on Frasier Solar in Knox County',
        publisher: 'Knox Pages',
      },
    ],
  },
  {
    sourceType: 'appeal',
    title: 'Landowners appeal approval to the Ohio Supreme Court',
    summary:
      'Preserve Knox County Ohio and affected property owners appealed the approval to the Ohio Supreme Court, citing public interest, visual impact, agricultural displacement and drainage, road/bridge impacts, and gaps in wildlife-impact data.',
    stance: 'opposition',
    themes: ['appeal', 'farmland', 'drainage', 'wildlife', 'roads'],
    actor: 'Preserve Knox County Ohio LLC',
    salience: 80,
    observedAt: '2025-07-25',
    confidence: 0.85,
    citations: [
      {
        url: 'https://www.knoxpages.com/2025/07/27/landowners-appeal-ohio-power-siting-boards-approval-of-frasier-solar-project-in-knox-county/',
        title: 'Landowners appeal Ohio Power Siting Board’s approval of Frasier Solar',
        publisher: 'Knox Pages',
      },
      {
        url: 'https://mountvernonnews.com/stories/664242087-ohio-supreme-court-may-have-last-word-on-frasier-solar',
        title: 'Ohio Supreme Court may have last word on Frasier Solar',
        publisher: 'Mount Vernon News',
      },
    ],
  },
];
