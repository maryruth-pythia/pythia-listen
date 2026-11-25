/**
 * "State of play" for a project — the current legal / permitting picture,
 * pulled live from the web ON DEMAND (not on every page load) and cached so
 * repeat views are free. Returns laws & decisions, a timeline (what happened
 * and what's coming), suggested action points, and source links.
 *
 * Operator-only (under /api/manage/*). GET peeks the cache without searching;
 * POST runs (or refreshes) the search.
 */
import { NextRequest, NextResponse } from 'next/server';
import { completeWithWebSearch } from '@/lib/claude';
import { getCache, setCache } from '@/lib/db';
import { getProjectCard } from '@/lib/reference/content';
import { getCampaignById } from '@/lib/campaigns';
import { canAccessCampaign } from '@/lib/scope';
import { createHash } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const TTL_MS = 1000 * 60 * 60 * 24; // 24h — a permitting picture doesn't move hourly.

export interface StateOfPlay {
  headline: string;
  laws: { title: string; detail: string; date?: string }[];
  timeline: { when: string; label: string; status: 'done' | 'upcoming' }[];
  actions: string[];
  suggestions: string[];
  sources: { label: string; url: string }[];
  ask?: string;
  generatedAt: string;
}

function keyFor(campaignId: string, ask: string): string {
  const a = ask ? ':' + createHash('sha1').update(ask).digest('hex').slice(0, 10) : '';
  return `stateofplay:${campaignId}${a}`;
}

function parseObj(raw: string): Record<string, unknown> | null {
  let t = raw.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  try {
    const v = JSON.parse(t);
    if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>;
  } catch { /* balanced-brace scan */ }
  const start = t.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < t.length; i++) {
    if (t[i] === '{') depth++;
    else if (t[i] === '}') { depth--; if (depth === 0) { try { return JSON.parse(t.slice(start, i + 1)); } catch { return null; } } }
  }
  return null;
}

const asStr = (v: unknown, max = 300): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const asArr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

export async function GET(req: NextRequest) {
  const campaignId = req.nextUrl.searchParams.get('campaignId') || '';
  if (!campaignId) return NextResponse.json({ error: 'campaignId required' }, { status: 400 });
  if (!(await canAccessCampaign(campaignId))) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  const hit = await getCache(keyFor(campaignId, ''));
  if (hit && hit.value) return NextResponse.json({ generated: true, state: hit.value });
  return NextResponse.json({ generated: false });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid JSON' }, { status: 400 }); }
  const b = (body ?? {}) as { campaignId?: unknown; ask?: unknown; refresh?: unknown };
  const campaignId = typeof b.campaignId === 'string' ? b.campaignId : '';
  const ask = typeof b.ask === 'string' ? b.ask.trim().slice(0, 400) : '';
  const refresh = b.refresh === true;
  if (!campaignId) return NextResponse.json({ error: 'campaignId required' }, { status: 400 });

  const key = keyFor(campaignId, ask);
  if (!refresh) {
    const hit = await getCache(key);
    if (hit && hit.value && Date.now() - new Date(hit.updatedAt).getTime() < TTL_MS) {
      return NextResponse.json({ ok: true, cached: true, state: hit.value });
    }
  }

  const card = getProjectCard(campaignId);
  const campaign = await getCampaignById(campaignId);
  const name = card?.name || campaign?.name || campaignId;
  const where = card?.where || '';
  const developer = card?.developer || '';
  const docket = card?.process || '';

  const prompt = [
    `You are briefing a community-based organisation on the CURRENT state of play`,
    `for a specific infrastructure/energy project. Search the web for the latest.`,
    ``,
    `Project: ${name}`,
    where ? `Location: ${where}` : '',
    developer ? `Developer: ${developer}` : '',
    docket ? `Docket / process: ${docket}` : '',
    ``,
    ask ? `The organiser specifically wants you to cover: "${ask}"` : '',
    ``,
    `Report, grounded ONLY in what you actually find:`,
    `- Laws, permits, ordinances, or decisions passed or pending that affect this project.`,
    `- A timeline: what has already happened (with dates) and what is coming next.`,
    `- Concrete action points the organisation could take now. Make EACH action`,
    `  actionable by naming, where you can find it: WHO to direct it to (the`,
    `  specific body, agency, or company — e.g. the state siting board, the county`,
    `  board of supervisors, the developer), WHEN in the process (the deadline,`,
    `  comment window, or hearing date), and THROUGH WHAT MECHANISM (written public`,
    `  comment, testimony at a hearing, a filing on the case docket, a letter). If a`,
    `  detail is not known from what you find, omit that part — never invent it.`,
    ``,
    `Return ONLY JSON:`,
    `{`,
    `  "headline": "one short plain sentence on where things stand",`,
    `  "laws": [{ "title": "short name of the law/decision", "detail": "one short clause, max ~12 words", "date": "e.g. Jun 2025 (optional)" }],`,
    `  "timeline": [{ "when": "date or period", "label": "what happened / will happen", "status": "done" | "upcoming" }],`,
    `  "actions": ["a specific next step naming who / when / how where known (e.g. \"Submit written comments to the state siting board before the Sep 12 deadline via the case docket\")", "..."],`,
    `  "suggestions": ["a short thing the organiser could ask you to add or dig into next", "..."]`,
    `}`,
    `Keep laws, timeline, and suggestions terse (short phrases). ACTIONS may be a full sentence so they can name who, when, and how — but no filler. At most 3 laws, 5 timeline entries, 3 actions, 3 suggestions. If you cannot verify something, omit it.`,
  ].filter(Boolean).join('\n');

  try {
    const { text, sources } = await completeWithWebSearch({
      maxTokens: 1600,
      maxResults: 6,
      messages: [{ role: 'user', content: prompt }],
    });
    const obj = parseObj(text) ?? {};
    const state: StateOfPlay = {
      headline: asStr(obj.headline, 300) || `Latest status for ${name}.`,
      laws: asArr(obj.laws).slice(0, 4).map((x) => {
        const o = (x ?? {}) as Record<string, unknown>;
        return { title: asStr(o.title, 140), detail: asStr(o.detail, 400), date: asStr(o.date, 40) || undefined };
      }).filter((l) => l.title || l.detail),
      timeline: asArr(obj.timeline).slice(0, 6).map((x) => {
        const o = (x ?? {}) as Record<string, unknown>;
        return { when: asStr(o.when, 60), label: asStr(o.label, 240), status: o.status === 'upcoming' ? 'upcoming' as const : 'done' as const };
      }).filter((t) => t.label),
      actions: asArr(obj.actions).map((x) => asStr(x, 240)).filter(Boolean).slice(0, 4),
      suggestions: asArr(obj.suggestions).map((x) => asStr(x, 140)).filter(Boolean).slice(0, 4),
      sources: sources.slice(0, 6).map((s) => ({ label: s.title ?? s.url, url: s.url })),
      ask: ask || undefined,
      generatedAt: new Date().toISOString(),
    };
    const hasContent = state.laws.length + state.timeline.length + state.actions.length > 0;
    if (hasContent) await setCache(key, state);
    return NextResponse.json({ ok: true, cached: false, state });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
