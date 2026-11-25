/**
 * Vibrant Hawaiʻi's seven community indicators, as rated by survey respondents in
 * Puna and Kaʻū (2026). Each indicator is scored 1 = Terrible, 2 = Bad, 3 = Good,
 * 4 = Vibrant. Definitions and response counts are copied from the reports' own tables:
 *  - Puna Climate Resilience & Energy Transition Report (Vibrant Hawaiʻi / KōCreate, 2026), pp. 12–13
 *  - Kaʻū Community Resilience and Energy Transition Report (Vibrant Hawaiʻi / KōCreate, 2026), pp. 10–11
 * © 2026 Vibrant Hawaiʻi — provided privately; not publicly posted.
 *
 * Shown only on boards whose communityViews include 'vibrant'.
 */

export interface IndicatorRatings {
  community: string;
  year: string;
  /** Respondents who chose each rating. */
  terrible: number;
  bad: number;
  good: number;
  vibrant: number;
  /** Published average (1–4). */
  avg: number;
  cite: string;
}

export interface VibrantIndicator {
  id: string;
  label: string;
  /** Vibrant Hawaiʻi's own definition, as printed in the reports. */
  definition: string;
  ratings: IndicatorRatings[];
}

const PUNA = 'Puna report, pp. 12–13';
const KAU = 'Kaʻū report, pp. 10–11';

export const VIBRANT_INDICATORS: VibrantIndicator[] = [
  {
    id: 'vh_strong_ohana',
    label: 'Strong ʻOhana',
    definition: 'ʻOhana as a pillar of support through aloha, belonging, and resilience.',
    ratings: [
      { community: 'Puna', year: '2026', terrible: 5, bad: 34, good: 156, vibrant: 113, avg: 3.22, cite: PUNA },
      { community: 'Kaʻū', year: '2026', terrible: 2, bad: 8, good: 74, vibrant: 48, avg: 3.27, cite: KAU },
    ],
  },
  {
    id: 'vh_living_aloha',
    label: 'Living Aloha',
    definition: 'Being in harmony with our ʻāina, community, and ourselves.',
    ratings: [
      { community: 'Puna', year: '2026', terrible: 3, bad: 31, good: 203, vibrant: 83, avg: 3.14, cite: PUNA },
      { community: 'Kaʻū', year: '2026', terrible: 1, bad: 16, good: 74, vibrant: 44, avg: 3.19, cite: KAU },
    ],
  },
  {
    id: 'vh_belonging',
    label: 'Belonging',
    definition: 'Building relationships to place and people so we can care for and be cared for.',
    ratings: [
      { community: 'Puna', year: '2026', terrible: 4, bad: 48, good: 193, vibrant: 73, avg: 3.05, cite: PUNA },
      { community: 'Kaʻū', year: '2026', terrible: 1, bad: 19, good: 76, vibrant: 36, avg: 3.11, cite: KAU },
    ],
  },
  {
    id: 'vh_resilience',
    label: 'Resilience',
    definition: 'The ability to adapt to change and adversity without being uprooted from what matters.',
    ratings: [
      { community: 'Puna', year: '2026', terrible: 7, bad: 66, good: 166, vibrant: 68, avg: 2.96, cite: PUNA },
      { community: 'Kaʻū', year: '2026', terrible: 4, bad: 25, good: 66, vibrant: 35, avg: 3.02, cite: KAU },
    ],
  },
  {
    id: 'vh_thriving_community',
    label: 'Thriving Community',
    definition: 'Opportunities for individuals and ʻohana to contribute toward community-driven solutions.',
    ratings: [
      { community: 'Puna', year: '2026', terrible: 8, bad: 66, good: 158, vibrant: 75, avg: 2.98, cite: PUNA },
      { community: 'Kaʻū', year: '2026', terrible: 2, bad: 25, good: 73, vibrant: 29, avg: 3.0, cite: KAU },
    ],
  },
  {
    id: 'vh_get_choice',
    label: 'Get Choice',
    definition: 'The ability to take ownership of your future and contribute to collective abundance.',
    ratings: [
      { community: 'Puna', year: '2026', terrible: 10, bad: 90, good: 156, vibrant: 52, avg: 2.81, cite: PUNA },
      { community: 'Kaʻū', year: '2026', terrible: 7, bad: 34, good: 68, vibrant: 20, avg: 2.78, cite: KAU },
    ],
  },
  {
    id: 'vh_get_chance',
    label: 'Get Chance',
    definition: 'Access to equitable systems that promote choice and prosperity.',
    ratings: [
      { community: 'Puna', year: '2026', terrible: 13, bad: 106, good: 142, vibrant: 50, avg: 2.74, cite: PUNA },
      { community: 'Kaʻū', year: '2026', terrible: 6, bad: 41, good: 63, vibrant: 19, avg: 2.74, cite: KAU },
    ],
  },
];

export const ratingTotal = (r: IndicatorRatings) => r.terrible + r.bad + r.good + r.vibrant;
/** Share (0–100, rounded) who rated it Bad or Terrible. */
export const lowShare = (r: IndicatorRatings) => Math.round((100 * (r.terrible + r.bad)) / ratingTotal(r));
/** Share (0–100, rounded) who rated it Vibrant. */
export const vibrantShare = (r: IndicatorRatings) => Math.round((100 * r.vibrant) / ratingTotal(r));
