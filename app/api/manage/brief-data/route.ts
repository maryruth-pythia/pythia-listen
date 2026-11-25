/**
 * Assembles everything the Briefs builder needs for one project, as JSON, so
 * the page can render an instant setup panel (project + surveys) and fetch the
 * heavy analyses client-side — the slow load streams in behind an interactive
 * shell instead of a blank skeleton. Mirrors the old server-side BriefData.
 *
 * Operator-only (under /api/manage/*).
 */
import { NextRequest, NextResponse } from 'next/server';
import { computeDashboard } from '@/lib/dashboard/aggregate';
import { computeCoalition } from '@/lib/analysis/coalition';
import { computeTopQuestions } from '@/lib/analysis/questions';
import { computeOpinionClusters } from '@/lib/analysis/clusters';
import { computeMetaSynthesis } from '@/lib/synthesis/meta';
import { getCampaignById, DEFAULT_CAMPAIGN_ID } from '@/lib/campaigns';
import { canAccessCampaign } from '@/lib/scope';
import { DEMOGRAPHICS } from '@/lib/reference/demographics';
import { computeRedTeam } from '@/lib/analysis/redteam';
import { getOrgProfile } from '@/lib/org-profile';
import { computeRepresentation } from '@/lib/analysis/representation';
import { getProjectCard } from '@/lib/reference/content';
import { computeSurveyFindings } from '@/lib/analysis/survey-findings';
import { cached } from '@/lib/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const campaignParam = req.nextUrl.searchParams.get('campaign') || undefined;
  const campaign =
    (campaignParam ? await getCampaignById(campaignParam) : undefined) ??
    (await getCampaignById(DEFAULT_CAMPAIGN_ID))!;

  if (!(await canAccessCampaign(campaign.id))) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const now = new Date().toISOString();
  const [data, coalition, questions, clusters, meta, representation, orgProfile, surveyFindings] =
    await Promise.all([
      computeDashboard(campaign.id),
      computeCoalition(campaign.id).catch(() => ({ campaignId: campaign.id, total: 0, members: [], generated: false, updatedAt: now })),
      computeTopQuestions(campaign.id).catch(() => ({ campaignId: campaign.id, total: 0, analyzed: 0, questions: [], generated: false, updatedAt: now })),
      computeOpinionClusters(campaign.id).catch(() => ({ campaignId: campaign.id, total: 0, analyzed: 0, camps: [], consensus: [], divides: [], generated: false, updatedAt: now })),
      computeMetaSynthesis(campaign.id).catch(() => ({ summary: '', agreements: [], tensions: [], missingVoices: [], civicCount: 0, pythiaCount: 0, generatedAt: now })),
      computeRepresentation(campaign.id).catch(() => ({ campaignId: campaign.id, total: 0, analyzed: 0, segments: [], missing: [], pathsForward: [], generated: false, updatedAt: now })),
      getOrgProfile(),
      computeSurveyFindings(campaign.id).catch(() => ({ campaignId: campaign.id, surveys: [], generated: false, updatedAt: now })),
    ]);

  const redteam = await cached(
    `redteam:report:${campaign.id}`,
    1000 * 60 * 30,
    () => computeRedTeam(campaign.id),
    (r) => r.generated
  ).catch(() => null);
  const unsupported = new Set(
    (redteam?.items ?? []).filter((i) => i.verdict === 'unsupported').map((i) => i.claim)
  );
  const metaF = {
    ...meta,
    agreements: meta.agreements.filter((a) => !unsupported.has(`${a.title}: ${a.detail}`)),
    tensions: meta.tensions.filter((t) => !unsupported.has(`${t.title}: ${t.detail}`)),
    missingVoices: meta.missingVoices.filter((m) => !unsupported.has(`${m.title}: ${m.detail}`)),
  };
  const questionsF = { ...questions, questions: questions.questions.filter((q) => !unsupported.has(q.question)) };
  const clustersF = { ...clusters, camps: clusters.camps.filter((c) => !unsupported.has(`${c.label} (~${c.share}%): ${c.gist}`)) };
  const projectCard = getProjectCard(campaign.id) ?? null;

  return NextResponse.json({
    ok: true,
    props: {
      campaignName: campaign.name,
      today: now.slice(0, 10),
      data,
      coalition,
      questions: questionsF,
      clusters: clustersF,
      meta: metaF,
      excludedByRedTeam: unsupported.size,
      demo: DEMOGRAPHICS[campaign.id] ?? null,
      orgProfile,
      representation,
      projectCard,
      surveyFindings,
    },
  });
}
