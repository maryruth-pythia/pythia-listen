/**
 * Concern clusters: the issues people raised with concern, opposition or mixed feelings,
 * ranked by how many signals raise them. Rule-based (no AI), so everyone sees the same thing.
 *
 * Issues come from the signal lens (the board's own issue list, grouped into families) when
 * the lens has sorted the board; otherwise from the shared issue groups in community-views.ts
 * (also used on the Hawaiʻi boards, so section 03 and this section agree there).
 * Background rows (desk) are left out: these are people's concerns, not report findings.
 *
 * Also builds the Venn: which concerns each of up to three community groups raises.
 */
import type { Signal } from '@/lib/types';
import type { LensedSignals } from './signals';
import { ISSUES, communityOf, issueIdsOf, placeKey } from './community-views';
import { CONCERN_GROUPINGS, type ConcernGrouping } from './concern-groupings';

const CONCERN = new Set(['concern', 'opposition', 'mixed']);
/** An issue counts as a group's concern only when at least this many of its signals raise it. */
export const VENN_MIN = 2;

export interface ConcernCluster {
  key: string;
  label: string;
  /** Concern / opposition / mixed signals that raise it. */
  n: number;
  /** Share of all concern signals on the board (one signal can raise several issues). */
  share: number;
  opposition: number;
  concern: number;
  mixed: number;
  /** Distinct documents behind it (citation URL, else title). */
  sources: number;
  communities: { name: string; n: number }[];
  /** Finer issues inside this cluster (lens labels), when the lens is on. */
  parts: { label: string; n: number }[];
  examples: { title: string; url?: string; community?: string }[];
}

export interface VennGroupStat {
  name: string;
  profile?: string;
  /** Concern signals from this group. */
  n: number;
}

export interface VennData {
  key: string;
  label: string;
  note: string;
  groups: VennGroupStat[];
  /** cluster key -> per-group signal counts (same order as groups). */
  counts: Record<string, number[]>;
  /** Concern signals from communities outside every group (or with no community). */
  unplaced: number;
}

export interface ConcernView {
  total: number;
  method: 'ai' | 'lens' | 'issue-groups';
  /** One-sentence descriptions of AI-made clusters, by cluster key. */
  descriptions?: Record<string, string>;
  clusters: ConcernCluster[];
  /** Concern signals that matched no issue. */
  unmatched: number;
  venns: VennData[];
}

function docKey(s: Signal): string {
  return (s.citations?.[0]?.url || s.title || s.id).trim();
}

/** The signals section 05 is about: concerns, objections and mixed views, not background rows. */
export function concernPool(signals: Signal[]): Signal[] {
  return signals.filter((s) => s.source !== 'desk' && CONCERN.has(s.stance));
}

export type KeyFn = (s: Signal) => { key: string; label: string; part?: string }[];

/** Rule-based fallback (used when the AI grouping is unavailable). */
export function computeConcerns(campaignId: string, lensed: LensedSignals): ConcernView {
  // Hawaiʻi boards use the hand-made Hawaiʻi issue groups (same as section 03's map and grid),
  // so the two sections agree; other boards use their own sorted issue list when there is one.
  const hawaii = campaignId.startsWith('hi-');
  const lensOn = !hawaii && !!lensed.lens && !lensed.lens.empty;
  // With the lens on, `views` carry issue labels as themes; without it, use the raw tags.
  const pool = concernPool(lensOn ? lensed.views : lensed.all);

  const keysOf: KeyFn = (s) => {
    if (lensOn) {
      const fam = lensed.lens!.familyOf;
      return (s.themes ?? []).map((label) => {
        const f = fam.get(label);
        return f ? { key: `f:${f}`, label: f, part: label } : { key: `i:${label}`, label };
      });
    }
    return issueIdsOf(s).map((id) => ({ key: id, label: ISSUES.find((d) => d.id === id)!.label }));
  };
  return buildConcernView(campaignId, pool, keysOf, lensOn ? 'lens' : 'issue-groups');
}

/** Count signals under their cluster keys, rank, and build the Venn groupings. */
export function buildConcernView(campaignId: string, pool: Signal[], keysOf: KeyFn, method: ConcernView['method']): ConcernView {

  const byKey = new Map<string, { label: string; sigs: Signal[]; parts: Map<string, number> }>();
  let unmatched = 0;
  const signalKeys = new Map<string, string[]>();
  for (const s of pool) {
    const ks = keysOf(s);
    const uniq = new Map(ks.map((k) => [k.key, k]));
    if (!uniq.size) unmatched++;
    signalKeys.set(s.id, [...uniq.keys()]);
    for (const k of uniq.values()) {
      const row = byKey.get(k.key) ?? { label: k.label, sigs: [], parts: new Map<string, number>() };
      row.sigs.push(s);
      for (const p of ks.filter((x) => x.key === k.key && x.part)) row.parts.set(p.part!, (row.parts.get(p.part!) ?? 0) + 1);
      byKey.set(k.key, row);
    }
  }

  const total = pool.length;
  const clusters: ConcernCluster[] = [...byKey.entries()]
    .map(([key, r]) => {
      const comm = new Map<string, number>();
      for (const s of r.sigs) {
        const c = communityOf(s);
        if (c) comm.set(c, (comm.get(c) ?? 0) + 1);
      }
      // Two examples, from different communities where possible, strongest first.
      const sorted = [...r.sigs].sort(
        (a, b) => (b.stance === 'opposition' ? 1 : 0) - (a.stance === 'opposition' ? 1 : 0) || (b.salience ?? 0) - (a.salience ?? 0)
      );
      const picked: Signal[] = [];
      for (const s of sorted) if (picked.length < 2 && !picked.some((p) => communityOf(p) === communityOf(s))) picked.push(s);
      for (const s of sorted) if (picked.length < 2 && !picked.includes(s)) picked.push(s);
      const examples = picked.map((s) => ({ title: s.title, url: s.citations?.[0]?.url, community: communityOf(s) }));
      return {
        key,
        label: r.label,
        n: r.sigs.length,
        share: total ? Math.round((100 * r.sigs.length) / total) : 0,
        opposition: r.sigs.filter((s) => s.stance === 'opposition').length,
        concern: r.sigs.filter((s) => s.stance === 'concern').length,
        mixed: r.sigs.filter((s) => s.stance === 'mixed').length,
        sources: new Set(r.sigs.map(docKey)).size,
        communities: [...comm.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, n]) => ({ name, n })),
        parts: [...r.parts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([label, n]) => ({ label, n })),
        examples,
      };
    })
    .sort((a, b) => b.n - a.n || b.opposition - a.opposition);

  // Venn groupings: configured ones, else the three communities with the most concern signals.
  let groupings: ConcernGrouping[] = CONCERN_GROUPINGS[campaignId] ?? [];
  if (!groupings.length) {
    const comm = new Map<string, number>();
    for (const s of pool) {
      const c = communityOf(s);
      if (c) comm.set(c, (comm.get(c) ?? 0) + 1);
    }
    const top = [...comm.entries()].filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (top.length >= 2) {
      groupings = [
        {
          key: 'place',
          label: 'By place',
          note: `The ${top.length} communities with the most concerns on record. Other places are left out.`,
          groups: top.map(([name]) => ({ name, communities: [name] })),
        },
      ];
    }
  }

  const venns: VennData[] = groupings.map((g) => {
    const groupOf = (s: Signal): number => {
      const c = communityOf(s);
      if (!c) return -1;
      const k = placeKey(c);
      return g.groups.findIndex((gr) => gr.communities.some((x) => placeKey(x) === k));
    };
    const counts: Record<string, number[]> = {};
    const groupN = g.groups.map(() => 0);
    let unplaced = 0;
    for (const s of pool) {
      const gi = groupOf(s);
      if (gi < 0) {
        unplaced++;
        continue;
      }
      groupN[gi]++;
      for (const key of signalKeys.get(s.id) ?? []) {
        counts[key] = counts[key] ?? g.groups.map(() => 0);
        counts[key][gi]++;
      }
    }
    return {
      key: g.key,
      label: g.label,
      note: g.note,
      groups: g.groups.map((gr, i) => ({ name: gr.name, profile: gr.profile, n: groupN[i] })),
      counts,
      unplaced,
    };
  });

  return { total, method, clusters, unmatched, venns };
}
