import { listSurveys } from '@/lib/db';
import { getScopedCampaigns } from '@/lib/scope';
import { accountsEnabled } from '@/lib/session';
import GradientHeader, { HeaderButton } from '@/components/GradientHeader';
import SurveysListClient from '@/components/operator/SurveysListClient';
import CampaignPicker from '@/components/operator/CampaignPicker';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Surveys · Pythia' };

export default async function SurveysPage(props: {
  searchParams?: Promise<{ campaign?: string }>;
}) {
  const sp = await props.searchParams;
  const activeCampaign = sp?.campaign;

  const [allSurveys, campaigns] = await Promise.all([listSurveys(), getScopedCampaigns()]);
  const nameById = new Map(campaigns.map((c) => [c.id, c.name]));
  // In accounts mode, hide surveys whose Project this org doesn't own. Inert in
  // password mode (single implicit tenant), where every survey shows as before.
  const ownedIds = new Set(campaigns.map((c) => c.id));
  const surveys = accountsEnabled()
    ? allSurveys.filter((s) => ownedIds.has(s.campaignId))
    : allSurveys;

  // Scope to the selected Project when one is active; otherwise show all.
  const scoped = activeCampaign
    ? surveys.filter((s) => s.campaignId === activeCampaign)
    : surveys;

  const rows = scoped
    .slice()
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .map((s) => ({
      id: s.id,
      title: ((s.spec as { title?: string })?.title ?? 'Untitled survey').toString(),
      project: nameById.get(s.campaignId) ?? s.campaignId,
      status: s.status,
      createdAt: s.createdAt,
      languages: s.languages,
    }));

  const projectName = activeCampaign
    ? nameById.get(activeCampaign) ?? activeCampaign
    : null;
  const newHref = activeCampaign
    ? `/operator/agents/survey-builder?campaign=${encodeURIComponent(activeCampaign)}`
    : '/operator/agents/survey-builder';

  return (
    <main>
      <GradientHeader
        eyebrow="Operator · Surveys"
        title="Surveys"
        actions={
          <HeaderButton href={newHref} primary>
            + New survey
          </HeaderButton>
        }
      >
        <CampaignPicker basePath="/operator/surveys" activeId={activeCampaign ?? ''} tone="light" />
      </GradientHeader>
      <p className="mb-6 max-w-2xl text-sm text-ink-muted">
        {projectName ? (
          <>
            Surveys for{' '}
            <span className="font-medium text-brand-dark">{projectName}</span>,
            newest first. Open a public link, or delete ones you no longer need.
          </>
        ) : (
          <>
            Every survey you&rsquo;ve built and published, newest first. Open a
            public link, or delete ones you no longer need.
          </>
        )}
      </p>
      <SurveysListClient initial={rows} />
    </main>
  );
}
