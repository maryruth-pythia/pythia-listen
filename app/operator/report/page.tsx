import { DEFAULT_CAMPAIGN_ID } from '@/lib/campaigns';
import { getScopedCampaigns } from '@/lib/scope';
import { listSurveys } from '@/lib/db';
import GradientHeader from '@/components/GradientHeader';
import BriefLoader from '@/components/operator/BriefLoader';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Make the case · Pythia' };

// Resolves only lightweight bits (which project, which surveys) so it renders an
// instant, interactive setup panel; BriefLoader fetches the heavy analyses
// client-side and swaps in the builder when they're ready.
export default async function ReportPage(props: {
  searchParams?: Promise<{ campaign?: string }>;
}) {
  const searchParams = await props.searchParams;
  // Resolve only from the org-scoped list, so a URL cannot open a Project this
  // org doesn't own. In password mode the scoped list is every campaign, so this
  // matches the old behaviour.
  const scoped = await getScopedCampaigns();
  const requested = searchParams?.campaign;
  const campaign =
    (requested ? scoped.find((c) => c.id === requested) : undefined) ??
    scoped.find((c) => c.id === DEFAULT_CAMPAIGN_ID) ??
    scoped[0];

  if (!campaign) {
    return (
      <div className="-mx-6 -my-8 min-h-screen px-6 py-8" style={{ background: '#F7F5FB' }}>
        <GradientHeader eyebrow="Operator · Briefs" title="Make the case" />
        <p className="mt-6 text-sm text-ink-muted">No projects yet.</p>
      </div>
    );
  }

  const projects = scoped.map((c) => ({ id: c.id, name: c.name }));
  const surveys = (await listSurveys(campaign.id))
    .filter((s) => s.status === 'published')
    .map((s) => ({ id: s.id, title: (s.spec as { title?: string })?.title || 'Community survey' }));

  return (
    <div className="-mx-6 -my-8 min-h-screen overflow-x-hidden px-6 py-8" style={{ background: '#F7F5FB' }}>
      <GradientHeader eyebrow="Operator · Briefs" title="Make the case" />
      <BriefLoader campaign={campaign.id} campaignName={campaign.name} surveys={surveys} projects={projects} />
    </div>
  );
}
