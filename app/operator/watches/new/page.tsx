import GradientHeader, { HeaderButton } from '@/components/GradientHeader';
import WatchCreateChat from '@/components/operator/WatchCreateChat';

export const metadata = { title: 'New Project · Pythia' };

export default function NewWatchPage() {
  return (
    <main>
      <GradientHeader
        eyebrow="Operator · New project"
        title="Create a Project"
        actions={<HeaderButton href="/operator/dashboard">← Back to dashboard</HeaderButton>}
      />
      <p className="mb-6 max-w-2xl text-sm text-ink-muted">
        A Project is one topic on your dashboard. Answer a few quick questions
        and Pythia will set it up and sort your already-connected email &amp;
        Drive into it — no new uploads needed.
      </p>

      <WatchCreateChat />
    </main>
  );
}
