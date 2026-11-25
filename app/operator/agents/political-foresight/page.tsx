import GradientHeader, { HeaderButton } from '@/components/GradientHeader';
import PoliticalForesightChat from '@/components/operator/PoliticalForesightChat';

export const metadata = { title: 'Political Foresight · Pythia' };

export default function PoliticalForesightPage() {
  return (
    <main>
      <GradientHeader
        eyebrow="Operator · Agents"
        title="Political Foresight"
        actions={<HeaderButton href="/operator/agents">← Back to all agents</HeaderButton>}
      />
      <p className="mb-6 max-w-2xl text-sm text-ink-muted">
        Scans legislation, regulation &amp; the clean-energy market for what&rsquo;s
          coming — and what it means for your campaign — with clickable sources.
      </p>

      <PoliticalForesightChat />
    </main>
  );
}
