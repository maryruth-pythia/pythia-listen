import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSession, listMessages, getProject, listReports } from '@/lib/db';
import { Markdown } from '@/components/Markdown';
import { StatusPill, fmtDate } from '@/components/operator/Shared';
import { getSignifier } from '@/lib/signifiers';

export const dynamic = 'force-dynamic';

export default async function ConversationDetail(
  props: {
    params: Promise<{ id: string }>;
  }
) {
  const params = await props.params;
  const session = await getSession(params.id);
  if (!session) notFound();

  const [project, messages, allReports] = await Promise.all([
    getProject(session.projectId),
    listMessages(session.id),
    listReports(),
  ]);

  const advocacyReport = allReports.find(
    (r) => r.sessionId === session.id && r.kind === 'advocacy_summary'
  );

  return (
    <main>
      <Link
        href="/operator/conversations"
        className="text-sm text-brand hover:underline"
      >
        ← All conversations
      </Link>
      <header className="mt-4 mb-6 border-b border-brand-rule pb-4">
        <div className="flex flex-wrap items-center gap-3">
          <StatusPill status={session.status} />
          <span className="text-xs uppercase text-ink-subtle">
            {session.language}
          </span>
          <span className="text-xs text-ink-subtle">
            Started {fmtDate(session.createdAt)}
          </span>
        </div>
        <h1 className="mt-3 font-serif text-2xl font-semibold text-brand-dark">
          {project?.name ?? 'Conversation'}
        </h1>
        <p className="mt-1 font-mono text-xs text-ink-subtle">{session.id}</p>
      </header>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Transcript */}
        <section>
          <h2 className="mb-3 font-serif text-lg font-semibold text-brand-dark">
            Transcript
          </h2>
          <div className="space-y-4">
            {messages.length === 0 ? (
              <p className="text-sm text-ink-muted">No messages.</p>
            ) : (
              messages.map((m) => (
                <article
                  key={m.id}
                  className={`rounded-lg p-4 ${
                    m.role === 'user'
                      ? 'border border-brand-rule bg-white'
                      : m.stage === 'recap'
                      ? 'border-l-4 border-brand bg-brand-light'
                      : m.stage === 'advocacy'
                      ? 'border-l-4 border-emerald-500 bg-emerald-50'
                      : 'bg-brand-vlight'
                  }`}
                >
                  <header className="mb-2 flex items-center justify-between text-xs text-ink-subtle">
                    <span className="font-medium uppercase tracking-wider">
                      {m.role === 'user' ? 'Participant' : 'Pythia'}
                      {m.stage && (
                        <span className="ml-2 rounded bg-white px-1.5 py-0.5 text-[10px] text-ink-muted">
                          {m.stage}
                        </span>
                      )}
                    </span>
                    <time>{fmtDate(m.createdAt)}</time>
                  </header>
                  {m.role === 'user' ? (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
                      {m.content}
                    </p>
                  ) : (
                    <Markdown
                      content={m.content}
                      className="text-sm leading-relaxed text-ink"
                    />
                  )}
                </article>
              ))
            )}
          </div>
        </section>

        {/* Sidebar: demographics + consent + advocacy summary */}
        <aside className="space-y-5">
          <section className="rounded-lg border border-brand-rule bg-white p-4">
            <h3 className="font-serif text-sm font-semibold uppercase tracking-wider text-brand-dark">
              Began conversation
            </h3>
            <p className="mt-2 text-sm">
              {session.participationConsentState === 'yes_begin' && (
                <span className="text-emerald-700">Yes, agreed to begin</span>
              )}
              {session.participationConsentState === 'questions_first' && (
                <span className="text-amber-700">Had questions first</span>
              )}
              {session.participationConsentState === 'declined' && (
                <span className="text-red-700">Declined to begin</span>
              )}
              {!session.participationConsentState && (
                <span className="text-ink-muted">No record</span>
              )}
            </p>
            {session.participationConsentAt && (
              <p className="mt-1 text-xs text-ink-subtle">
                {fmtDate(session.participationConsentAt)}
              </p>
            )}
          </section>

          {session.photovoiceEntries && session.photovoiceEntries.length > 0 && (
            <section className="rounded-lg border border-brand-rule bg-white p-4">
              <h3 className="font-serif text-sm font-semibold uppercase tracking-wider text-brand-dark">
                Photovoice ({session.photovoiceEntries.length})
              </h3>
              <ul className="mt-3 space-y-3">
                {session.photovoiceEntries.map((e) => (
                  <li key={e.id} className="overflow-hidden rounded-md border border-brand-rule">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={e.imageDataUrl}
                      alt="Participant photo"
                      className="block w-full"
                    />
                    {e.caption && (
                      <p className="border-t border-brand-rule bg-brand-vlight px-2 py-1.5 text-xs italic text-ink">
                        {e.caption}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {session.mapPins && session.mapPins.length > 0 && (
            <section className="rounded-lg border border-brand-rule bg-white p-4">
              <h3 className="font-serif text-sm font-semibold uppercase tracking-wider text-brand-dark">
                Map pins ({session.mapPins.length})
              </h3>
              <ul className="mt-3 space-y-2 text-sm">
                {session.mapPins.map((p, i) => (
                  <li
                    key={p.id}
                    className="rounded-md border border-brand-rule p-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium uppercase tracking-wider text-brand">
                        #{i + 1} · {p.kind ?? 'concern'}
                      </span>
                      <span className="font-mono text-[10px] text-ink-subtle">
                        {p.lat.toFixed(4)}, {p.lng.toFixed(4)}
                      </span>
                    </div>
                    {p.label && (
                      <div className="mt-1 text-sm font-medium text-ink">
                        {p.label}
                      </div>
                    )}
                    {p.note && (
                      <p className="mt-0.5 text-xs text-ink-muted">{p.note}</p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {session.signifierResponses && session.signifierResponses.length > 0 && (
            <section className="rounded-lg border border-brand-rule bg-white p-4">
              <h3 className="font-serif text-sm font-semibold uppercase tracking-wider text-brand-dark">
                Signifier self-scores
              </h3>
              <p className="mt-1 text-xs italic text-ink-subtle">
                Participant's own positioning on the project's selected
                signifiers. Captured after the conversation.
              </p>
              <ul className="mt-3 space-y-3 text-sm">
                {session.signifierResponses.map((r) => {
                  const sig = getSignifier(r.signifierId);
                  if (!sig) return null;
                  return (
                    <li key={r.signifierId}>
                      <div className="font-medium text-ink">{sig.label}</div>
                      {sig.kind === 'dyad' && r.dyadValue !== undefined && (
                        <div className="mt-1 text-xs text-ink-muted">
                          {sig.poleLow} <span className="font-medium text-ink">{r.dyadValue}/100</span> {sig.poleHigh}
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-brand-vlight">
                            <div
                              className="h-full bg-brand"
                              style={{ width: `${r.dyadValue}%` }}
                            />
                          </div>
                        </div>
                      )}
                      {sig.kind === 'triad' && r.triadCoords && (
                        <div className="mt-1 space-y-0.5 text-xs text-ink-muted">
                          <div>
                            {sig.poles[0]}:{' '}
                            <span className="font-medium text-ink">
                              {Math.round(r.triadCoords.a * 100)}%
                            </span>
                          </div>
                          <div>
                            {sig.poles[1]}:{' '}
                            <span className="font-medium text-ink">
                              {Math.round(r.triadCoords.b * 100)}%
                            </span>
                          </div>
                          <div>
                            {sig.poles[2]}:{' '}
                            <span className="font-medium text-ink">
                              {Math.round(r.triadCoords.c * 100)}%
                            </span>
                          </div>
                        </div>
                      )}
                      <div className="mt-1 text-[10px] text-ink-subtle">
                        via {r.capturedVia}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {session.demographics && Object.keys(session.demographics).filter((k) => k !== 'capturedAt').some((k) => (session.demographics as Record<string, unknown>)[k]) && (
            <section className="rounded-lg border border-brand-rule bg-white p-4">
              <h3 className="font-serif text-sm font-semibold uppercase tracking-wider text-brand-dark">
                Demographics
              </h3>
              <dl className="mt-3 space-y-1 text-sm">
                {session.demographics.language && (
                  <Row label="Language" value={session.demographics.language} />
                )}
                {session.demographics.relationshipToArea && (
                  <Row
                    label="Connection"
                    value={session.demographics.relationshipToArea.replace(/_/g, ' ')}
                  />
                )}
                {session.demographics.gender && (
                  <Row
                    label="Gender"
                    value={
                      session.demographics.gender === 'self_describe'
                        ? session.demographics.genderSelfDescribe ?? 'self-described'
                        : session.demographics.gender.replace(/_/g, ' ')
                    }
                  />
                )}
                {session.demographics.indigenous && (
                  <Row
                    label="Indigenous"
                    value={
                      session.demographics.indigenous === 'yes'
                        ? `Yes${
                            session.demographics.indigenousSelfDescribe
                              ? ` — ${session.demographics.indigenousSelfDescribe}`
                              : ''
                          }`
                        : session.demographics.indigenous.replace(/_/g, ' ')
                    }
                  />
                )}
                {session.demographics.ageRange && (
                  <Row
                    label="Age"
                    value={session.demographics.ageRange.replace(/_/g, '–').replace('plus', '+')}
                  />
                )}
              </dl>
              <p className="mt-3 text-xs italic text-ink-subtle">
                AI receives these silently. They are never repeated back as
                labels.
              </p>
            </section>
          )}

          <section className="rounded-lg border border-brand-rule bg-white p-4">
            <h3 className="font-serif text-sm font-semibold uppercase tracking-wider text-brand-dark">
              Consent record
            </h3>
            {session.consent ? (
              <dl className="mt-3 space-y-2 text-sm">
                <Row
                  label="Identification"
                  value={prettyId(session.consent.identification)}
                />
                <Row
                  label="Share with developer"
                  value={session.consent.mayShareWithDeveloper ? 'Yes' : 'No'}
                />
                <Row
                  label="Share with funder"
                  value={session.consent.mayShareWithFunder ? 'Yes' : 'No'}
                />
                <Row
                  label="Public report"
                  value={
                    session.consent.mayShareInPublicReport ? 'Yes' : 'No'
                  }
                />
                {session.consent.notes && (
                  <div className="mt-3 border-t border-brand-rule pt-2">
                    <dt className="text-xs uppercase tracking-wider text-ink-subtle">
                      Notes
                    </dt>
                    <dd className="mt-1 text-sm text-ink">
                      {session.consent.notes}
                    </dd>
                  </div>
                )}
                <p className="mt-3 border-t border-brand-rule pt-2 text-xs text-ink-subtle">
                  Recorded {fmtDate(session.consent.recordedAt)}
                </p>
              </dl>
            ) : (
              <p className="mt-3 text-sm text-ink-muted">
                No consent recorded yet. The participant has not finished the
                conversation, or has not yet reached the permission step.
              </p>
            )}
          </section>

          {advocacyReport && (
            <section className="rounded-lg border-l-4 border-emerald-500 bg-emerald-50 p-4">
              <h3 className="font-serif text-sm font-semibold uppercase tracking-wider text-emerald-900">
                Advocacy summary (participant-facing)
              </h3>
              <Markdown
                content={advocacyReport.contentMarkdown}
                className="mt-3 text-sm leading-relaxed text-ink"
              />
            </section>
          )}
        </aside>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-xs uppercase tracking-wider text-ink-subtle">
        {label}
      </dt>
      <dd className="text-sm text-ink">{value}</dd>
    </div>
  );
}

function prettyId(id: string): string {
  switch (id) {
    case 'anonymous':
      return 'Anonymous';
    case 'self_described':
      return 'Self-described';
    default:
      return id;
  }
}
