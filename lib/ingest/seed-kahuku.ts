/**
 * Kahuku Wind (Nā Pua Makani) — Site Project seed.
 *
 * TWO layers:
 *  1) KAHUKU_CIVIC_SIGNALS — REAL, cited public-record signals (source=civic).
 *     Every entry carries a real, verifiable URL. These power the reference
 *     page's "public documents" block (permitting, legislation, court, town
 *     hall) with genuine sources. Nothing here is invented.
 *  2) KAHUKU_COMMUNITY_SIGNALS — ILLUSTRATIVE, anonymized community-sentiment
 *     signals (source=pythia). These are fictional community voices grounded in
 *     the REAL themes documented for Kahuku (noise, shadow flicker, health,
 *     turbine proximity, ʻōpeʻapeʻa bat, aloha ʻāina, safety, the 2031/2040
 *     removal timeline, plus genuine pro-renewable support). They are
 *     anonymized exactly like the live pipeline (no personal names) and are
 *     honestly marked as demo data via KAHUKU_DEMO_CITE — they do NOT attach
 *     fabricated quotes to real, named people.
 *
 * Real anchor facts (all cited below): 8 turbines, ~568 ft tip height, 24 MW,
 * developed by AES / Na Pua Makani LLC, 20-yr HECO PPA (~16,000 homes); BLNR
 * approved the Habitat Conservation Plan + Incidental Take License (up to 51
 * ʻōpeʻapeʻa over 21 years) in 2018; 200+ arrests during Oct–Nov 2019 protests;
 * grid-connected Aug 2020; Hawaiʻi Supreme Court unanimously affirmed the BLNR
 * decision Feb 22, 2022; Honolulu City Council raised turbine setbacks in Dec
 * 2024, with the Kahuku turbines set to come down at the end of their power
 * contracts (2031 and 2040).
 */

import type { ExtractedSignal } from './extract';
import type { CollectionContext } from './types';

export const KAHUKU_CAMPAIGN_ID = 'kahuku-wind-oahu-hi';

export const KAHUKU_CONTEXT: CollectionContext = {
  campaignId: KAHUKU_CAMPAIGN_ID,
  projectName: 'Nā Pua Makani (Kahuku Wind)',
  jurisdiction: 'Kahuku, Oʻahu (City & County of Honolulu), Hawaiʻi',
  docket: 'BLNR Habitat Conservation Plan / Incidental Take License (Nā Pua Makani)',
  hints:
    '24 MW, 8 wind turbines ~568 ft tall by AES / Na Pua Makani LLC on the North Shore of Oʻahu near Kahuku; 20-year Hawaiian Electric PPA; contested for noise, shadow flicker, health, safety, proximity to homes and Kahuku Elementary, the endangered ʻōpeʻapeʻa (Hawaiian hoary bat), and cultural / aloha ʻāina concerns; turbines set to be decommissioned in 2031 and 2040.',
};

/** Honest label for the illustrative community-sentiment signals. */
const KAHUKU_DEMO_CITE = {
  url: 'https://thepythia.ai/reference?campaign=kahuku-wind-oahu-hi',
  title: 'Illustrative community-sentiment sample — Kahuku Wind (Nā Pua Makani)',
  publisher: 'Pythia (illustrative demo data)',
};

/* ------------------------------------------------------------------ *
 * 1) REAL, CITED PUBLIC-RECORD SIGNALS  (source = civic)
 * ------------------------------------------------------------------ */
export const KAHUKU_CIVIC_SIGNALS: ExtractedSignal[] = [
  {
    sourceType: 'project_fact',
    title: 'Nā Pua Makani: 8 turbines, 24 MW, ~568 ft tall on Oʻahu’s North Shore',
    summary:
      'The Nā Pua Makani wind facility near Kahuku comprises eight wind turbines about 568 feet from base to blade tip (hub ~345 ft), generating 24 MW and selling power to Hawaiian Electric under a 20-year agreement — enough for roughly 16,000 homes.',
    stance: 'neutral',
    themes: ['project_fact', 'capacity', 'turbine_height'],
    actor: 'AES / Na Pua Makani, LLC',
    salience: 72,
    observedAt: '2020-08-01',
    confidence: 0.9,
    citations: [
      {
        url: 'https://www.aes-hawaii.com/na-pua-makani-project',
        title: 'Nā Pua Makani Project',
        publisher: 'AES Hawaiʻi',
      },
    ],
  },
  {
    sourceType: 'permit',
    title: 'BLNR approves Habitat Conservation Plan and Incidental Take License',
    summary:
      'In 2018 the Hawaiʻi Board of Land and Natural Resources approved the project’s Habitat Conservation Plan and Incidental Take License, authorizing the take of up to 51 endangered ʻōpeʻapeʻa (Hawaiian hoary bat) over 21 years, subject to mitigation.',
    stance: 'neutral',
    themes: ['permit', 'wildlife', 'process'],
    actor: 'Board of Land and Natural Resources (BLNR)',
    salience: 70,
    observedAt: '2018-05-01',
    confidence: 0.85,
    citations: [
      {
        url: 'https://dlnr.hawaii.gov/blog/2022/02/22/nr22-025/',
        title: 'State Supreme Court unanimously upholds BLNR decision on Nā Pua Makani',
        publisher: 'Hawaiʻi DLNR',
      },
    ],
  },
  {
    sourceType: 'legal_challenge',
    title: 'Keep the North Shore Country challenges the permits over bat impact',
    summary:
      'The community group Keep the North Shore Country challenged the project’s permits, citing potential harm to the endangered ʻōpeʻapeʻa (Hawaiian hoary bat) and the adequacy of the environmental review.',
    stance: 'concern',
    themes: ['wildlife', 'legal_challenge', 'process'],
    actor: 'Keep the North Shore Country',
    salience: 64,
    observedAt: '2018-09-01',
    confidence: 0.8,
    citations: [
      {
        url: 'https://dlnr.hawaii.gov/blog/2022/02/22/nr22-025/',
        title: 'State Supreme Court unanimously upholds BLNR decision on Nā Pua Makani',
        publisher: 'Hawaiʻi DLNR',
      },
    ],
  },
  {
    sourceType: 'community_org',
    title: 'Kū Kiaʻi Kahuku organizes aloha ʻāina opposition to the turbines',
    summary:
      'The grassroots group Kū Kiaʻi Kahuku organized sustained community opposition to Nā Pua Makani, framing the fight in terms of aloha ʻāina, protection of the community, and concern over turbines much taller and closer to homes than the existing Kahuku Wind farm.',
    stance: 'opposition',
    themes: ['cultural', 'turbine_height', 'community_org'],
    actor: 'Kū Kiaʻi Kahuku',
    salience: 68,
    observedAt: '2019-10-01',
    confidence: 0.8,
    citations: [
      {
        url: 'https://guides.westoahu.hawaii.edu/alohaaina/kukiaikahuku',
        title: 'Kahuku (Wind turbines) — Aloha ʻĀina',
        publisher: 'University of Hawaiʻi — West Oʻahu',
      },
    ],
  },
  {
    sourceType: 'protest',
    title: 'Over 200 arrests during Oct–Nov 2019 turbine-blade protests',
    summary:
      'During the October 2019 delivery of turbine blades, more than 200 people — including kūpuna (elders) and Kahuku students — were arrested over several weeks of protests blocking the convoy route through Kahuku.',
    stance: 'opposition',
    themes: ['protest', 'process', 'community_org'],
    actor: 'Kahuku community (protesters)',
    salience: 74,
    observedAt: '2019-11-01',
    confidence: 0.85,
    citations: [
      {
        url: 'https://www.civilbeat.org/2019/11/more-arrests-as-oahu-wind-farm-protest-enters-second-month/',
        title: 'More Arrests As Oahu Wind Farm Protest Enters Second Month',
        publisher: 'Honolulu Civil Beat',
      },
    ],
  },
  {
    sourceType: 'milestone',
    title: 'Turbines connected to the electric grid in August 2020',
    summary:
      'Despite continued opposition and pending legal challenges, the Nā Pua Makani turbines were connected to Oʻahu’s electric grid in August 2020 and began commercial operation.',
    stance: 'neutral',
    themes: ['milestone', 'process', 'grid'],
    actor: 'AES / Hawaiian Electric',
    salience: 62,
    observedAt: '2020-08-11',
    confidence: 0.85,
    citations: [
      {
        url: 'https://www.staradvertiser.com/2020/08/11/breaking-news/kahuku-wind-project-being-connected-to-electric-grid/',
        title: 'Controversial Kahuku wind project being connected to electric grid',
        publisher: 'Honolulu Star-Advertiser',
      },
    ],
  },
  {
    sourceType: 'public_testimony',
    title: 'Residents report noise up to a mile away, shadow flicker, and headaches',
    summary:
      'North Shore residents told reporters and the City Council that the turbines produce noise audible up to a mile away and a strobe-like shadow flicker inside homes, with complaints of disrupted sleep and headaches — and that the turbines sit far closer to homes than earlier ones.',
    stance: 'concern',
    themes: ['noise', 'shadow_flicker', 'health', 'turbine_height'],
    actor: 'Kahuku / North Shore residents',
    salience: 70,
    observedAt: '2021-06-24',
    confidence: 0.8,
    citations: [
      {
        url: 'https://www.civilbeat.org/2021/06/this-north-shore-community-has-had-enough-of-towering-wind-turbines/',
        title: 'This North Shore Community Has Had Enough Of Towering Wind Turbines',
        publisher: 'Honolulu Civil Beat',
      },
    ],
  },
  {
    sourceType: 'project_fact',
    title: 'Largest turbine sits roughly 1,800 feet from Kahuku Elementary School',
    summary:
      'The largest of the Nā Pua Makani turbines stands about 1,800 feet from Kahuku Elementary School — a proximity repeatedly cited by parents and residents in objections about noise, shadow flicker, and safety.',
    stance: 'concern',
    themes: ['proximity', 'safety', 'health'],
    actor: 'Public record (siting)',
    salience: 66,
    observedAt: '2021-06-24',
    confidence: 0.8,
    citations: [
      {
        url: 'https://www.civilbeat.org/2021/06/this-north-shore-community-has-had-enough-of-towering-wind-turbines/',
        title: 'This North Shore Community Has Had Enough Of Towering Wind Turbines',
        publisher: 'Honolulu Civil Beat',
      },
    ],
  },
  {
    sourceType: 'legislation',
    title: 'Honolulu City Council weighs larger wind-turbine setbacks (2021)',
    summary:
      'In 2021 Honolulu City Council members and the Planning Commission floated stricter wind-turbine setbacks — proposals ranged from 1,500 feet or twice the system height, to 1.25 miles, to as much as 5 miles from property lines.',
    stance: 'neutral',
    themes: ['legislation', 'setbacks', 'process'],
    actor: 'Honolulu City Council',
    salience: 60,
    observedAt: '2021-06-09',
    confidence: 0.8,
    citations: [
      {
        url: 'https://www.staradvertiser.com/2021/06/09/editorial/our-view/editorial-sensible-rules-for-wind-turbines/',
        title: 'Editorial: Sensible rules for wind turbines',
        publisher: 'Honolulu Star-Advertiser',
      },
    ],
  },
  {
    sourceType: 'court_ruling',
    title: 'Hawaiʻi Supreme Court unanimously upholds the BLNR approval (Feb 2022)',
    summary:
      'On February 22, 2022, the Hawaiʻi Supreme Court issued a unanimous 73-page decision affirming the BLNR’s approval of the project’s Habitat Conservation Plan and Incidental Take License, finding substantial evidence supported the Board.',
    stance: 'neutral',
    themes: ['court_ruling', 'wildlife', 'process'],
    actor: 'Hawaiʻi Supreme Court',
    salience: 64,
    observedAt: '2022-02-22',
    confidence: 0.9,
    citations: [
      {
        url: 'https://dlnr.hawaii.gov/blog/2022/02/22/nr22-025/',
        title: 'State Supreme Court unanimously upholds BLNR decision on Nā Pua Makani',
        publisher: 'Hawaiʻi DLNR',
      },
    ],
  },
  {
    sourceType: 'legislation',
    title: 'Council raises setbacks; Kahuku turbines to come down in 2031 and 2040',
    summary:
      'In December 2024 the Honolulu City Council increased turbine setback requirements as part of a land-use overhaul; under the changes the Kahuku wind turbines are slated to be removed at the end of their power-purchase contracts, in 2031 and 2040.',
    stance: 'mixed',
    themes: ['legislation', 'setbacks', 'decommissioning'],
    actor: 'Honolulu City Council',
    salience: 68,
    observedAt: '2024-12-18',
    confidence: 0.85,
    citations: [
      {
        url: 'https://www.wind-watch.org/news/2024/12/18/honolulu-city-council-increases-setback-requirements-kahuku-wind-turbines-will-be-removed-at-end-of-power-contracts-in-2031-and-2040/',
        title:
          'Honolulu City Council increases setback requirements; Kahuku wind turbines will be removed at end of power contracts in 2031 and 2040',
        publisher: 'Wind Energy News (Wind-Watch)',
      },
    ],
  },
  {
    sourceType: 'news',
    title: 'Turbine removal raises questions for Hawaiʻi’s 100%-renewable goal',
    summary:
      'Coverage of the setback changes framed the coming removal of the Kahuku turbines as a setback for Hawaiʻi’s target of 100% renewable electricity by 2045, with the state needing to replace that generation even as it responds to the community’s objections.',
    stance: 'mixed',
    themes: ['clean_energy_goals', 'decommissioning', 'grid'],
    actor: 'Local news / energy analysts',
    salience: 60,
    observedAt: '2024-12-20',
    confidence: 0.75,
    citations: [
      {
        url: 'https://www.civilbeat.org/2024/12/wind-turbines-down-threatening-renewable-energy-goals/',
        title: 'Wind Turbines Set To Come Down, Threatening Hawaiʻi Renewable Energy Goals',
        publisher: 'Honolulu Civil Beat',
      },
    ],
  },
];

/* ------------------------------------------------------------------ *
 * 2) ILLUSTRATIVE COMMUNITY-SENTIMENT SIGNALS  (source = pythia)
 *    Fictional, anonymized voices grounded in the real Kahuku themes.
 *    Salience mirrors the channel-weighting model: interviews / discovery
 *    high (~80–86), public testimony ~65–72, letters ~55–60, email ~42–48,
 *    survey ~45, social posts ~35–40.
 * ------------------------------------------------------------------ */
export const KAHUKU_COMMUNITY_SIGNALS: ExtractedSignal[] = [
  {
    sourceType: 'interview',
    title: 'Kūpuna: the new turbines tower over homes in a way the old ones never did',
    summary:
      'A longtime Kahuku elder recalls accepting the original wind farm, but says the Nā Pua Makani towers are so much taller and closer that they changed the feel of the town — and that the community was not truly listened to before construction.',
    stance: 'opposition',
    themes: ['turbine_height', 'proximity', 'process', 'trust'],
    actor: 'Kahuku kūpuna (longtime resident)',
    salience: 85,
    observedAt: '2026-05-12',
    confidence: 0.6,
    citations: [KAHUKU_DEMO_CITE],
  },
  {
    sourceType: 'interview',
    title: 'Parent near the turbines describes shadow flicker inside the house',
    summary:
      'A parent living close to the turbines describes a strobe-like flicker sweeping through the living room at certain times of day and says their child has trouble sleeping when the blades are turning.',
    stance: 'opposition',
    themes: ['shadow_flicker', 'health', 'proximity'],
    actor: 'Parent near the turbines',
    salience: 84,
    observedAt: '2026-05-14',
    confidence: 0.6,
    citations: [KAHUKU_DEMO_CITE],
  },
  {
    sourceType: 'public_testimony',
    title: 'Resident testifies the low-frequency hum is worst at night',
    summary:
      'At a community meeting a resident testified that the turbine hum carries farthest at night when everything else is quiet, and asked why homes ended up so much closer to the towers than people were led to expect.',
    stance: 'opposition',
    themes: ['noise', 'health', 'trust'],
    actor: 'Kahuku resident',
    salience: 70,
    observedAt: '2026-04-28',
    confidence: 0.55,
    citations: [KAHUKU_DEMO_CITE],
  },
  {
    sourceType: 'letter',
    title: 'Letter: safety fears after seeing footage of a blade failure elsewhere',
    summary:
      'A written comment raises safety fears about blade failure so close to homes and Kahuku Elementary, referencing footage of a turbine failure on another island, and argues the setback was never adequate.',
    stance: 'opposition',
    themes: ['safety', 'proximity', 'turbine_height'],
    actor: 'North Shore resident',
    salience: 58,
    observedAt: '2026-04-19',
    confidence: 0.55,
    citations: [KAHUKU_DEMO_CITE],
  },
  {
    sourceType: 'interview',
    title: 'Cultural practitioner frames the turbines as a breach of aloha ʻāina',
    summary:
      'A Native Hawaiian cultural practitioner describes the towers as an imposition on a place with deep significance, saying the decision-making treated Kahuku as a site to be used rather than a community to be asked.',
    stance: 'opposition',
    themes: ['cultural', 'trust', 'process'],
    actor: 'Native Hawaiian cultural practitioner',
    salience: 86,
    observedAt: '2026-05-03',
    confidence: 0.6,
    citations: [KAHUKU_DEMO_CITE],
  },
  {
    sourceType: 'email',
    title: 'Email: “we were arrested protecting our own town”',
    summary:
      'A resident who was among those arrested during the 2019 blade convoy writes that the community warned about noise and proximity for years and was ignored, and that the coming removal is vindication, not victory.',
    stance: 'opposition',
    themes: ['process', 'trust', 'protest'],
    actor: 'Kahuku resident (2019 protests)',
    salience: 46,
    observedAt: '2026-04-11',
    confidence: 0.55,
    citations: [KAHUKU_DEMO_CITE],
  },
  {
    sourceType: 'social_post',
    title: 'Post: turbines still too loud six years on',
    summary:
      'A short social post from a North Shore account says the turbines are still too loud on windy nights and that residents should not have to wait until 2031 for relief.',
    stance: 'opposition',
    themes: ['noise', 'decommissioning'],
    actor: 'North Shore social account',
    salience: 38,
    observedAt: '2026-05-20',
    confidence: 0.5,
    citations: [KAHUKU_DEMO_CITE],
  },
  {
    sourceType: 'public_testimony',
    title: 'Elementary-school parent wants the school turbine gone first',
    summary:
      'A Kahuku Elementary parent testifies that the turbine nearest the school should be the first decommissioned, citing shadow flicker over the play field and worry about blade safety during strong trades.',
    stance: 'opposition',
    themes: ['safety', 'shadow_flicker', 'proximity'],
    actor: 'Kahuku Elementary parent',
    salience: 68,
    observedAt: '2026-04-30',
    confidence: 0.55,
    citations: [KAHUKU_DEMO_CITE],
  },
  {
    sourceType: 'interview',
    title: 'Renter: noise made a rental unlivable, family moved inland',
    summary:
      'A former Kahuku renter recounts moving further from the coast because the turbine noise and flicker made the unit hard to live in, and worries the same pattern pushes working families out of the area.',
    stance: 'opposition',
    themes: ['noise', 'health', 'property_values'],
    actor: 'Former Kahuku renter',
    salience: 82,
    observedAt: '2026-05-08',
    confidence: 0.55,
    citations: [KAHUKU_DEMO_CITE],
  },
  {
    sourceType: 'whatsapp',
    title: 'Neighborhood thread: “count me in for the next council hearing”',
    summary:
      'In a neighborhood messaging thread a resident rallies neighbors to show up to the next council hearing on setbacks and decommissioning, saying turnout is the only thing that has ever moved the issue.',
    stance: 'opposition',
    themes: ['process', 'community_org'],
    actor: 'Kahuku neighbor (group thread)',
    salience: 40,
    observedAt: '2026-05-18',
    confidence: 0.5,
    citations: [KAHUKU_DEMO_CITE],
  },
  {
    sourceType: 'letter',
    title: 'Letter: distrust of AES after years of unmet promises',
    summary:
      'A written comment says residents no longer trust the developer’s assurances about noise mitigation, listing complaints they feel were never resolved, and asks the county to hold firm on the removal dates.',
    stance: 'opposition',
    themes: ['trust', 'noise', 'decommissioning'],
    actor: 'Kahuku resident',
    salience: 56,
    observedAt: '2026-04-22',
    confidence: 0.55,
    citations: [KAHUKU_DEMO_CITE],
  },
  {
    sourceType: 'social_post',
    title: 'Post: “aloha ʻāina — protect Kahuku”',
    summary:
      'A social post reshares the aloha ʻāina framing from the original Kū Kiaʻi Kahuku movement and calls the setback win a model for other communities facing large projects.',
    stance: 'opposition',
    themes: ['cultural', 'community_org'],
    actor: 'Community social account',
    salience: 36,
    observedAt: '2026-05-22',
    confidence: 0.5,
    citations: [KAHUKU_DEMO_CITE],
  },
  {
    sourceType: 'interview',
    title: 'Fisher: turbines changed the ridgeline and the sense of place',
    summary:
      'A North Shore fisher describes how the towers dominate the ridgeline coming home from the water, and says the loss is as much about the character of the place as about measurable noise.',
    stance: 'opposition',
    themes: ['cultural', 'viewshed'],
    actor: 'North Shore fisher',
    salience: 80,
    observedAt: '2026-05-06',
    confidence: 0.55,
    citations: [KAHUKU_DEMO_CITE],
  },
  {
    sourceType: 'public_testimony',
    title: 'Resident links the turbines to falling interest in nearby homes',
    summary:
      'A resident testifies that homes closest to the turbines have been harder to sell and rent, and asks whether any compensation is owed to families who bought before the towers went up.',
    stance: 'opposition',
    themes: ['property_values', 'proximity'],
    actor: 'Kahuku homeowner',
    salience: 66,
    observedAt: '2026-04-27',
    confidence: 0.5,
    citations: [KAHUKU_DEMO_CITE],
  },
  {
    sourceType: 'interview',
    title: 'Kupuna worried about the bats caught in the blades',
    summary:
      'An elder expresses specific concern for the ʻōpeʻapeʻa, the endangered Hawaiian hoary bat, asking what is actually being done to monitor and reduce bat deaths at the turbines.',
    stance: 'concern',
    themes: ['wildlife', 'process'],
    actor: 'Kahuku kūpuna',
    salience: 83,
    observedAt: '2026-05-11',
    confidence: 0.55,
    citations: [KAHUKU_DEMO_CITE],
  },
  {
    sourceType: 'email',
    title: 'Email asking for real noise monitoring, not developer self-reports',
    summary:
      'A resident emails asking the county to require independent, published noise monitoring rather than relying on the developer’s own measurements, saying trust would improve if the data were public.',
    stance: 'concern',
    themes: ['noise', 'trust', 'process'],
    actor: 'Kahuku resident',
    salience: 45,
    observedAt: '2026-04-16',
    confidence: 0.55,
    citations: [KAHUKU_DEMO_CITE],
  },
  {
    sourceType: 'survey_response',
    title: 'Survey: supports clean energy but not this close to homes',
    summary:
      'A survey respondent says they support renewable energy for Hawaiʻi in principle but feel Kahuku carried an unfair share of the burden, and wants future projects sited far from residential areas.',
    stance: 'concern',
    themes: ['clean_energy_goals', 'proximity', 'equity'],
    actor: 'Kahuku survey respondent',
    salience: 45,
    observedAt: '2026-05-01',
    confidence: 0.5,
    citations: [KAHUKU_DEMO_CITE],
  },
  {
    sourceType: 'interview',
    title: 'Small-business owner worried about what replaces the lost power',
    summary:
      'A North Shore small-business owner is uneasy about the turbines coming down without a clear replacement, fearing higher electricity bills or more oil burning if the removed generation isn’t backfilled with local solar and storage.',
    stance: 'concern',
    themes: ['clean_energy_goals', 'grid', 'decommissioning'],
    actor: 'North Shore small-business owner',
    salience: 82,
    observedAt: '2026-05-09',
    confidence: 0.55,
    citations: [KAHUKU_DEMO_CITE],
  },
  {
    sourceType: 'public_testimony',
    title: 'Resident asks who pays to take the turbines down safely',
    summary:
      'A resident testifies in support of removal but asks for clear answers on who is financially responsible for safe decommissioning and land restoration, so the community isn’t left with the cleanup.',
    stance: 'concern',
    themes: ['decommissioning', 'process', 'trust'],
    actor: 'Kahuku resident',
    salience: 65,
    observedAt: '2026-04-29',
    confidence: 0.5,
    citations: [KAHUKU_DEMO_CITE],
  },
  {
    sourceType: 'email',
    title: 'Email: shadow flicker only bad a few weeks a year — but no one measures it',
    summary:
      'A resident writes that the flicker is genuinely disruptive for a few weeks each season as the sun angle shifts, and is frustrated that seasonal impacts get dismissed because they aren’t constant.',
    stance: 'concern',
    themes: ['shadow_flicker', 'health'],
    actor: 'Kahuku resident',
    salience: 44,
    observedAt: '2026-04-13',
    confidence: 0.5,
    citations: [KAHUKU_DEMO_CITE],
  },
  {
    sourceType: 'interview',
    title: 'Teacher: kids ask why the turbines are so close to school',
    summary:
      'A Kahuku teacher relays that students notice and ask about the turbines near the school, and wishes there were a straightforward, trusted explanation of safety and the removal timeline to give them.',
    stance: 'concern',
    themes: ['proximity', 'safety', 'trust'],
    actor: 'Kahuku teacher',
    salience: 81,
    observedAt: '2026-05-05',
    confidence: 0.55,
    citations: [KAHUKU_DEMO_CITE],
  },
  {
    sourceType: 'survey_response',
    title: 'Survey: neighbors split, wants a real community vote next time',
    summary:
      'A respondent notes the neighborhood is genuinely divided and asks that any future energy project near Kahuku include a binding community-input step early, before equipment is ordered.',
    stance: 'concern',
    themes: ['process', 'equity'],
    actor: 'Kahuku survey respondent',
    salience: 45,
    observedAt: '2026-05-02',
    confidence: 0.5,
    citations: [KAHUKU_DEMO_CITE],
  },
  {
    sourceType: 'whatsapp',
    title: 'Thread: is the hum worse or are we just used to noticing it?',
    summary:
      'In a group thread neighbors debate whether the noise has actually worsened or whether attention has made it more noticeable, with several agreeing they’d welcome objective monitoring to settle it.',
    stance: 'concern',
    themes: ['noise', 'trust'],
    actor: 'Kahuku neighbors (group thread)',
    salience: 40,
    observedAt: '2026-05-16',
    confidence: 0.45,
    citations: [KAHUKU_DEMO_CITE],
  },
  {
    sourceType: 'letter',
    title: 'Letter: keep the bat monitoring going even as turbines wind down',
    summary:
      'A comment urges that ʻōpeʻapeʻa monitoring and mitigation continue through the decommissioning period, warning that attention to wildlife often lapses once a project is politically “settled.”',
    stance: 'concern',
    themes: ['wildlife', 'decommissioning'],
    actor: 'North Shore resident',
    salience: 55,
    observedAt: '2026-04-24',
    confidence: 0.5,
    citations: [KAHUKU_DEMO_CITE],
  },
  {
    sourceType: 'interview',
    title: 'Resident: proud of the clean power, tired of the noise',
    summary:
      'A resident holds both feelings at once — genuinely proud that Kahuku produces clean energy for the island, and genuinely worn down by the noise near their home — and wishes the debate allowed for that ambivalence.',
    stance: 'mixed',
    themes: ['clean_energy_goals', 'noise'],
    actor: 'Kahuku resident',
    salience: 84,
    observedAt: '2026-05-13',
    confidence: 0.55,
    citations: [KAHUKU_DEMO_CITE],
  },
  {
    sourceType: 'public_testimony',
    title: 'Testimony: remove the worst turbines, keep the ones far from homes',
    summary:
      'A resident proposes a middle path — decommission the turbines closest to homes and the school early, but consider keeping the more distant ones running to preserve some clean generation.',
    stance: 'mixed',
    themes: ['decommissioning', 'proximity', 'clean_energy_goals'],
    actor: 'Kahuku resident',
    salience: 67,
    observedAt: '2026-04-26',
    confidence: 0.5,
    citations: [KAHUKU_DEMO_CITE],
  },
  {
    sourceType: 'email',
    title: 'Email from a renewable supporter frustrated with AES’s process',
    summary:
      'An Oʻahu clean-energy supporter writes that they back wind power but think the developer’s handling of Kahuku set the whole movement back, and that better community process would have avoided the removal outcome.',
    stance: 'mixed',
    themes: ['process', 'clean_energy_goals', 'trust'],
    actor: 'Oʻahu renewable-energy supporter',
    salience: 47,
    observedAt: '2026-04-17',
    confidence: 0.55,
    citations: [KAHUKU_DEMO_CITE],
  },
  {
    sourceType: 'interview',
    title: 'Young resident weighs climate stakes against neighbors’ complaints',
    summary:
      'A younger Kahuku resident says they take the climate crisis seriously and hate to lose clean generation, but also can’t dismiss elders and families who live with the noise every day, and feels caught between them.',
    stance: 'mixed',
    themes: ['clean_energy_goals', 'noise', 'equity'],
    actor: 'Kahuku young adult',
    salience: 82,
    observedAt: '2026-05-10',
    confidence: 0.55,
    citations: [KAHUKU_DEMO_CITE],
  },
  {
    sourceType: 'survey_response',
    title: 'Survey: fine with wind, not fine with how far the towers loom',
    summary:
      'A respondent says wind energy itself doesn’t bother them, but the sheer height of these particular turbines over the town does, and they’d support replacements that are shorter or offshore.',
    stance: 'mixed',
    themes: ['turbine_height', 'clean_energy_goals'],
    actor: 'Kahuku survey respondent',
    salience: 45,
    observedAt: '2026-05-04',
    confidence: 0.5,
    citations: [KAHUKU_DEMO_CITE],
  },
  {
    sourceType: 'interview',
    title: 'Resident defends the turbines: “this is our part for the islands”',
    summary:
      'A Kahuku resident says they’ve gotten used to the turbines and are proud the community contributes clean power, arguing the noise is overstated and that removing the towers just sends the problem — and the emissions — somewhere else.',
    stance: 'support',
    themes: ['clean_energy_goals', 'noise'],
    actor: 'Kahuku resident',
    salience: 83,
    observedAt: '2026-05-15',
    confidence: 0.55,
    citations: [KAHUKU_DEMO_CITE],
  },
  {
    sourceType: 'email',
    title: 'Email: worried removal means more imported oil for Oʻahu',
    summary:
      'A resident emails in support of keeping the turbines, warning that taking them down will likely mean burning more imported oil and higher bills, and asks whether that trade-off has been honestly explained.',
    stance: 'support',
    themes: ['clean_energy_goals', 'grid', 'decommissioning'],
    actor: 'Oʻahu resident',
    salience: 46,
    observedAt: '2026-04-15',
    confidence: 0.5,
    citations: [KAHUKU_DEMO_CITE],
  },
  {
    sourceType: 'public_testimony',
    title: 'Clean-energy advocate urges replacement plan before removal',
    summary:
      'An advocate testifies in support of the turbines’ climate contribution and urges the county not to remove generation without a firm, funded plan to replace it with local solar and storage first.',
    stance: 'support',
    themes: ['clean_energy_goals', 'grid'],
    actor: 'Oʻahu clean-energy advocate',
    salience: 65,
    observedAt: '2026-04-25',
    confidence: 0.5,
    citations: [KAHUKU_DEMO_CITE],
  },
  {
    sourceType: 'social_post',
    title: 'Post: proud the North Shore powers thousands of homes',
    summary:
      'A social post celebrates that the Kahuku turbines have supplied clean power for roughly 16,000 homes and argues the island shouldn’t walk away from that lightly.',
    stance: 'support',
    themes: ['clean_energy_goals'],
    actor: 'Oʻahu social account',
    salience: 37,
    observedAt: '2026-05-21',
    confidence: 0.5,
    citations: [KAHUKU_DEMO_CITE],
  },
  {
    sourceType: 'interview',
    title: 'Worker: the project meant real jobs during construction',
    summary:
      'A tradesperson recalls that the project brought steady construction work to the area and says that side of the story rarely gets told alongside the opposition.',
    stance: 'support',
    themes: ['jobs', 'clean_energy_goals'],
    actor: 'Local construction worker',
    salience: 80,
    observedAt: '2026-05-07',
    confidence: 0.5,
    citations: [KAHUKU_DEMO_CITE],
  },
  {
    sourceType: 'survey_response',
    title: 'Survey: keep them running to 2040, then reassess',
    summary:
      'A respondent supports letting the turbines run out their contracts to 2040 rather than early removal, reasoning that the disruption of building them is already paid and the clean power is worth keeping.',
    stance: 'support',
    themes: ['clean_energy_goals', 'decommissioning'],
    actor: 'Oʻahu survey respondent',
    salience: 45,
    observedAt: '2026-05-03',
    confidence: 0.5,
    citations: [KAHUKU_DEMO_CITE],
  },
  {
    sourceType: 'email',
    title: 'Email asking where to find the decommissioning schedule',
    summary:
      'A resident emails simply asking where the official 2031 and 2040 removal schedule is published and who to contact with questions — an information request rather than a position.',
    stance: 'neutral',
    themes: ['decommissioning', 'process'],
    actor: 'Kahuku resident',
    salience: 42,
    observedAt: '2026-04-14',
    confidence: 0.5,
    citations: [KAHUKU_DEMO_CITE],
  },
  {
    sourceType: 'whatsapp',
    title: 'Thread: when is the next council hearing on setbacks?',
    summary:
      'A group-thread message asks for the date and location of the next council hearing on turbine setbacks so neighbors can plan to attend — logistics only.',
    stance: 'neutral',
    themes: ['process'],
    actor: 'Kahuku neighbors (group thread)',
    salience: 39,
    observedAt: '2026-05-17',
    confidence: 0.45,
    citations: [KAHUKU_DEMO_CITE],
  },
  {
    sourceType: 'survey_response',
    title: 'Survey: no strong opinion, just wants clear updates',
    summary:
      'A respondent reports no strong feelings either way and mainly wants clearer, regular updates from the county on timelines and any noise or safety monitoring.',
    stance: 'neutral',
    themes: ['process', 'trust'],
    actor: 'Kahuku survey respondent',
    salience: 44,
    observedAt: '2026-05-04',
    confidence: 0.45,
    citations: [KAHUKU_DEMO_CITE],
  },
  {
    sourceType: 'email',
    title: 'Email requesting the bat-monitoring reports',
    summary:
      'A resident asks where the ʻōpeʻapeʻa monitoring reports required under the Incidental Take License are posted, wanting to read the actual data — an information request.',
    stance: 'neutral',
    themes: ['wildlife', 'process'],
    actor: 'Oʻahu resident',
    salience: 43,
    observedAt: '2026-04-18',
    confidence: 0.5,
    citations: [KAHUKU_DEMO_CITE],
  },
];
