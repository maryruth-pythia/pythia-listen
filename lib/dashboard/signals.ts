/**
 * Single entry point for "all signals for a project" used by the dashboard and
 * every analysis. It layers three things on top of the raw stored signals:
 *   1. Survey responses, computed live into signals (source = 'survey').
 *   2. Folds legacy desk-research signals into the internal-docs bucket
 *      ('pythia'), so the dashboard shows three buckets: Civic record,
 *      Internal docs, and Survey responses.
 *   3. (opt-in) The signal LENS: keep only VIEWS for sentiment/issues/analyses,
 *      with free-form tags replaced by the dashboard's evolving issue labels.
 *      Context / process / off-topic signals are set aside, never deleted.
 * Everything that reasons over a project's signals should read through here so
 * surveys, the desk→internal fold and the lens apply everywhere, consistently.
 */
import { listSignals } from '@/lib/db';
import { buildSurveySignals } from '@/lib/ingest/survey-signals';
import { getLens, type LensMode, type LensResult, type LensRole } from '@/lib/analysis/lens';
import type { Signal } from '@/lib/types';

const LENS_ON = (process.env.PYTHIA_LENS ?? 'on').trim().toLowerCase() !== 'off';

async function loadRaw(campaignId: string, wantSurvey: boolean): Promise<Signal[]> {
  const [stored, survey] = await Promise.all([
    listSignals(campaignId),
    wantSurvey ? buildSurveySignals(campaignId).catch(() => [] as Signal[]) : Promise.resolve([] as Signal[]),
  ]);
  const folded = stored.map((s) =>
    s.source === 'desk' ? { ...s, source: 'pythia' as const } : s
  );
  return [...folded, ...survey];
}

export type RoleTaggedSignal = Signal & { lensRole: LensRole };

export interface LensedSignals {
  /** Every signal (unchanged). */
  all: Signal[];
  /** Views only, with `themes` replaced by issue labels where sorted. Unsorted signals are included as-is. */
  views: Signal[];
  /** Context signals (background facts) — for analyses that need background. */
  context: Signal[];
  /** Everything set aside (context, process, off-topic), tagged with its role. */
  setAside: RoleTaggedSignal[];
  /** The resolved lens, or null when the lens is off/unavailable (then views = all). */
  lens: LensResult | null;
  /** Why the lens is unavailable, when it failed (shown on the dashboard). */
  lensError?: string;
}

/** Load a project's signals and apply the signal lens (views vs. set-aside, issue labels). */
export async function loadLensedSignals(
  campaignId: string,
  opts?: {
    includeSurvey?: boolean;
    /** false = use what's already sorted, never run the AI (for side requests) */
    build?: boolean;
    /** peek / background (default: sort after the response is sent) / sync (wait for a sorting pass) */
    mode?: LensMode;
    budgetMs?: number;
    trigger?: string;
    /** Hand-off count when called from /api/lens/continue. */
    hop?: number;
  }
): Promise<LensedSignals> {
  const all = await loadRaw(campaignId, opts?.includeSurvey !== false);
  if (!LENS_ON || all.length === 0) return { all, views: all, context: [], setAside: [], lens: null };
  let lens: LensResult | null = null;
  let lensError: string | undefined;
  try {
    lens = await getLens(campaignId, all, { build: opts?.build, mode: opts?.mode, budgetMs: opts?.budgetMs, trigger: opts?.trigger, hop: opts?.hop });
  } catch (e) {
    lens = null;
    lensError = (e instanceof Error ? e.message : String(e)).slice(0, 300);
  }
  // Lens unavailable (error / off): pre-lens behaviour, raw tags and all.
  if (!lens) return { all, views: all, context: [], setAside: [], lens, lensError };
  // Nothing sorted yet (a brand-new dashboard): count everything for sentiment,
  // but keep the raw tags OUT of the issue chart — they're noise, not issues.
  if (lens.empty) return { all, views: all.map((s) => ({ ...s, themes: [] })), context: [], setAside: [], lens, lensError };
  const views: Signal[] = [];
  const context: Signal[] = [];
  const setAside: RoleTaggedSignal[] = [];
  for (const s of all) {
    const a = lens.bySignal.get(s.id);
    if (!a) {
      // Not sorted yet: counts toward sentiment as before, but its raw tags are
      // left out of the issue list until it's sorted (they'd fragment the list).
      views.push({ ...s, themes: [] });
      continue;
    }
    if (a.role === 'view') {
      const labels = a.issues.map((id) => lens!.labelOf.get(id)).filter((x): x is string => !!x);
      views.push(labels.length ? { ...s, themes: labels } : s);
    } else {
      if (a.role === 'context') context.push(s);
      setAside.push({ ...s, lensRole: a.role });
    }
  }
  return { all, views, context, setAside, lens };
}

export async function loadCampaignSignals(
  campaignId: string,
  opts?: { includeSurvey?: boolean; lens?: boolean; build?: boolean; mode?: LensMode }
): Promise<Signal[]> {
  if (opts?.lens) return (await loadLensedSignals(campaignId, opts)).views;
  return loadRaw(campaignId, opts?.includeSurvey !== false);
}

/** Short background block (facts, not opinions) for analyses that judge coverage/context. */
export function contextLines(context: Signal[], max = 20): string[] {
  if (!context.length) return [];
  return [
    `=== BACKGROUND (facts about the place and process — NOT opinions; use only as context, never cite as a view) ===`,
    ...[...context]
      .sort((a, b) => (b.salience ?? 0) - (a.salience ?? 0))
      .slice(0, max)
      .map((s) => `- ${s.title}: ${s.summary}`),
    ``,
  ];
}
