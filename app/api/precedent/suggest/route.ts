/**
 * Suggest several COMPARABLE projects for the current campaign — researched
 * fresh per project and GEOGRAPHICALLY RELEVANT (same country/region and same
 * project type as the campaign). Powers the dashboard's comparable-projects
 * dropdown. Grounded via web search; cached per campaign so it's computed once
 * per project, not on every load.
 *
 * Operator-only (not in the public middleware allowlist).
 */
import { NextRequest, NextResponse } from 'next/server';
import { completeWithWebSearch } from '@/lib/claude';
import { getCampaignById } from '@/lib/campaigns';
import { canAccessCampaign } from '@/lib/scope';
import { cached } from '@/lib/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const TTL = 1000 * 60 * 60 * 24 * 30; // 30 days

function parseArr(raw: string): unknown[] | null {
  let t = raw.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const a = t.indexOf('[');
  const b = t.lastIndexOf(']');
  if (a === -1 || b === -1 || b < a) return null;
  try {
    return JSON.parse(t.slice(a, b + 1)) as unknown[];
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const campaignId = req.nextUrl.searchParams.get('campaign') || '';
  if (!campaignId) {
    return NextResponse.json({ error: 'campaign required' }, { status: 400 });
  }
  if (!(await canAccessCampaign(campaignId))) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  const campaign = await getCampaignById(campaignId);
  if (!campaign) {
    return NextResponse.json({ error: 'unknown campaign' }, { status: 404 });
  }

  // A general-sentiment campaign has no single site to compare against.
  if (campaign.kind !== 'site') {
    return NextResponse.json({ ok: true, suggestions: [], reason: 'not a site project' });
  }

  const descriptor = [
    `Name: ${campaign.name}`,
    campaign.meta ? `Facts: ${campaign.meta}` : '',
    campaign.jurisdiction ? `Location: ${campaign.jurisdiction}` : '',
    campaign.blurb ? `About: ${campaign.blurb}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const prompt = [
    `A community-based organisation is listening around this infrastructure/energy project:`,
    descriptor,
    ``,
    `Suggest 4 to 6 REAL, comparable projects a CBO could learn from — projects`,
    `of the SAME TYPE (e.g. wind, solar, data center, transmission) that faced`,
    `community/siting decisions, and — importantly — in the SAME COUNTRY or`,
    `region as this project (a US project → US comparables; a Mexico project →`,
    `Mexico comparables; etc.). Prefer well-documented cases where you can say`,
    `something real about how agreement was or wasn't reached. Do NOT invent`,
    `projects; only list ones you can actually find.`,
    ``,
    `Return ONLY a JSON array, each item: { "name": string, "location": string,`,
    `"status": a short phrase on where it landed (e.g. "approved with a benefit`,
    `agreement", "withdrawn after opposition", "operating, contested") }.`,
  ].join('\n');

  try {
    const result = await cached(
      `precedent:suggest:${campaignId}`,
      TTL,
      async () => {
        const { text } = await completeWithWebSearch({
          maxTokens: 1200,
          maxResults: 6,
          messages: [{ role: 'user', content: prompt }],
        });
        const arr = parseArr(text) ?? [];
        const suggestions = arr
          .map((x) => x as Record<string, unknown>)
          .filter((x) => x && typeof x.name === 'string' && (x.name as string).trim())
          .slice(0, 6)
          .map((x) => ({
            name: (x.name as string).trim().slice(0, 140),
            location:
              typeof x.location === 'string' ? (x.location as string).trim().slice(0, 120) : '',
            status:
              typeof x.status === 'string' ? (x.status as string).trim().slice(0, 160) : '',
          }));
        return { suggestions };
      },
      (r) => r.suggestions.length > 0 // only cache a non-empty result
    );

    return NextResponse.json(
      { ok: true, ...result },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
