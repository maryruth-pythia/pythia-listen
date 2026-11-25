import GradientHeader, { HeaderButton } from '@/components/GradientHeader';
import ChiefOfStaffChat from '@/components/operator/ChiefOfStaffChat';

export const metadata = { title: 'Chief-of-Staff · Pythia' };

export default function ChiefOfStaffPage() {
  return (
    <main>
      <GradientHeader
        eyebrow="Operator · Agents"
        title="Campaign Chief-of-Staff"
        actions={<HeaderButton href="/operator/agents">← Back to all agents</HeaderButton>}
      />
      <p className="mb-6 max-w-2xl text-sm text-ink-muted">
        Designs your listening project — grounded in Pythia’s own research-
          question and signifier libraries. Advises; you configure.
      </p>

      <ChiefOfStaffChat />
    </main>
  );
}
