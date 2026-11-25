import GradientHeader from '@/components/GradientHeader';
import { listSessions, listProjects } from '@/lib/db';
import SignalsClient from '@/components/operator/SignalsClient';

export const dynamic = 'force-dynamic';

export default async function SignalsPage() {
  const [sessions, projects] = await Promise.all([
    listSessions(),
    listProjects(),
  ]);

  // Only sessions that have at least one signifier response.
  const scored = sessions.filter(
    (s) => s.signifierResponses && s.signifierResponses.length > 0
  );

  return (
    <main>
      <GradientHeader eyebrow="Operator · Signals" title="Self-signification distributions" />
      <p className="mb-6 max-w-2xl text-sm text-ink-muted">
        {scored.length} conversation{scored.length !== 1 ? 's' : ''} with self-scores ·{' '}
          participants tag their own stories — Pythia does not score for them.
      </p>

      <SignalsClient sessions={scored} projects={projects} />
    </main>
  );
}
