/**
 * Canonical registry of dashboard sections that can be pulled into a Brief.
 *
 * SINGLE SOURCE OF TRUTH: both the dashboard and the "Make the case" Briefs
 * builder read this list, so the builder's "what to include" options can never
 * drift from what the dashboard actually shows. Add a section here (and the
 * builder renders it as an option automatically); the builder additionally
 * hides any section that has no data for the selected project.
 *
 * Pure data — safe to import from client components (no server-only deps).
 */

export type BriefSectionId =
  | 'score'
  | 'trend'
  | 'meta'
  | 'clusters'
  | 'questions'
  | 'coalition'
  | 'representation'
  | 'outliers'
  | 'survey'
  | 'origination'
  | 'precedents';

export type BriefSectionGroup = 'The read' | 'The people' | 'Place & precedent';

export interface BriefSectionDef {
  id: BriefSectionId;
  /** Label shown in the builder checklist (plain, skimmable). */
  label: string;
  group: BriefSectionGroup;
  /** The dashboard section it comes from, for reference/sync. */
  dashboardSection: string;
  /** On by default for a fresh fact sheet. */
  factSheetDefault: boolean;
  /** On by default for a fresh report. */
  reportDefault: boolean;
}

export const BRIEF_SECTIONS: BriefSectionDef[] = [
  { id: 'score', label: 'Social-licence score & sentiment', group: 'The read', dashboardSection: '02', factSheetDefault: true, reportDefault: true },
  { id: 'trend', label: 'Sentiment over time', group: 'The read', dashboardSection: '01', factSheetDefault: true, reportDefault: true },
  { id: 'meta', label: 'Meta-synthesis (agreements · tensions · missing voices)', group: 'The read', dashboardSection: '03', factSheetDefault: false, reportDefault: true },
  { id: 'clusters', label: 'Opinion clusters & common ground', group: 'The people', dashboardSection: '06', factSheetDefault: true, reportDefault: true },
  { id: 'questions', label: 'Top questions people ask', group: 'The people', dashboardSection: '06', factSheetDefault: true, reportDefault: false },
  { id: 'coalition', label: 'Coalition & community influencers', group: 'The people', dashboardSection: '09', factSheetDefault: false, reportDefault: true },
  { id: 'representation', label: 'Representation — whose voice is missing', group: 'The people', dashboardSection: '08', factSheetDefault: false, reportDefault: true },
  { id: 'outliers', label: 'Outliers & dissent', group: 'The people', dashboardSection: '07', factSheetDefault: false, reportDefault: true },
  { id: 'survey', label: 'What the survey found (agree / disagree)', group: 'The people', dashboardSection: 'survey', factSheetDefault: true, reportDefault: true },
  { id: 'origination', label: 'Where it touches down (map)', group: 'Place & precedent', dashboardSection: '04', factSheetDefault: false, reportDefault: false },
  { id: 'precedents', label: 'How comparable projects reached agreement', group: 'Place & precedent', dashboardSection: '10', factSheetDefault: true, reportDefault: false },
];

export const BRIEF_SECTION_GROUPS: BriefSectionGroup[] = [
  'The read',
  'The people',
  'Place & precedent',
];

export function briefSectionsByGroup(): Record<BriefSectionGroup, BriefSectionDef[]> {
  const out = { 'The read': [], 'The people': [], 'Place & precedent': [] } as Record<
    BriefSectionGroup,
    BriefSectionDef[]
  >;
  for (const s of BRIEF_SECTIONS) out[s.group].push(s);
  return out;
}
