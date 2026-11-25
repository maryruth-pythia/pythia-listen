import Link from 'next/link';
import { listProjects } from '@/lib/db';
import GradientHeader, { HeaderButton } from '@/components/GradientHeader';

export const dynamic = 'force-dynamic';

export default async function ProjectsList() {
  const projects = await listProjects();

  return (
    <main>
      <GradientHeader
        eyebrow="Operator · Surveys"
        title="Surveys"
        actions={
          <>
            <HeaderButton href="/operator/dashboard">← Dashboard</HeaderButton>
            <HeaderButton href="/operator/projects/new" primary>
              + New survey
            </HeaderButton>
          </>
        }
      />

      {projects.length === 0 ? (
        <p className="rounded border border-brand-rule bg-brand-vlight p-6 text-sm text-ink-muted">
          No surveys in store. Run{' '}
          <code className="rounded bg-white px-1 text-xs">npm run db:init</code>{' '}
          or click <em>New survey</em>.
        </p>
      ) : (
        <ul className="space-y-3">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                href={`/operator/projects/${p.id}`}
                className="block rounded-lg border border-brand-rule bg-white p-5 transition hover:border-brand hover:bg-brand-vlight"
              >
                <h2 className="font-serif text-lg font-semibold text-brand-dark">
                  {p.name}
                </h2>
                <p className="mt-1 text-sm text-ink-muted">{p.location}</p>
                <p className="mt-3 text-xs text-ink-subtle">
                  {p.publicComments.length} sampled community concerns ·
                  languages: {p.languages.join(', ')}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
