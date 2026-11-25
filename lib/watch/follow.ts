/**
 * "Follow this project": turn a pipeline item into its own public-record board, so the
 * community sections (sentiment, issues, who's missing) can fill as hearing comments, news
 * and filings about that one project are added. The board starts with one background row
 * (the item itself, with its source link); the dashboard's civic-news check then offers
 * news about the project for the operator to approve.
 */
import { saveCampaign, getCampaignById, type Campaign } from '@/lib/campaigns';
import { ensureSeed } from '@/lib/ingest/civic';
import type { ExtractedSignal } from '@/lib/ingest/extract';
import type { WatchConfig } from './config';
import type { Lead } from './types';
import { loadWatch, saveWatch } from './run';
import { STAGE_LABEL } from './digest';

const SOURCE_NAME: Record<Lead['source'], string> = {
  pjm: 'PJM interconnection queue',
  deq: 'Virginia DEQ permit by rule',
  townhall: 'Virginia Regulatory Town Hall',
  agenda: 'local meeting documents',
};

/** Short stable suffix so two projects with similar names never share a board id. */
function shortHash(s: string): string {
  let h = 5381;
  for (const ch of s) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0;
  return h.toString(36).slice(0, 5);
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 36);
}

/** A short project name: the DEQ or commercial name, else "<MW> <tech> near <place>". */
function projectName(l: Lead): string {
  return l.title.replace(/\s*\((?:[A-Z]{1,3}\d?-\d+|C\d+-\d+)\)\s*$/, '').replace(/^.*?County:\s*/, '').trim();
}

export async function followLead(opts: {
  watchBoard: Campaign;
  cfg: WatchConfig;
  leadId: string;
  orgId?: string;
}): Promise<{ boardId: string; created: boolean }> {
  const state = await loadWatch(opts.watchBoard.id);
  if (!state) throw new Error('The watch has not run yet.');
  const lead = state.leads.find((l) => l.id === opts.leadId);
  if (!lead) throw new Error('That item is no longer in the pipeline.');
  if (lead.source === 'agenda') throw new Error('Agenda items are meetings, not projects: follow the project they mention instead.');

  // Already followed (this item, or the same project in another source): open that board.
  for (const id of [lead.id, ...(lead.related ?? []).map((r) => r.id)]) {
    const existing = state.follows?.[id];
    if (existing && (await getCampaignById(existing))) {
      await saveWatch({ ...state, follows: { ...(state.follows ?? {}), [lead.id]: existing } });
      return { boardId: existing, created: false };
    }
  }

  const county = opts.cfg.counties.find((c) => c.name === lead.county);
  const place = `${county?.label ?? `${lead.county} County`}, Virginia`;
  // Prefer the DEQ permit's name when the same project is in DEQ (Town Hall and PJM titles are wordier).
  const deqTwin = (lead.related ?? []).find((r) => r.source === 'deq' && r.how === 'name');
  const name = lead.source === 'deq' ? projectName(lead) : deqTwin ? deqTwin.title : projectName(lead);
  const ids = [lead, ...(lead.related ?? [])].map((r) => r.id.replace(/^\w+:/, '')).filter((x) => !/^https?:/.test(x));
  const also = (lead.related ?? []).map((r) => r.title);

  const board = await saveCampaign({
    id: `follow-${slug(`${name}-${lead.county}`)}-${shortHash(lead.id)}`,
    // A watch shared with a client org by slug: the followed board is shared the same way, so
    // both the client and the Pythia team see it. Otherwise it belongs to whoever followed it.
    orgId: opts.watchBoard.orgSlug ? undefined : opts.orgId ?? opts.watchBoard.orgId,
    orgSlug: opts.watchBoard.orgSlug,
    name: `${name} (Public record)`,
    kind: 'site',
    badge: 'Public record',
    publicRecordOnly: true,
    followedFrom: lead.id,
    meta: [lead.mw ? `${lead.mw} MW` : '', lead.tech ?? '', place, ids.length ? ids.join(' · ') : ''].filter(Boolean).join(' · '),
    blurb: `${name}: followed from the ${opts.watchBoard.name} watch`,
    routing: [
      `The ${name.toUpperCase()} energy project in ${place.toUpperCase()}`,
      lead.developer ? `(developer: ${lead.developer})` : '',
      lead.mw ? `, about ${lead.mw} MW of ${(lead.tech ?? 'energy').toLowerCase()}` : '',
      ids.length ? `. Filing / queue numbers: ${ids.join(', ')}` : '',
      also.length ? `. Also listed as: ${also.join('; ')}` : '',
      `. Includes county hearings, siting agreements, conditional-use or rezoning decisions, DEQ permit steps, public comments and local news about THIS project. Route here only material about this project.`,
    ].join(''),
    analysisFocus: [
      `This board is built ONLY from the public record about one project, followed early from a`,
      `watch of upcoming energy projects, so the record may still be thin. Describe what the RECORD`,
      `shows, not what the community thinks; say plainly where it is thin, and name whose voices`,
      `are missing (nearby residents, landowners, the wider ${county?.label ?? 'county'} community).`,
    ].join(' '),
    jurisdiction: place,
    docket: ids.join(', ') || undefined,
    exclusions: 'Do not treat procedural filings (queue status, permit steps, notices) as community sentiment.',
  });

  // First row: the item itself, as background, with its source link.
  const seed: ExtractedSignal = {
    sourceType: 'public-record',
    title: `Background (early warning): ${lead.title}`,
    summary: `${STAGE_LABEL[lead.stage]}. ${lead.detail}${lead.date ? ` Source date: ${lead.date}.` : ''} First seen by Pythia's early-warning watch on ${lead.firstSeen.slice(0, 10)}.`,
    stance: 'neutral',
    themes: ['background', 'project status'],
    actor: `${SOURCE_NAME[lead.source]} — ${county?.label ?? lead.county}`,
    citations: [{ url: lead.url, title: lead.title }],
    observedAt: lead.date ? `${lead.date}T12:00:00.000Z` : undefined,
    salience: 0.5,
    confidence: 0.95,
  };
  await ensureSeed(board.id, [seed], 'desk');

  await saveWatch({ ...state, follows: { ...(state.follows ?? {}), [lead.id]: board.id } });
  return { boardId: board.id, created: true };
}
