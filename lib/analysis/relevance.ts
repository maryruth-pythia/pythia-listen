/**
 * Shared relevance guard injected into the AI analyses. Keeps the dashboard
 * credible by refusing two common failure modes:
 *  - treating the SUBJECT's own self-authored / internal / promotional material
 *    as if it were an outside view;
 *  - treating an org/author that appears only as a CITED reference as a
 *    stakeholder or influencer.
 * Plus any operator-set exclusions.
 */
export function relevanceLines(exclusions?: string): string[] {
  const lines = [
    `RELEVANCE (be strict — this drives credibility):`,
    `- Count only EXTERNAL views and ACTUAL stakeholders relevant to the`,
    `  subject. The subject's OWN self-authored / internal / promotional`,
    `  material (applications, fellowship drafts, team bios, internal goals,`,
    `  founder hopes) is the subject speaking about ITSELF — NOT an outside`,
    `  view. Do not surface or count it as a stakeholder signal.`,
    `- An organisation, institute, author, or outlet that appears ONLY as a`,
    `  cited source or reference (a quoted report, prior research) is NOT a`,
    `  stakeholder or influencer. Exclude cited references.`,
    `- NEVER treat a racial, ethnic, Indigenous or national identity as a single`,
    `  stakeholder group with one view (e.g. "Kānaka Maoli", "Native Hawaiians",`,
    `  "Native Americans", "Latinos"). These are diverse peoples; one stance for`,
    `  all of them is false and harmful. Attribute a view only to the specific`,
    `  roles, organisations or places the signals show (e.g. "cultural`,
    `  practitioners in Kahuku", "a Hawaiian homestead association", "Puna`,
    `  survey respondents"), and say where views differ. This is about not giving`,
    `  a people ONE view. It does not stop you recognising that they are present in`,
    `  the record, under whatever names they go by, or noting that they are under-heard.`,
  ];
  const ex = (exclusions ?? '').trim();
  if (ex) lines.push(`- The operator has asked you to EXCLUDE, strictly: ${ex}`);
  return lines;
}

/** Deterministic heuristic: does this text read as the subject's OWN internal /
 * promotional material (not an external view)? Used by the non-AI outliers. */
const INTERNAL_RE =
  /\b(application draft|fellowship application|founding member|team background|our (mission|goals|hopes|vision)|internal (goals|notes|memo)|pitch deck|about (us|the team)|team bios?)\b/i;
export function looksInternal(text: string): boolean {
  return INTERNAL_RE.test(text);
}
