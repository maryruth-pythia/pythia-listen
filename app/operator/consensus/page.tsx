import {
  computeOpinionClusters,
  type ClusterAnalysis,
} from '@/lib/analysis/clusters';
import { DEFAULT_CAMPAIGN_ID, getCampaignById } from '@/lib/campaigns';
import { canAccessCampaign } from '@/lib/scope';
import { notFound } from 'next/navigation';
import CampaignTabs from '@/components/operator/CampaignTabs';
import OpinionClusters from '@/components/operator/OpinionClusters';
import GradientHeader from '@/components/GradientHeader';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Consensus · Pythia' };

export default async function ConsensusPage(
  props: {
    searchParams?: Promise<{ campaign?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const requested = searchParams?.campaign;
  const campaign =
    (requested ? await getCampaignById(requested) : undefined) ??
    (await getCampaignById(DEFAULT_CAMPAIGN_ID))!;
  // Deny opening a Project this org doesn't own (no-op in password mode).
  if (!(await canAccessCampaign(campaign.id))) notFound();

  let data: ClusterAnalysis;
  try {
    data = await computeOpinionClusters(campaign.id);
  } catch (e) {
    data = {
      campaignId: campaign.id,
      total: 0,
      analyzed: 0,
      camps: [],
      consensus: [],
      divides: [],
      updatedAt: new Date().toISOString(),
      generated: false,
      note: `Analysis failed: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  return (
    <>
      <GradientHeader
        eyebrow="Operator · Consensus"
        title={<>Opinion clusters &amp; consensus</>}
      >
        <p className="max-w-2xl text-[13.5px]" style={{ color: 'rgba(255,255,255,.9)' }}>
          The camps of opinion in this community, and — first — the ground they
          already share. Built to help a developer and the community meet each
          other, not to keep score.
        </p>
        <div className="mt-3">
          <CampaignTabs
            basePath="/operator/consensus"
            activeId={campaign.id}
            tone="light"
          />
        </div>
      </GradientHeader>

      <OpinionClusters data={data} />
    </>
  );
}
