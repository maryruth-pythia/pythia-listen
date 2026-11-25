/**
 * Precedent / benchmark panel — "how comparable projects reached agreement."
 *
 * Bridge framing: opposition is common, but projects that get to yes do it by
 * writing the community's concerns into enforceable commitments — not by
 * fighting. Curated from authoritative sources (verified 2026-07-18): the Sabin
 * Center opposition database, Ohio Power Siting Board conditions, US DOE / NC
 * State on agrivoltaics, and NREL on panel end-of-life.
 */

export interface PrecedentSource {
  label: string;
  url: string;
}

export interface Precedent {
  id: string;
  /** The mechanism that produced agreement. */
  mechanism: string;
  /** What it looks like in practice. */
  detail: string;
  sources: PrecedentSource[];
}

/** Framing stat: how common contested projects are. */
export const PRECEDENT_LANDSCAPE = {
  headline: '498 renewable-energy projects were contested across 49 states',
  detail:
    'The Sabin Center’s June 2025 count found 498 contested renewable projects (up 32% in a year) and 459 localities with severe siting restrictions. Opposition is now the norm, not the exception — which is exactly why finding shared ground early matters. The projects that reach agreement tend to do it the same few ways.',
  source: {
    label: 'Sabin Center for Climate Change Law, Opposition to Renewable Energy Facilities (June 2025)',
    url: 'https://climate.law.columbia.edu/content/opposition-renewable-energy-facilities-united-states-june-2025-edition',
  } as PrecedentSource,
};

export const PRECEDENTS: Precedent[] = [
  {
    id: 'enforceable-conditions',
    mechanism: 'Enforceable conditions, not promises',
    detail:
      'State siting boards routinely approve solar only with dozens of binding conditions that address the specific concerns raised. Frasier Solar was approved by the Ohio Power Siting Board with roughly 62 conditions — limited construction hours, wildlife-permeable fencing, agricultural-land preservation, and a decommissioning plan. Concerns get resolved by writing them into the certificate, where they’re enforceable, rather than trusting a developer’s word.',
    sources: [
      {
        label: 'Ohio Power Siting Board — Frasier Solar fact sheet & conditions',
        url: 'https://dam.assets.ohio.gov/image/upload/puco.ohio.gov/OPSB/FactSheets/Frasier_Solar_Fact_Sheet_final.pdf',
      },
    ],
  },
  {
    id: 'agrivoltaics',
    mechanism: 'Keep the land farming — agrivoltaics',
    detail:
      'Projects that commit to sheep grazing and pollinator plantings under and around the panels keep the ground in agricultural use and have turned farmer opposition into conditional support. US DOE and NC State Extension document agrivoltaics as a way to co-locate energy and agriculture rather than choosing between them.',
    sources: [
      {
        label: 'US DOE — Agrivoltaics: Solar and Agriculture Co-Location',
        url: 'https://www.energy.gov/cmei/systems/agrivoltaics-solar-and-agriculture-co-location',
      },
      {
        label: 'NC State Extension — Solar development on farmland',
        url: 'https://farmlaw.ces.ncsu.edu/2024/04/solar-chasing-the-benefits-of-agrivoltaics/',
      },
    ],
  },
  {
    id: 'decommissioning',
    mechanism: 'A funded decommissioning guarantee',
    detail:
      'The “field of dead panels in 30 years” fear is resolved with a funded decommissioning bond the county can actually draw on, plus a recycling commitment. NREL finds panels are recyclable and their end-of-life waste is small next to other streams — so the real safeguard is putting the removal obligation, and the money for it, in writing up front.',
    sources: [
      {
        label: 'NREL — solar panel end-of-life & recycling (via CleanTechnica)',
        url: 'https://cleantechnica.com/2023/10/13/nrel-explodes-solar-panel-waste-myths/',
      },
    ],
  },
  {
    id: 'benefit-sharing',
    mechanism: 'Share the benefit locally',
    detail:
      'Agreement is easier when the community sees direct upside: property-tax revenue (often via a PILOT) earmarked for local schools, road-repair funds tied to construction, and local-hire commitments. Making the benefits concrete and local — not abstract and national — is a consistent feature of projects that reach yes.',
    sources: [
      {
        label: 'Sabin Center — patterns in siting outcomes (June 2025 report)',
        url: 'https://climate.law.columbia.edu/content/opposition-renewable-energy-facilities-united-states-june-2025-edition',
      },
    ],
  },
];
