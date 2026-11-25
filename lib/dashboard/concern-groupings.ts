/**
 * How to split a board's communities into up to three groups for the concern Venn diagram.
 * Community-level only: HSEO's 2022 reports give census profiles per community, not per
 * person, so a group is a set of places, described by those places' published figures.
 * Never group by ethnic or Indigenous identity (see lib/analysis/relevance.ts).
 *
 * Boards without an entry fall back to "by place": their three communities with the most
 * concern signals.
 */
export interface ConcernGroup {
  name: string;
  /** Community names as they appear after the last " — " in a signal's actor. */
  communities: string[];
  /** One line of published context (census figures), shown under the circle. */
  profile?: string;
}

export interface ConcernGrouping {
  key: string;
  label: string;
  /** Shown under the diagram: what the grouping is and what it can't say. */
  note: string;
  groups: ConcernGroup[];
}

// Income first: it's the default view on the board. Figures: the community profiles in HSEO's Siting Perspectives Report (June 2022).
const OAHU: ConcernGrouping[] = [
  {
    key: 'income',
    label: 'By income level',
    note:
      'Communities grouped by the poverty rate in HSEO’s 2022 community profiles, not individual residents’ incomes. Places without a published figure (ʻEwa as a whole, Kunia Village, North Shore, Central Oʻahu) are left out. The middle group is mostly Kahuku, so its concerns are largely about the wind farms.',
    groups: [
      {
        name: 'Higher poverty (about 21–22%)',
        communities: ['Waiʻanae', 'Kalaeloa'],
        profile: 'Waiʻanae: median income ~$67,000, ~21% in poverty. Kalaeloa: ~$61,600, ~22%',
      },
      {
        name: 'Middle (about 7–10%)',
        communities: ['Kahuku', 'ʻEwa Beach'],
        profile: 'Kahuku: ~$82,000, ~6.6%. ʻEwa Beach: ~$97,000, ~9.7%',
      },
      {
        name: 'Lower (under 6%)',
        communities: ['Kapolei', 'Waipiʻo', 'Mililani', 'Mililani Town', 'Mililani Mauka', 'Royal Kunia'],
        profile: 'Kapolei, Waipiʻo, Mililani, Royal Kunia: ~$91,500–116,000, 2–5% in poverty',
      },
    ],
  },
  {
    key: 'place',
    label: 'By place',
    note: 'Three parts of Oʻahu that HSEO heard from. Public-record items about all of Oʻahu are left out.',
    groups: [
      {
        name: 'North Shore',
        communities: ['Kahuku', 'Kawailoa', 'North Shore'],
        profile: 'Kahuku: median household income ~$82,000; ~6.6% in poverty; ~4.5 people per household',
      },
      {
        name: 'Leeward (Waiʻanae & ʻEwa)',
        communities: ['Waiʻanae', 'Mākua Valley', 'ʻEwa', 'ʻEwa Beach', 'Kapolei', 'Kalaeloa', 'Honouliuli'],
        profile: 'Waiʻanae ~21% in poverty, Kalaeloa ~22%; ʻEwa Beach ~10%; Kapolei ~5%',
      },
      {
        name: 'Central',
        communities: ['Mililani', 'Mililani Town', 'Mililani Mauka', 'Kunia Village', 'Royal Kunia', 'Waipiʻo', 'Central Oʻahu'],
        profile: 'Mililani, Waipiʻo, Royal Kunia: 2–5% in poverty; Kunia Village: affordable farmworker housing',
      },
    ],
  },
];

export const CONCERN_GROUPINGS: Record<string, ConcernGrouping[]> = {
  'hi-energy-oahu': OAHU,
};
