import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  listSynthesisRuns,
  getProject,
  listSessions,
  listReports,
} from '@/lib/db';
import { Markdown } from '@/components/Markdown';
import { fmtDate } from '@/components/operator/Shared';
import GenerateTier1Button from './GenerateTier1Button';

export const dynamic = 'force-dynamic';

export default async function SynthesisDetail(
  props: {
    params: Promise<{ id: string }>;
  }
) {
  const params = await props.params;
  const allRuns = await listSynthesisRuns();
  const run = allRuns.find((r) => r.id === params.id);
  if (!run) notFound();

  const [project, sessions, reports] = await Promise.all([
    getProject(run.projectId),
    listSessions(run.projectId),
    listReports(),
  ]);

  const tier1 = reports.find(
    (r) => r.synthesisRunId === run.id && r.kind === 'tier1'
  );

  const includedSessions = sessions.filter((s) =>
    run.includedSessionIds.includes(s.id)
  );

  return (
    <main>
      <Link
        href="/operator/synthesis"
        className="text-sm text-brand hover:underline"
      >
        ← Synthesis
      </Link>

      <header className="mt-4 mb-6 border-b border-brand-rule pb-4">
        <p className="mb-2 text-xs uppercase tracking-[0.18em] text-brand">
          Synthesis run
        </p>
        <h1 className="font-serif text-2xl font-semibold text-brand-dark">
          {project?.name ?? '—'}
        </h1>
        <p className="mt-2 text-xs text-ink-muted">
          {includedSessions.length} conversation
          {includedSessions.length === 1 ? '' : 's'} · run {fmtDate(run.createdAt)}
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        <section>
          <h2 className="mb-3 font-serif text-lg font-semibold text-brand-dark">
            Synthesis output
          </h2>
          <Markdown
            content={run.outputMarkdown}
            className="prose-pythia rounded-lg border border-brand-rule bg-white p-6 text-sm leading-relaxed text-ink"
          />

          {tier1 && (
            <section className="mt-10">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-serif text-lg font-semibold text-brand-dark">
                  Tier 1 — Independent Signal Report
                </h2>
                <Link
                  href={`/operator/reports/tier1/${tier1.id}`}
                  className="text-sm text-brand hover:underline"
                >
                  Open print view →
                </Link>
              </div>
              <Markdown
                content={tier1.contentMarkdown}
                className="prose-pythia rounded-lg border-l-4 border-brand bg-brand-light p-6 text-sm leading-relaxed text-ink"
              />
            </section>
          )}
        </section>

        <aside className="space-y-5">
          <section className="rounded-lg border border-brand-rule bg-white p-4">
            <h3 className="font-serif text-sm font-semibold uppercase tracking-wider text-brand-dark">
              Tier 1 deliverable
            </h3>
            {tier1 ? (
              <>
                <p className="mt-2 text-xs text-ink-muted">
                  Generated {fmtDate(tier1.createdAt)}.
                </p>
                <Link
                  href={`/operator/reports/tier1/${tier1.id}`}
                  className="mt-3 inline-block rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark"
                >
                  Open print view
                </Link>
              </>
            ) : (
              <>
                <p className="mt-2 text-xs text-ink-muted">
                  Generate the client-facing Tier 1 report from this synthesis.
                </p>
                <GenerateTier1Button runId={run.id} />
              </>
            )}
          </section>

          <section className="rounded-lg border border-brand-rule bg-white p-4">
            <h3 className="font-serif text-sm font-semibold uppercase tracking-wider text-brand-dark">
              Included conversations
            </h3>
            <ul className="mt-3 space-y-2 text-xs">
              {includedSessions.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/operator/conversations/${s.id}`}
                    className="block rounded border border-brand-rule p-2 hover:border-brand"
                  >
                    <div className="text-ink">
                      {s.language.toUpperCase()} · {s.status}
                    </div>
                    <div className="font-mono text-[10px] text-ink-subtle">
                      {s.id}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </main>
  );
}
