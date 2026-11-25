/**
 * Link the same project across sources. Rule-based and conservative:
 *  - 'name': a project's distinctive name words (e.g. "Hera", "Bold Camp") appear in another
 *    item from the same county (a DEQ permit and a Town Hall notice, or an agenda that names it).
 *  - 'size': a grid request and a DEQ permit in the same county with the same capacity (±5%),
 *    and no other candidate at that size. Shown as "likely", because PJM rarely names projects.
 */
import type { Lead, RelatedLead } from './types';

const STOP = new Set(
  [
    'solar', 'project', 'projects', 'farm', 'facility', 'llc', 'inc', 'lp', 'co', 'company', 'corp', 'energy', 'power',
    'renewable', 'renewables', 'storage', 'battery', 'bess', 'center', 'data', 'the', 'of', 'and', 'at', 'county', 'city',
    'phase', 'i', 'ii', 'iii', 'iv', 'virginia', 'electric', 'dominion', 'appalachian', 'dba', 'd', 'b', 'a', 'cf',
    'generation', 'generating', 'station', 'park', 'hybrid', 'wind', 'pv', 'kv', 'mw',
  ]
);

function words(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(Boolean);
}

/** Distinctive name words for a lead, or [] when it has no usable name. */
function nameWords(l: Lead, countyWords: Set<string>): string[] {
  const raw =
    l.source === 'deq' ? l.title : l.source === 'pjm' ? `${l.title.includes(' project near ') ? '' : l.title} ${l.developer ?? ''}` : '';
  const w = [...new Set(words(raw.replace(/\([^)]*\)/g, ' ')))].filter((x) => !STOP.has(x) && !countyWords.has(x) && !/^\d+$/.test(x));
  return w.some((x) => x.length >= 4) ? w : [];
}

function haystack(l: Lead): Set<string> {
  return new Set(words(`${l.title} ${l.detail} ${l.developer ?? ''} ${l.excerpt ?? ''}`));
}

export function linkLeads(leads: Lead[], countyNames: string[]): Lead[] {
  const countyWords = new Set(countyNames.flatMap((c) => words(c)));
  const rel = new Map<string, Map<string, RelatedLead>>();
  const add = (a: Lead, b: Lead, how: RelatedLead['how']) => {
    for (const [x, y] of [
      [a, b],
      [b, a],
    ] as const) {
      const m = rel.get(x.id) ?? new Map<string, RelatedLead>();
      const prev = m.get(y.id);
      if (!prev || (prev.how === 'size' && how === 'name')) m.set(y.id, { id: y.id, source: y.source, title: y.title, url: y.url, how });
      rel.set(x.id, m);
    }
  };

  const stacks = new Map(leads.map((l) => [l.id, haystack(l)]));
  for (const a of leads) {
    const nw = nameWords(a, countyWords);
    if (!nw.length) continue;
    for (const b of leads) {
      if (b.id === a.id || b.source === a.source || b.county !== a.county) continue;
      const hay = stacks.get(b.id)!;
      if (nw.every((w) => hay.has(w))) add(a, b, 'name');
    }
  }

  const pjm = leads.filter((l) => l.source === 'pjm' && l.mw);
  const deq = leads.filter((l) => l.source === 'deq' && l.mw);
  const close = (x: number, y: number) => Math.abs(x - y) <= Math.max(0.5, 0.05 * Math.max(x, y));
  for (const p of pjm) {
    const cands = deq.filter((d) => d.county === p.county && close(d.mw!, p.mw!));
    if (cands.length !== 1) continue;
    const d = cands[0];
    const otherPjm = pjm.filter((q) => q.id !== p.id && q.county === d.county && close(q.mw!, d.mw!));
    if (otherPjm.length) continue;
    if (!rel.get(p.id)?.has(d.id)) add(p, d, 'size');
  }

  return leads.map((l) => {
    const r = rel.get(l.id);
    const out: Lead = { ...l };
    delete out.related;
    if (r && r.size) out.related = [...r.values()];
    return out;
  });
}
