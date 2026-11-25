/**
 * Campaign-coach: when the record is thin on some voices, draft a short,
 * ready-to-send check-in email the operator can use to go GATHER that signal —
 * addressed to the community, naming the under-represented groups as the people
 * to reach. Grounded in the representation gaps; no fabrication.
 *
 * Cached per campaign (1h) so re-opening is cheap. Operator-only.
 */
import { NextRequest, NextResponse } from 'next/server';
import { complete } from '@/lib/claude';
import { getCache, setCache } from '@/lib/db';
import { computeRepresentation } from '@/lib/analysis/representation';
import { getProjectCard } from '@/lib/reference/content';
import { getCampaignById } from '@/lib/campaigns';
import { canAccessCampaign } from '@/lib/scope';
import { getOrgProfile } from '@/lib/org-profile';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const TTL_MS = 1000 * 60 * 60;

function parseObj(raw: string): Record<string, unknown> | null {
  let t = raw.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  try { const v = JSON.parse(t); if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>; } catch { /* scan */ }
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a !== -1 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch { return null; } }
  return null;
}
const asStr = (v: unknown, m = 4000) => (typeof v === 'string' ? v.trim().slice(0, m) : '');

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid JSON' }, { status: 400 }); }
  const campaignId = typeof (body as { campaignId?: unknown })?.campaignId === 'string'
    ? (body as { campaignId: string }).campaignId : '';
  const refresh = (body as { refresh?: unknown })?.refresh === true;
  if (!campaignId) return NextResponse.json({ error: 'campaignId required' }, { status: 400 });
  if (!(await canAccessCampaign(campaignId))) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const key = `coachemail:${campaignId}`;
  if (!refresh) {
    const hit = await getCache(key);
    if (hit && hit.value && Date.now() - new Date(hit.updatedAt).getTime() < TTL_MS) {
      return NextResponse.json({ ok: true, cached: true, ...(hit.value as object) });
    }
  }

  const [rep, campaign, org] = await Promise.all([
    computeRepresentation(campaignId).catch(() => null),
    getCampaignById(campaignId),
    getOrgProfile(),
  ]);
  const card = getProjectCard(campaignId);
  const name = card?.name || campaign?.name || 'this project';
  const gaps = (rep?.missing ?? []).map((m) => m.who).slice(0, 6);
  const orgName = org?.name || 'our team';

  const system = [
    'You are a community-organising coach helping a community-based organisation GATHER more input.',
    'Write a short, warm, ready-to-send check-in email inviting community members to share their views on a specific project.',
    'The record is currently thin on the voices listed as GAPS — write so those people feel specifically invited (without singling anyone out or being patronising).',
    'Keep it under ~150 words. Plain language. Make clear it takes 5 minutes, is anonymous, and every view helps.',
    'Leave a clear placeholder [SURVEY LINK] where the survey link goes. Sign off from the organisation name.',
    'Return ONLY JSON: { "subject": "...", "body": "the full email text with line breaks" }',
  ].join('\n');
  const user = `Project: ${name}\nOrganisation sending it: ${orgName}\nVoices the record is thin on (write to invite these): ${gaps.length ? gaps.join('; ') : 'general community members who have not yet weighed in'}`;

  try {
    const text = await complete({ system, messages: [{ role: 'user', content: user }], maxTokens: 700, temperature: 0.6 });
    const obj = parseObj(text) ?? {};
    const subject = asStr(obj.subject, 200) || `Quick check-in: your views on ${name}`;
    const emailBody = asStr(obj.body, 4000) || text.slice(0, 2000);
    const payload = { subject, body: emailBody, gaps };
    await setCache(key, payload);
    return NextResponse.json({ ok: true, cached: false, ...payload });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
