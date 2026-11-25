/**
 * Real local-population demographics per campaign county, for the
 * "Whose voice is missing" panel. Every figure is a measured value from the
 * U.S. Census Bureau QuickFacts for that county — NOT estimated, NOT
 * model-generated. Each county carries its QuickFacts source URL so the panel
 * can cite it directly. Renter share is derived as (100 − owner-occupied rate).
 *
 * Fetched July 2026 from census.gov/quickfacts. Values are the latest QuickFacts
 * release (blended ACS / decennial vintages, as QuickFacts publishes them).
 */

export interface DemoGroup {
  /** Human label for the group. */
  label: string;
  /** Real share of the county population, in percent (0–100). */
  pct: number;
  /** Why this group is often under-heard in a siting process. */
  hint: string;
}

export interface CountyDemographics {
  county: string;
  population: number;
  source: { label: string; url: string };
  groups: DemoGroup[];
}

export const DEMOGRAPHICS: Record<string, CountyDemographics> = {
  'frasier-solar-knox-oh': {
    county: 'Knox County, Ohio',
    population: 64002,
    source: {
      label: 'U.S. Census Bureau QuickFacts — Knox County, OH',
      url: 'https://www.census.gov/quickfacts/knoxcountyohio',
    },
    groups: [
      { label: 'Women', pct: 50.7, hint: 'Half the county, yet consistently under-represented among who files and testifies.' },
      { label: 'Children & young families (under 18)', pct: 22.3, hint: 'Rarely at weeknight hearings, but they live with the 30-year outcome.' },
      { label: 'Older residents (65+)', pct: 21.5, hint: 'A large share here; digital-only channels can leave them out.' },
      { label: 'Renters (non-landowners)', pct: 24.5, hint: 'No land to lease, but they live beside the project; siting centers landowners.' },
      { label: 'Non-English-speaking households', pct: 6.3, hint: 'English-only notices and hearings leave these homes out.' },
    ],
  },
  'cedar-ridge-solar-madison-oh': {
    county: 'Madison County, Ohio',
    population: 46985,
    source: {
      label: 'U.S. Census Bureau QuickFacts — Madison County, OH',
      url: 'https://www.census.gov/quickfacts/madisoncountyohio',
    },
    groups: [
      { label: 'Women', pct: 45.1, hint: 'Under-represented among filers; county total also reflects a large institutional population.' },
      { label: 'Children & young families (under 18)', pct: 19.9, hint: 'Rarely at weeknight hearings, but they live with the long-term outcome.' },
      { label: 'Older residents (65+)', pct: 18.5, hint: 'Digital-only channels can leave them out.' },
      { label: 'Renters (non-landowners)', pct: 22.5, hint: 'No land to lease, but they live beside the project; siting centers landowners.' },
      { label: 'Non-English-speaking households', pct: 5.7, hint: 'English-only notices and hearings leave these homes out.' },
    ],
  },
  'pw-digital-gateway-va': {
    county: 'Prince William County, Virginia',
    population: 502966,
    source: {
      label: 'U.S. Census Bureau QuickFacts — Prince William County, VA',
      url: 'https://www.census.gov/quickfacts/princewilliamcountyvirginia',
    },
    groups: [
      { label: 'Women', pct: 50.8, hint: 'Half the county, yet under-represented among who files and testifies.' },
      { label: 'Children & young families (under 18)', pct: 25.3, hint: 'A quarter of residents; rarely at hearings, but they inherit the outcome.' },
      { label: 'Renters (non-landowners)', pct: 25.7, hint: 'No land to lease, but they live beside the project.' },
      { label: 'Hispanic or Latino residents', pct: 27.0, hint: 'Over a quarter of the county; often absent from an English-dominated record.' },
      { label: 'Black residents', pct: 21.3, hint: 'A fifth of the county; historically under-weighted in siting decisions.' },
      { label: 'Non-English-speaking households', pct: 36.5, hint: 'More than a third of homes; English-only notice misses them.' },
    ],
  },
};
