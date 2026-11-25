/**
 * Community-facing Project Reference content.
 *
 * Two pieces feed the /reference page:
 *  - PROJECT_CARDS: a plain-language "what is this project" card per campaign.
 *  - MYTHS: a myth-vs-fact panel about utility-scale solar in general (applies
 *    to any solar project). Bridge framing: every entry names the LEGITIMATE
 *    underlying concern, not just a debunk. Every claim carries a real source.
 *
 * Sources are authoritative and were verified 2026-07-18 (Berkeley Lab / LBNL,
 * FAA, NREL, US DOE, NC State Extension). Nothing here is invented.
 */

export interface RefSource {
  label: string;
  url: string;
}

export type MythVerdict = 'mostly-myth' | 'it-depends' | 'partly-true';

export interface MythFact {
  id: string;
  /** How the worry is usually voiced in the community. */
  claim: string;
  verdict: MythVerdict;
  /** Plain-language answer (2-4 sentences). */
  answer: string;
  /** The legitimate underlying concern we validate (bridge framing). */
  concern: string;
  sources: RefSource[];
}

export interface ProjectCard {
  campaignId: string;
  /** True if the project is illustrative/fictional (demo only). */
  illustrative?: boolean;
  name: string;
  oneLine: string;
  whatItIs: string;
  where: string;
  size: string;
  developer: string;
  process: string;
  status: string;
  benefits: string[];
  commitments: string[];
}

export const VERDICT_META: Record<
  MythVerdict,
  { label: string; color: string; bg: string }
> = {
  'mostly-myth': { label: 'Mostly myth', color: '#4F8A5C', bg: '#EAF3EC' },
  'it-depends': { label: 'It depends', color: '#C77D2A', bg: '#FaF0E2' },
  'partly-true': { label: 'Partly true', color: '#7A6E88', bg: '#F1EEF4' },
};

export const MYTHS: MythFact[] = [
  {
    id: 'property-values',
    claim: 'A solar farm next door will tank my property value.',
    verdict: 'it-depends',
    answer:
      'The largest study to date — Berkeley Lab’s look at 1.8 million home sales near 1,500+ solar projects across six states — found on average about a 1.5% dip for homes within half a mile, and no measurable effect at all in three of the six states. Bigger effects (roughly 4–6%) showed up mainly where large projects replaced farmland in rural areas. For most homes, in most places, the change is small or none.',
    concern:
      'Protecting the value of your home is completely reasonable. Vegetative buffers, screening, and thoughtful siting measurably reduce any effect — those are fair things to ask for in the conditions.',
    sources: [
      {
        label: 'Berkeley Lab (LBNL), “Shedding light on large-scale solar,” 2023',
        url: 'https://emp.lbl.gov/publications/shedding-light-large-scale-solar',
      },
      {
        label: 'Solar Power World summary of the LBNL findings',
        url: 'https://www.solarpowerworldonline.com/2023/03/berkeley-lab-studied-property-values-and-proximity-to-solar-projects-and-found-varied-results/',
      },
    ],
  },
  {
    id: 'glare',
    claim: 'The panels will blind drivers and pilots with glare.',
    verdict: 'mostly-myth',
    answer:
      'Solar panels are engineered to absorb sunlight, not bounce it — reflecting light would defeat their purpose. The FAA treats glare as a controllable, mitigable hazard and requires airports to analyze it before installing solar. A properly sited and screened project is not a blinding hazard.',
    concern:
      'Glare toward a specific home, road, or nearby airstrip is worth checking — and a standard glint-and-glare study does exactly that, with fixes (angling, screening) if any hotspot turns up.',
    sources: [
      {
        label: 'FAA policy on solar projects at airports (2021)',
        url: 'https://www.faa.gov/newsroom/faa-issues-policy-solar-projects-airports',
      },
    ],
  },
  {
    id: 'toxic-leaching',
    claim: 'The panels leak toxic chemicals into our soil and water.',
    verdict: 'mostly-myth',
    answer:
      'The crystalline-silicon panels used in most large projects are sealed glass-and-aluminum units. NREL finds they contain less than 0.1% lead and do not readily leach into soil or groundwater in normal use, and they are not treated as everyday hazardous waste. Damaged-panel handling is covered by standard construction and decommissioning practice.',
    concern:
      'Wanting proof about what sits on the land near your water is fair. It’s reasonable to ask which panel type will be used and to see the decommissioning and any monitoring plan in writing.',
    sources: [
      {
        label: 'NREL solar panel waste & toxicity research (via CleanTechnica)',
        url: 'https://cleantechnica.com/2023/10/13/nrel-explodes-solar-panel-waste-myths/',
      },
      {
        label: 'SEIA PV toxicity fact sheet (2025)',
        url: 'https://seia.org/wp-content/uploads/2025/06/PV-Toxicity-Factsheet_5-2025.pdf',
      },
    ],
  },
  {
    id: 'waste-recycling',
    claim: 'In 30 years it’s just a field of un-recyclable e-waste.',
    verdict: 'it-depends',
    answer:
      'Panels are recyclable and a recycling industry already exists and is growing. NREL projects that even worst-case solar waste through 2050 is small next to other streams — coal ash is produced at up to ~800 times the volume. The real safeguard is a decommissioning bond and a recycling commitment so the developer, not the community, is on the hook at end of life.',
    concern:
      'End-of-life is a genuine question, not a myth. A funded decommissioning guarantee and a recycling/removal commitment in the certificate conditions are exactly the right things to insist on.',
    sources: [
      {
        label: 'NREL: solar panel waste myths (via CleanTechnica)',
        url: 'https://cleantechnica.com/2023/10/13/nrel-explodes-solar-panel-waste-myths/',
      },
    ],
  },
  {
    id: 'farmland',
    claim: 'This permanently destroys prime farmland.',
    verdict: 'it-depends',
    answer:
      'Unlike a subdivision or a warehouse, solar is a temporary and reversible use: the panels are removed at end of life and the ground can return to farming. Agrivoltaics — sheep grazing and pollinator plantings under and around the arrays — keeps the land in agricultural use the whole time, and resting soil can actually recover. It is a pause in row-cropping, not a permanent loss.',
    concern:
      'Losing the best cropland is a legitimate worry worth taking seriously. Prioritizing marginal ground, requiring agrivoltaics where feasible, and a written decommissioning guarantee are reasonable ways to keep farmland farmable.',
    sources: [
      {
        label: 'US DOE — Agrivoltaics: Solar and Agriculture Co-Location',
        url: 'https://www.energy.gov/cmei/systems/agrivoltaics-solar-and-agriculture-co-location',
      },
      {
        label: 'NC State Extension — Solar development on farmland & agrivoltaics',
        url: 'https://farmlaw.ces.ncsu.edu/2024/04/solar-chasing-the-benefits-of-agrivoltaics/',
      },
    ],
  },
];

export const PROJECT_CARDS: Record<string, ProjectCard> = {
  'frasier-solar-knox-oh': {
    campaignId: 'frasier-solar-knox-oh',
    name: 'Frasier Solar',
    oneLine: 'A 120-megawatt solar farm proposed for Knox County, Ohio.',
    whatItIs:
      'A utility-scale solar facility of about 840 acres of panels within a roughly 1,395-acre project area — enough clean electricity for tens of thousands of homes.',
    where: 'Miller & Clinton Townships, near Mount Vernon, Knox County, Ohio.',
    size: '120 MW · ~840 acres of arrays',
    developer: 'Open Road Renewables',
    process: 'Ohio Power Siting Board — docket 23-0796-EL-BGN',
    status:
      'Approved by the OPSB in June 2025 with ~62 conditions; a rehearing request was denied; the decision is on appeal to the Ohio Supreme Court.',
    benefits: [
      'Lease income that helps local farm families keep their land',
      'Property-tax revenue for Knox County schools and services',
      'Local jobs during construction',
      'Optional sheep grazing and pollinator plantings (agrivoltaics)',
    ],
    commitments: [
      'Limited construction hours',
      'Wildlife-permeable fencing',
      'Agricultural-land preservation measures',
      'A decommissioning plan for end of life',
    ],
  },
  'solar-sentiment-oh': {
    campaignId: 'solar-sentiment-oh',
    name: 'Solar in Ohio — the big picture',
    oneLine: 'General community sentiment about utility-scale solar across Ohio.',
    whatItIs:
      'Not one project — a statewide read on how Ohioans feel about solar farms in general, the policy shaping them, and the concerns that come up again and again.',
    where: 'Statewide, Ohio — not tied to a single site.',
    size: 'Multiple projects · statewide',
    developer: 'Various developers',
    process: 'Ohio Power Siting Board + county authority under Senate Bill 52',
    status:
      'Ohio SB 52 (2021) lets county commissioners restrict or block large solar and wind in designated areas — so local sentiment increasingly decides which projects move forward.',
    benefits: [
      'Clean, homegrown power and grid reliability',
      'Property-tax revenue for rural counties and schools',
      'Lease income that helps farm families keep their land',
      'Construction jobs across the state',
    ],
    commitments: [
      'Prioritizing marginal land over prime farmland',
      'Agrivoltaics (grazing + pollinators) where feasible',
      'Funded decommissioning guarantees',
      'Transparent, predictable county processes',
    ],
  },
  'cedar-ridge-solar-madison-oh': {
    campaignId: 'cedar-ridge-solar-madison-oh',
    illustrative: true,
    name: 'Cedar Ridge Solar',
    oneLine: 'A proposed 180-megawatt solar farm in Madison County, Ohio.',
    whatItIs:
      'A utility-scale solar facility spanning parts of two townships, generating clean electricity for tens of thousands of homes. (Illustrative demo project.)',
    where: 'Somerford & Deer Creek Townships, near London, Madison County, Ohio.',
    size: '180 MW',
    developer: 'Prairie State Power',
    process: 'Ohio Power Siting Board — docket 24-0512-EL-BGN (illustrative)',
    status: 'Under review (illustrative demo project).',
    benefits: [
      'Lease income for participating landowners',
      'Property-tax revenue for the Madison-Plains school district',
      'Local construction jobs',
      'Proposed sheep grazing and pollinator plantings (agrivoltaics)',
    ],
    commitments: [
      'Setbacks and vegetative buffers from neighboring homes',
      'A stormwater and drainage plan',
      'Road-repair commitments during construction',
      'A funded decommissioning guarantee',
    ],
  },
  'pw-digital-gateway-va': {
    campaignId: 'pw-digital-gateway-va',
    name: 'Prince William Digital Gateway',
    oneLine:
      'A ~2,100-acre data-center corridor proposed next to Manassas National Battlefield in Prince William County, Virginia.',
    whatItIs:
      'A cluster of large data-center buildings — roughly 23 million square feet — along Pageland Lane, on rural land proposed to be re-designated for technology/industrial use. Data centers are the warehouses of servers that run cloud computing and AI.',
    where:
      'Pageland Lane, near Gainesville & Haymarket, immediately adjacent to Manassas National Battlefield Park, Prince William County, Virginia.',
    size: '~2,100 acres · ~23 million sq ft',
    developer: 'QTS (GW Acquisition) & Compass Datacenters (H&H Capital)',
    process:
      'Comprehensive Plan Amendment + rezoning (CPA/REZ) — Prince William Board of Supervisors',
    status:
      'Approved by the Board of Supervisors in December 2023 after a ~29-hour public hearing; a Circuit Court voided the rezonings in August 2025 over a public-notice failure; the Virginia Court of Appeals affirmed in March 2026 and the developer withdrew its appeal, officially ending the project in July 2026.',
    benefits: [
      'Tens of billions of dollars in capital investment (as pitched by the developers)',
      'County tax revenue to ease pressure on residential property taxes',
      'Construction and long-term operations jobs',
      'Expanded regional digital and grid infrastructure',
    ],
    commitments: [
      'Setbacks and buffers from the battlefield and neighboring homes',
      'Noise attenuation and lighting controls',
      'Water-use and cooling commitments',
      'Transmission-line routing and screening measures',
    ],
  },
};

/**
 * Data-center-specific myth-vs-fact panel. Same bridge framing — name the real
 * concern, never just debunk — but the evidence and sources are about data
 * centers (energy, water, noise, property values), not solar. Verified 2026-07
 * from JLARC (Virginia), George Mason University's Center for Regional
 * Analysis, and the Environmental and Energy Study Institute (EESI).
 */
export const MYTHS_DATACENTER: MythFact[] = [
  {
    id: 'dc-energy-bills',
    claim: 'Data centers will spike everyone’s electricity bills.',
    verdict: 'partly-true',
    answer:
      'Virginia’s legislative watchdog (JLARC) found statewide power demand had been flat for years but would roughly double within a decade, with data centers the main driver. It estimated a typical Dominion residential customer could see generation- and transmission-related costs rise about $14–$37 a month by 2040 — because the grid build-out to serve data centers creates fixed costs utilities recover from everyone. How those costs are allocated is a live policy fight, not settled.',
    concern:
      'Not wanting to subsidize a data center’s power bill is completely fair. The right ask is a cost-allocation structure — dedicated rate classes, ratepayer protections — that puts the grid-upgrade costs on the data centers that drive them, not on households.',
    sources: [
      {
        label: 'JLARC — Data Centers in Virginia (2024)',
        url: 'https://jlarc.virginia.gov/landing-2024-data-centers-in-virginia.asp',
      },
    ],
  },
  {
    id: 'dc-water',
    claim: 'An AI data center will drain our water supply.',
    verdict: 'it-depends',
    answer:
      'It depends heavily on the cooling design. Evaporative-cooled facilities can use large volumes — a big data center can draw up to about 5 million gallons a day — but closed-loop cooling can cut freshwater use by up to ~70%, and direct-to-chip or immersion cooling and recycled/non-potable water reduce it much further. The number isn’t fixed; it’s a design choice.',
    concern:
      'Protecting local water — including the Occoquan watershed — is a legitimate, checkable concern. Asking which cooling technology and which water source a project will use, in writing, is exactly the right thing to require in the conditions.',
    sources: [
      {
        label: 'EESI — Data Centers and Water Consumption',
        url: 'https://www.eesi.org/articles/view/data-centers-and-water-consumption',
      },
    ],
  },
  {
    id: 'dc-noise',
    claim: 'It’ll be a constant hum we can never escape.',
    verdict: 'it-depends',
    answer:
      'Cooling equipment is the main source — cooling towers can emit around 70 dBA within a few hundred feet, and Prince William residents near existing sites have reported noise routinely above 60 decibels, a level that can raise stress. But noise is highly mitigable: setbacks, sound walls, low-noise chillers, and immersion cooling (which removes large fans) all cut it substantially. Outcomes depend on siting and enforceable noise limits.',
    concern:
      'Continuous mechanical noise near homes is a real quality-of-life issue, not nimbyism. Enforceable decibel caps at the property line, generous setbacks, and acoustic screening are reasonable, standard conditions to insist on.',
    sources: [
      {
        label: 'EESI — Communities Raising Noise Concerns About Data Centers',
        url: 'https://www.eesi.org/articles/view/communities-are-raising-noise-pollution-concernsabout-data-centers',
      },
    ],
  },
  {
    id: 'dc-property-values',
    claim: 'A data center next door will tank my home value.',
    verdict: 'mostly-myth',
    answer:
      'The best local evidence points the other way. George Mason University’s Center for Regional Analysis studied 2023 Northern Virginia home sales — including Prince William — and found homes closer to data centers actually sold for more, across single-family, townhouse, and condo types. Data centers tend to locate where infrastructure is strong, and those same features attract buyers. Lot-by-lot effects from an immediately adjacent building can still differ.',
    concern:
      'Your home is likely your biggest asset, so the worry is understandable. Effects right at the fence line — views, noise, lighting — are what buffers, screening, and height limits are for, and are fair to negotiate into the conditions.',
    sources: [
      {
        label: 'George Mason University — Study on home prices near data centers (2025)',
        url: 'https://schar.gmu.edu/news/2025-11/study-home-prices-are-higher-when-house-near-data-center',
      },
    ],
  },
];

/** Myth panel for a campaign: data-center set for the DC campaign, else solar. */
export function getMyths(campaignId: string): MythFact[] {
  if (campaignId === 'pw-digital-gateway-va') return MYTHS_DATACENTER;
  return MYTHS;
}

export function getProjectCard(campaignId: string): ProjectCard | undefined {
  return PROJECT_CARDS[campaignId];
}
