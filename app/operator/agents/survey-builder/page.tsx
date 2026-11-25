import GradientHeader, { HeaderButton } from '@/components/GradientHeader';
import SurveyBuilderChat from '@/components/operator/SurveyBuilderChat';
import { getSurvey } from '@/lib/db';

export const metadata = { title: 'Survey Builder · Pythia' };
export const dynamic = 'force-dynamic';

export default async function SurveyBuilderPage(props: {
  searchParams?: Promise<{ campaign?: string; draft?: string }>;
}) {
  const searchParams = await props.searchParams;
  const campaignId = searchParams?.campaign;

  let initialDraft:
    | { id: string; campaignId?: string; language?: string; spec?: Record<string, unknown> }
    | undefined;
  if (searchParams?.draft) {
    const d = await getSurvey(searchParams.draft);
    if (d) {
      initialDraft = {
        id: d.id,
        campaignId: d.campaignId === 'general' ? undefined : d.campaignId,
        language: d.languages?.[0],
        spec: d.spec as Record<string, unknown>,
      };
    }
  }

  return (
    <main>
      <GradientHeader
        eyebrow="Operator · Agents"
        title="Survey Builder"
        actions={<HeaderButton href="/operator/agents">← Back to all agents</HeaderButton>}
      />
      <p className="mb-6 max-w-2xl text-sm text-ink-muted">
        Walks you from “what’s this project about?” to a live community survey —
        the direction you want to take, then the questions you want to ask. It
        proposes a short draft, you give a quick yes, and it builds the survey
        right here.
      </p>

      <SurveyBuilderChat campaignId={campaignId} initialDraft={initialDraft} />
    </main>
  );
}
