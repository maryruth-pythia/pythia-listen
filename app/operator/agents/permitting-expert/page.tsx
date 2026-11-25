import GradientHeader, { HeaderButton } from '@/components/GradientHeader';
import PermittingExpertChat from '@/components/operator/PermittingExpertChat';

export const metadata = { title: 'Permitting Expert · Pythia' };

export default function PermittingExpertPage() {
  return (
    <main>
      <GradientHeader
        eyebrow="Operator · Agents"
        title="Permitting Expert"
        actions={<HeaderButton href="/operator/agents">← Back to all agents</HeaderButton>}
      />
      <p className="mb-6 max-w-2xl text-sm text-ink-muted">
        Explains the siting / permitting process in plain language — Ohio OPSB
          &amp; SB52 and beyond — with real, clickable sources for every claim.
      </p>

      <PermittingExpertChat />
    </main>
  );
}
