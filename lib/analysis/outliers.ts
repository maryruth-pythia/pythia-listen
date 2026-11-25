/**
 * Outliers & dissent — the counterweight to consensus math.
 *
 * Salience weighting, top-N sampling and averaging all pull toward the dominant
 * view. This surfaces the signals that stand APART so nuance and dissent are
 * amplified, not flattened. Fully DETERMINISTIC and cited — every item is a real
 * signal shown with its source, never an AI paraphrase. Four kinds:
 *   - divergent    : goes against the majority stance on a shared theme
 *   - strong-minority: an intense stance (opposition/support) held by few
 *   - rare-theme   : raises a topic almost no one else does
 *   - rare-source  : from a source/stakeholder barely present in the record
 * Only signals that express a VIEW are considered (neutral "just information"
 * is excluded), so we surface relevant outliers, not noise.
 */
import { loadCampaignSignals } from '../dashboard/signals';
import { complete, MODELS } from '../claude';
import { cached, ANALYSIS_TTL_MS } from '../cache';
import { Signal } from '../types';
import { collectNames, redactWith } from '../redact';
import { baseFileKey } from '../ingest/channels';
import { getCampaignById } from '../campaigns';
import { parseExclusionPhrases } from './exclusions';
import { looksInternal } from './relevance';

export type OutlierKind =
  | 'divergent'
  | 'strong-minority'
  | 'rare-theme'
  | 'rare-source';

export interface OutlierItem {
  id: string;
  fileKey: string;
  kind: OutlierKind;
  why: string;
  title: string;
  summary: string;
  stance: string;
  sourceType: string;
  citation?: { url?: string; title?: string; publisher?: string };
  salience: number;
}

export interface OutlierAnalysis {
  campaignId: string;
  total: number;
  considered: number;
  items: OutlierItem[];
  generated: boolean;
  updatedAt: string;
}

const MAX_ITEMS = 10;
const POS = new Set(['support']);
const NEG = new Set(['opposition', 'concern']);

// Privacy: strip personal names from what we display. Person names are two
// capitalized words that AREN'T an org/topic term; we harvest them from actor
// fields and citation filenames, then redact them from titles/summaries.
// High-precision name harvest: trust ONLY the transcript naming conventions
// ("A __ B" participants, "(Name)", "with First Last"). Generic capitalized
// bigrams (e.g. "Discovery Interviews") are NOT treated as names — that avoids
// redacting real content. Misses a name here and there, which is the safe error.
// Skip purely biographical / introductory filler — not a substantive signal.
const BIO =
  /personal background|share(s|d)? (his|her|their) background|their backgrounds?|introduc(e|es|ing|tion)|get to know|ice ?breaker/i;
function looksBiographical(s: Signal): boolean {
  return BIO.test(`${s.title} ${s.summary}`);
}

function toItem(s: Signal, kind: OutlierKind, why: string): OutlierItem {
  return {
    id: s.id,
    fileKey: baseFileKey(s.dedupeKey),
    kind,
    why,
    title: s.title,
    summary: s.summary,
    stance: s.stance,
    sourceType: s.sourceType,
    citation: s.citations?.[0],
    salience: s.salience ?? 45,
  };
}

const OUTLIERS_MODEL =
  process.env.PYTHIA_OUTLIERS_MODEL ??
  process.env.PYTHIA_EXTRACT_MODEL ??
  MODELS.conversation;

export function computeOutliers(campaignId: string): Promise<OutlierAnalysis> {
  return cached(
    `analysis:${campaignId}:outliers`,
    ANALYSIS_TTL_MS,
    () => _computeOutliers(campaignId),
    (r) => r.generated
  );
}

async function _computeOutliers(
  campaignId: string
): Promise<OutlierAnalysis> {
  const all = await loadCampaignSignals(campaignId, { lens: true });
  const campaign = await getCampaignById(campaignId);
  // AI-understood exclusions: the operator can write a plain sentence (no quotes
  // needed) and we resolve it to match phrases. Cached by the instruction text.
  const exKw = await parseExclusionPhrases(campaign?.exclusions);
  // Relevance: drop the subject's own internal/promotional material and any
  // operator-excluded content before looking for outliers.
  const withView = all
    .filter((s) => s.stance !== 'neutral')
    .filter((s) => {
      const t = `${s.title} ${s.summary}`;
      if (looksInternal(t)) return false;
      const lc = t.toLowerCase();
      return !exKw.some((k) => lc.includes(k));
    });
  const base: OutlierAnalysis = {
    campaignId,
    total: all.length,
    considered: withView.length,
    items: [],
    generated: false,
    updatedAt: new Date().toISOString(),
  };
  if (withView.length < 4) {
    return { ...base, note: 'Not enough signal that expresses a view yet.' } as OutlierAnalysis & { note: string };
  }

  const n = withView.length;
  const salDesc = (a: Signal, b: Signal) => (b.salience ?? 0) - (a.salience ?? 0);

  // Frequencies.
  const stanceFreq: Record<string, number> = {};
  const themeSignals = new Map<string, Signal[]>();
  const typeFreq: Record<string, number> = {};
  for (const s of withView) {
    stanceFreq[s.stance] = (stanceFreq[s.stance] ?? 0) + 1;
    typeFreq[s.sourceType] = (typeFreq[s.sourceType] ?? 0) + 1;
    for (const t of s.themes ?? []) {
      const arr = themeSignals.get(t) ?? [];
      arr.push(s);
      themeSignals.set(t, arr);
    }
  }

  const picked = new Map<string, OutlierItem>(); // by signal id — first (strongest) reason wins
  const add = (s: Signal, kind: OutlierKind, why: string) => {
    if (!picked.has(s.id)) picked.set(s.id, toItem(s, kind, why));
  };

  // 1) DIVERGENT — within a theme with a clear majority polarity, the signals on
  //    the opposite side. (theme needs enough voices to have a "majority".)
  for (const [theme, sigs] of themeSignals) {
    if (sigs.length < 5) continue;
    let pos = 0;
    let neg = 0;
    for (const s of sigs) {
      if (POS.has(s.stance)) pos++;
      else if (NEG.has(s.stance)) neg++;
    }
    if (pos + neg < 4) continue;
    const minority = Math.min(pos, neg);
    // Skip near-even splits — that's a real division (handled by opinion camps),
    // not a dissenting outlier. We want a clear majority with a small minority.
    if (minority === 0 || minority / (pos + neg) > 0.35) continue;
    const majorityPos = pos > neg;
    const minoritySide = majorityPos ? NEG : POS;
    const dissenters = sigs
      .filter((s) => minoritySide.has(s.stance))
      .sort(salDesc)
      .slice(0, 2);
    for (const s of dissenters) {
      add(
        s,
        'divergent',
        `${majorityPos ? 'Pushes back' : 'Backs it'} on "${theme}" where most ${majorityPos ? 'support it' : 'raise concern'}`
      );
    }
  }

  // 2) STRONG-MINORITY — opposition when opposition is a small share of the record.
  const oppShare = (stanceFreq['opposition'] ?? 0) / n;
  if (oppShare > 0 && oppShare < 0.15) {
    const pct = Math.round(oppShare * 100);
    for (const s of withView.filter((s) => s.stance === 'opposition').sort(salDesc).slice(0, 3)) {
      add(s, 'strong-minority', `Strong opposition — only ${pct}% of the record pushes back this hard`);
    }
  }

  // 3) RARE-THEME — a topic raised by only one or two signals.
  const rareThemes = [...themeSignals.entries()]
    .filter(([, sigs]) => sigs.length <= 2)
    .sort((a, b) => a[1].length - b[1].length);
  for (const [theme, sigs] of rareThemes) {
    const s = [...sigs].sort(salDesc)[0];
    if (looksBiographical(s)) continue; // skip background filler on a rare theme
    add(s, 'rare-theme', `Almost the only voice raising "${theme}"`);
  }

  // 4) RARE-SOURCE — from a source type that's barely present.
  const typeEntries = Object.entries(typeFreq).sort((a, b) => a[1] - b[1]);
  for (const [type, count] of typeEntries) {
    if (count / n >= 0.05 || count > 3) continue; // barely present only
    const s = withView.filter((x) => x.sourceType === type).sort(salDesc)[0];
    if (s && !looksBiographical(s)) {
      const label = type.replace(/^channel_/, '');
      add(s, 'rare-source', `From "${label}" — a source barely present in the record (${count} of ${n})`);
    }
  }

  // Assemble with per-kind quotas so all four kinds get a voice (divergent
  // signals are plentiful and would otherwise crowd out rare themes/sources),
  // then backfill any remaining slots by salience.
  const KIND_ORDER: OutlierKind[] = [
    'divergent',
    'strong-minority',
    'rare-theme',
    'rare-source',
  ];
  const CAP: Record<OutlierKind, number> = {
    divergent: 4,
    'strong-minority': 3,
    'rare-theme': 3,
    'rare-source': 2,
  };
  const byKind: Record<OutlierKind, OutlierItem[]> = {
    divergent: [],
    'strong-minority': [],
    'rare-theme': [],
    'rare-source': [],
  };
  for (const it of picked.values()) byKind[it.kind].push(it);
  for (const k of KIND_ORDER) byKind[k].sort((a, b) => b.salience - a.salience);

  const items: OutlierItem[] = [];
  const leftovers: OutlierItem[] = [];
  const perFile: Record<string, number> = {};
  const FILE_CAP = 2; // at most 2 insights from any one document
  const take = (it: OutlierItem): boolean => {
    if ((perFile[it.fileKey] ?? 0) >= FILE_CAP) return false;
    perFile[it.fileKey] = (perFile[it.fileKey] ?? 0) + 1;
    items.push(it);
    return true;
  };
  for (const k of KIND_ORDER) {
    let taken = 0;
    for (const it of byKind[k]) {
      if (taken >= CAP[k] || items.length >= MAX_ITEMS) {
        leftovers.push(it);
        continue;
      }
      if (take(it)) taken++; // file-capped items are simply skipped
    }
  }
  leftovers.sort((a, b) => b.salience - a.salience);
  for (const it of leftovers) {
    if (items.length >= MAX_ITEMS) break;
    take(it);
  }

  // Privacy pass: redact personal names and drop the filename citation (keep the
  // link URL, which is an opaque id).
  const names = collectNames(all);
  const safeItems: OutlierItem[] = items.map((it) => ({
    ...it,
    title: redactWith(names, it.title),
    summary: redactWith(names, it.summary),
    citation: it.citation?.url ? { url: it.citation.url } : undefined,
  }));

  // Automatic relevance gate (no manual tagging): using the Project's focus,
  // drop items that are the subject's OWN self-authored/internal material or a
  // cited reference. Remaining items are still real signals, shown verbatim.
  const focus = campaign?.analysisFocus?.trim();
  let gated = safeItems;
  if (safeItems.length && focus) {
    try {
      const listing = safeItems
        .map((it, i) => `#${i + 1} ${it.title} :: ${it.summary}`)
        .join('\n');
      const raw = await complete({ values: 'analysis',
        model: OUTLIERS_MODEL,
        maxTokens: 400,
        temperature: 0,
        messages: [
          {
            role: 'user',
            content: [
              `A Project's analysis focus is:`,
              focus,
              ``,
              `An item is IRRELEVANT if it is the SUBJECT's OWN self-authored,`,
              `internal, or promotional material (applications, team bios,`,
              `internal goals, pitch, about-us), OR an org/author that appears`,
              `only as a CITED reference — NOT an external stakeholder's view.`,
              ``,
              `ITEMS:`,
              listing,
              ``,
              `Return JSON only: {"drop":[the #numbers of the IRRELEVANT items]}.`,
            ].join('\n'),
          },
        ],
      });
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) {
        const parsed = JSON.parse(m[0]) as { drop?: unknown[] };
        const drop = new Set((parsed.drop ?? []).map((n) => Number(n)));
        gated = safeItems.filter((_, i) => !drop.has(i + 1));
      }
    } catch {
      /* keep safeItems on any failure */
    }
  }

  return { ...base, items: gated, generated: gated.length > 0 };
}
