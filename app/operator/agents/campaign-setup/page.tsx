import GradientHeader, { HeaderButton } from '@/components/GradientHeader';
import CampaignSetupChat from '@/components/operator/CampaignSetupChat';

export const metadata = { title: 'Campaign Setup · Pythia' };

export default function CampaignSetupPage() {
  return (
    <main>
      <GradientHeader
        eyebrow="Operator · Agents"
        title="Campaign Setup"
        actions={<HeaderButton href="/operator/agents">← Back to all agents</HeaderButton>}
      />
      <p className="mb-6 max-w-2xl text-sm text-ink-muted">
        Stand up a new listening project — the agent gathers the basics and
        proposes a full starter config (questions, signifiers, sources) from
        Pythia&rsquo;s own libraries. You review and create it.
      </p>

      <CampaignSetupChat />
    </main>
  );
}
