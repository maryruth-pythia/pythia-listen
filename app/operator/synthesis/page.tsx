import GradientHeader from '@/components/GradientHeader';
import Link from 'next/link';
import {
  listProjects,
  listSessions,
  listSynthesisRuns,
  listReports,
} from '@/lib/db';
import { fmtDate } from '@/components/operator/Shared';
import RunSynthesisButton from './RunSynthesisButton';

export const dynamic = 'force-dynamic';

export default async function SynthesisHome() {
  const [projects, sessions, runs, reports] = await Promise.all([
    listProjects(),
    listSessions(),
    listSynthesisRuns(),
    listReports(),
  ]);

  // Per-project eligibility
  const perProject = projects.map((p) => {
    const projectSessions = sessions.filter((s) => s.projectId === p.id);
    const consentedForDev = projectSessions.filter(
      (s) => s.consent?.mayShareWithDeveloper === true
    );
    const projectRuns = runs.filter((r) => r.projectId === p.id);
    return {
      project: p,
      total: projectSessions.length,
      consented: consentedForDev.length,
      runs: projectRuns,
    };
  });

  const allRunsSorted = [...runs].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );

  return (
    <main>
      <GradientHeader eyebrow="Operator · Synthesis" title="Cross-conversation analysis" />
      <p className="mb-6 max-w-2xl text-sm text-ink-muted">
        Synthesise themes, friction points, shared interests, and design
          implications across consented conversations. Generate Tier 1
          Independent Signal Reports for client delivery.
      </p>

      <section className="mb-10">
        <h2 className="mb-3 font-serif text-lg font-semibold text-brand-dark">
          Run a new synthesis
        </h2>
        {perProject.length === 0 ? (
          <p className="rounded border border-brand-rule bg-brand-vlight p-4 text-sm text-ink-muted">
            No projects yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {perProject.map((p) => (
              <li
                key={p.project.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-brand-rule bg-white p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-ink">{p.project.name}</div>
                  <div className="text-xs text-ink-muted">
                    {p.total} conversation{p.total === 1 ? '' : 's'} ·{' '}
                    {p.consented} consented for developer ·{' '}
                    {p.runs.length} previous run{p.runs.length === 1 ? '' : 's'}
                  </div>
                </div>
                <RunSynthesisButton
                  projectId={p.project.id}
                  disabled={p.consented === 0}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-serif text-lg font-semibold text-brand-dark">
          Past synthesis runs
        </h2>
        {allRunsSorted.length === 0 ? (
          <p className="rounded border border-brand-rule bg-brand-vlight p-4 text-sm text-ink-muted">
            No synthesis runs yet.
          </p>
        ) : (
          <ul className="divide-y divide-brand-rule rounded-lg border border-brand-rule bg-white">
            {allRunsSorted.map((r) => {
              const project = projects.find((p) => p.id === r.projectId);
              const tier1 = reports.find(
                (rep) => rep.synthesisRunId === r.id && rep.kind === 'tier1'
              );
              return (
                <li key={r.id}>
                  <Link
                    href={`/operator/synthesis/${r.id}`}
                    className="block px-4 py-3 transition hover:bg-brand-vlight"
                  >
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <span className="font-medium text-ink">
                        {project?.name ?? '—'}
                      </span>
                      <span className="text-xs text-ink-subtle">
                        {r.includedSessionIds.length} conv · {fmtDate(r.createdAt)}
                      </span>
                      {tier1 && (
                        <span className="ml-auto rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
                          Tier 1 ready
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
