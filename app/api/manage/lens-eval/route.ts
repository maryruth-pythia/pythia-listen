/**
 * Operator-only check of the signal lens for one dashboard:
 *   /api/manage/lens-eval?campaign=<id>         instant: reads what's sorted, no AI
 *   /api/manage/lens-eval?campaign=<id>&run=1   runs one sorting pass (≤ ~40s), then reports
 * Reports:
 *   - the recent sorting runs (each step, timing, and any error)
 *   - how many signals landed in each role (view / context / process / off_topic)
 *   - a cross-tab of role by sourceType — for test datasets whose sourceType
 *     records what each signal really is (e.g. the Hawaiʻi dataset), this is the
 *     answer key; the lens itself never sees sourceType
 *   - the issue list with view counts, and the change log
 *   - a sample of signals in each role, to eyeball
 * Read-only apart from the normal sorting/caching. Lives under /api/manage/*,
 * so middleware requires an operator session.
 */
import { NextRequest, NextResponse } from 'next/server';
import { loadLensedSignals } from '@/lib/dashboard/signals';
import { listSignals } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const campaignId = req.nextUrl.searchParams.get('campaign') ?? '';
  if (!campaignId) return NextResponse.json({ error: 'add ?campaign=<id>' }, { status: 400 });
  const run = req.nextUrl.searchParams.get('run') === '1';
  try {
    const [lensed, raw] = await Promise.all([
      loadLensedSignals(campaignId, {
        includeSurvey: false,
        mode: run ? 'sync' : 'peek',
        budgetMs: 20000,
        trigger: 'check page',
      }),
      listSignals(campaignId),
    ]);
    const lens = lensed.lens;
    if (!lens) return NextResponse.json({ ok: false, note: 'Lens is off or unavailable.', error: lensed.lensError ?? null });
    const typeOf = new Map(raw.map((s) => [s.id, s.sourceType]));
    const roles: Record<string, number> = { view: 0, context: 0, process: 0, off_topic: 0, unsorted: 0 };
    const crosstab: Record<string, Record<string, number>> = {};
    const samples: Record<string, string[]> = { view: [], context: [], process: [], off_topic: [] };
    for (const s of lensed.all) {
      const a = lens.bySignal.get(s.id);
      const role = a?.role ?? 'unsorted';
      roles[role] = (roles[role] ?? 0) + 1;
      const t = typeOf.get(s.id) ?? s.sourceType ?? 'unknown';
      crosstab[t] = crosstab[t] ?? {};
      crosstab[t][role] = (crosstab[t][role] ?? 0) + 1;
      if (a && samples[role] && samples[role].length < 15) samples[role].push(`[${t}] ${s.title}`);
    }
    const viewCounts = new Map<string, number>();
    for (const s of lensed.views) for (const t of s.themes) viewCounts.set(t, (viewCounts.get(t) ?? 0) + 1);
    const issues = lens.issues
      .map((i) => ({ id: i.id, label: i.label, views: viewCounts.get(i.label) ?? 0, isNew: lens.newIssueIds.has(i.id), description: i.description }))
      .sort((a, b) => b.views - a.views);
    return NextResponse.json({
      ok: true,
      campaignId,
      total: lensed.all.length,
      pending: lens.pending,
      building: lens.building,
      runs: lens.runs,
      hint: run ? 'Ran one sorting pass.' : 'Instant read (no AI). Add &run=1 to run one sorting pass.',
      roles,
      crosstab,
      issues,
      log: lens.log.slice(0, 40),
      samples,
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
