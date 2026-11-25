import GradientHeader from '@/components/GradientHeader';
import Link from 'next/link';
import { listSessions, listProjects } from '@/lib/db';
import { fmtDate } from '@/components/operator/Shared';

export const dynamic = 'force-dynamic';

export default async function ConsentLedger() {
  const [sessions, projects] = await Promise.all([
    listSessions(),
    listProjects(),
  ]);

  const consented = sessions.filter((s) => !!s.consent);

  return (
    <main>
      <GradientHeader eyebrow="Operator · Consent" title="What participants have permitted" />
      <p className="mb-6 max-w-2xl text-sm text-ink-muted">
        Authoritative record of what each participant agreed could be shared
          and with whom. Sharing without a row in this table is a violation of
          our operating principles.
      </p>

      {consented.length === 0 ? (
        <p className="rounded border border-brand-rule bg-brand-vlight p-6 text-sm text-ink-muted">
          No consent records yet. Each conversation that completes the
          permission step contributes one row here.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-brand-rule bg-white">
          <table className="w-full text-sm">
            <thead className="bg-brand-vlight text-left text-xs uppercase tracking-wider text-ink-muted">
              <tr>
                <th className="px-3 py-2">Recorded</th>
                <th className="px-3 py-2">Project</th>
                <th className="px-3 py-2">Lang</th>
                <th className="px-3 py-2">Began</th>
                <th className="px-3 py-2">Identification</th>
                <th className="px-3 py-2">Developer</th>
                <th className="px-3 py-2">Funder</th>
                <th className="px-3 py-2">Public</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-rule">
              {consented.map((s) => {
                const project = projects.find((p) => p.id === s.projectId);
                return (
                  <tr key={s.id}>
                    <td className="px-3 py-2 text-xs text-ink-muted">
                      {fmtDate(s.consent!.recordedAt)}
                    </td>
                    <td className="px-3 py-2">
                      {project?.name ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-xs uppercase">
                      {s.language}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {s.participationConsentState === 'yes_begin' && (
                        <span className="text-emerald-700">yes</span>
                      )}
                      {s.participationConsentState === 'questions_first' && (
                        <span className="text-amber-700">questions</span>
                      )}
                      {s.participationConsentState === 'declined' && (
                        <span className="text-red-700">no</span>
                      )}
                      {!s.participationConsentState && (
                        <span className="text-ink-subtle">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {prettyId(s.consent!.identification)}
                    </td>
                    <Yes value={s.consent!.mayShareWithDeveloper} />
                    <Yes value={s.consent!.mayShareWithFunder} />
                    <Yes value={s.consent!.mayShareInPublicReport} />
                    <td className="px-3 py-2 text-right">
                      <Link
                        href={`/operator/conversations/${s.id}`}
                        className="text-xs text-brand hover:underline"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

function Yes({ value }: { value: boolean }) {
  return (
    <td className="px-3 py-2">
      <span
        className={`inline-block rounded-full px-2 py-0.5 text-xs ${
          value
            ? 'bg-green-50 text-green-800'
            : 'bg-gray-50 text-gray-500'
        }`}
      >
        {value ? 'yes' : 'no'}
      </span>
    </td>
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
