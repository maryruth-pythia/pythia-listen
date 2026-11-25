import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getProject,
  listSessions,
  listMessages,
  listSynthesisRuns,
} from '@/lib/db';
import { Markdown } from '@/components/Markdown';
import { StatusPill, fmtDate } from '@/components/operator/Shared';
import { selectedResearchQuestions } from '@/lib/research-questions';
import { selectedSignifiers } from '@/lib/signifiers';
import SignifierEditorPanel from '@/components/operator/SignifierEditorPanel';
import ProjectQRCode from '@/components/operator/ProjectQRCode';

export const dynamic = 'force-dynamic';

export default async function ProjectDetail(
  props: {
    params: Promise<{ id: string }>;
  }
) {
  const params = await props.params;
  const project = await getProject(params.id);
  if (!project) notFound();

  const [allSessions, allRuns] = await Promise.all([
    listSessions(project.id),
    listSynthesisRuns(project.id),
  ]);

  const sessionsWithCounts = await Promise.all(
    allSessions
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(async (s) => ({
        session: s,
        messageCount: (await listMessages(s.id)).length,
      }))
  );

  return (
    <main>
      <Link
        href="/operator/projects"
        className="text-sm text-brand hover:underline"
      >
        ← All surveys
      </Link>

      <header className="mt-4 mb-6 border-b border-brand-rule pb-4">
        <p className="mb-2 text-xs uppercase tracking-[0.18em] text-brand">
          Survey
        </p>
        <h1 className="font-serif text-2xl font-semibold text-brand-dark">
          {project.name}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">{project.location}</p>
        <p className="mt-2 text-xs text-ink-subtle">
          {project.publicComments.length} sampled community concerns ·
          languages: {project.languages.join(', ')} · created{' '}
          {fmtDate(project.createdAt)}
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        <section>
          <h2 className="mb-3 font-serif text-lg font-semibold text-brand-dark">
            Project brief
          </h2>
          <Markdown
            content={project.briefMarkdown}
            className="prose-pythia rounded-lg border border-brand-rule bg-white p-6 text-sm leading-relaxed text-ink"
          />

          {project.researchQuestionIds && project.researchQuestionIds.length > 0 && (
            <>
              <h2 className="mt-10 mb-3 font-serif text-lg font-semibold text-brand-dark">
                Research questions
              </h2>
              <p className="mb-3 text-xs italic text-ink-muted">
                What Pythia tries to surface in conversations on this project.
                Woven in via story-frame, never asked verbatim.
              </p>
              <ol className="space-y-2">
                {selectedResearchQuestions(project.researchQuestionIds).map(
                  (q, i) => (
                    <li
                      key={q.id}
                      className="rounded-lg border border-brand-rule bg-white p-3 text-sm"
                    >
                      <span className="font-medium text-brand-dark">
                        {i + 1}. {q.label}
                      </span>
                      <p className="mt-1 text-xs text-ink-muted">
                        {q.description}
                      </p>
                    </li>
                  )
                )}
              </ol>
            </>
          )}

          {/* ── Signifier configuration (always visible, editable) ── */}
          <h2 className="mt-10 mb-3 font-serif text-lg font-semibold text-brand-dark">
            Signifiers &amp; capture settings
          </h2>
          <p className="mb-3 text-xs italic text-ink-muted">
            What participants self-score after the conversation. Captured via
            drag-and-drop on screen, or by voice when in voice mode.
          </p>
          {project.signifierIds && project.signifierIds.length > 0 && (
            <ul className="mb-4 space-y-2">
              {selectedSignifiers(project.signifierIds).map((s) => (
                <li
                  key={s.id}
                  className="rounded-lg border border-brand-rule bg-white p-3 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-brand-dark">
                      {s.label}
                    </span>
                    <span className="rounded-full bg-brand-vlight px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-brand">
                      {s.kind}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-ink-muted">
                    {s.kind === 'dyad'
                      ? `${(s as { poleLow: string }).poleLow} ↔ ${(s as { poleHigh: string }).poleHigh}`
                      : (s as { poles: string[] }).poles.join(' · ')}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <SignifierEditorPanel
            projectId={project.id}
            initialIds={project.signifierIds ?? []}
            photovoiceEnabled={project.photovoiceEnabled ?? false}
            mappingEnabled={project.mappingEnabled ?? false}
            demographicsEnabled={project.demographicsEnabled ?? true}
          />

          <h2 className="mt-10 mb-3 font-serif text-lg font-semibold text-brand-dark">
            Sampled community concerns
          </h2>
          <p className="mb-3 text-xs italic text-ink-muted">
            What Pythia knows is in the air. Never quoted verbatim to
            participants — used only to recognise concerns when participants
            raise them organically.
          </p>
          {project.publicComments.length === 0 ? (
            <p className="rounded border border-brand-rule bg-brand-vlight p-4 text-sm text-ink-muted">
              No community concerns seeded for this project.
            </p>
          ) : (
            <ul className="space-y-2">
              {project.publicComments.map((c) => (
                <li
                  key={c.id}
                  className="rounded-lg border border-brand-rule bg-white p-3 text-sm"
                >
                  <p className="text-ink">{c.text}</p>
                  <p className="mt-2 text-xs text-ink-subtle">
                    {c.stakeholderType ?? 'community'} · {c.source}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="space-y-5">
          <ProjectQRCode projectId={project.id} projectName={project.name} />

          <section className="rounded-lg border border-brand-rule bg-white p-4">
            <h3 className="font-serif text-sm font-semibold uppercase tracking-wider text-brand-dark">
              Conversations ({sessionsWithCounts.length})
            </h3>
            {sessionsWithCounts.length === 0 ? (
              <p className="mt-3 text-xs text-ink-muted">No conversations yet.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-xs">
                {sessionsWithCounts.map(({ session: s, messageCount }) => (
                  <li key={s.id}>
                    <Link
                      href={`/operator/conversations/${s.id}`}
                      className="block rounded border border-brand-rule p-2 hover:border-brand"
                    >
                      <div className="flex items-center gap-2">
                        <StatusPill status={s.status} />
                        <span className="text-ink-subtle">
                          {s.language.toUpperCase()}
                        </span>
                      </div>
                      <div className="mt-1 text-ink-subtle">
                        {messageCount} msgs · {fmtDate(s.createdAt)}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-lg border border-brand-rule bg-white p-4">
            <h3 className="font-serif text-sm font-semibold uppercase tracking-wider text-brand-dark">
              Synthesis runs ({allRuns.length})
            </h3>
            {allRuns.length === 0 ? (
              <p className="mt-3 text-xs text-ink-muted">
                No synthesis runs yet.{' '}
                <Link
                  href="/operator/synthesis"
                  className="text-brand hover:underline"
                >
                  Run one →
                </Link>
              </p>
            ) : (
              <ul className="mt-3 space-y-2 text-xs">
                {allRuns
                  .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                  .map((r) => (
                    <li key={r.id}>
                      <Link
                        href={`/operator/synthesis/${r.id}`}
                        className="block rounded border border-brand-rule p-2 hover:border-brand"
                      >
                        <div className="text-ink-subtle">
                          {r.includedSessionIds.length} conv ·{' '}
                          {fmtDate(r.createdAt)}
                        </div>
                      </Link>
                    </li>
                  ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}
