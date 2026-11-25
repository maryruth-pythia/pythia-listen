import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  listReports,
  listSynthesisRuns,
  getProject,
} from '@/lib/db';
import { Markdown } from '@/components/Markdown';

export const dynamic = 'force-dynamic';

export default async function Tier1PrintView(
  props: {
    params: Promise<{ id: string }>;
  }
) {
  const params = await props.params;
  const reports = await listReports();
  const report = reports.find((r) => r.id === params.id && r.kind === 'tier1');
  if (!report) notFound();

  const runs = await listSynthesisRuns();
  const run = runs.find((r) => r.id === report.synthesisRunId);
  const project = run ? await getProject(run.projectId) : null;

  return (
    <main className="bg-white">
      <div className="print:hidden mx-auto flex max-w-4xl items-center justify-between border-b border-brand-rule px-6 py-3 text-sm">
        <Link href={run ? `/operator/synthesis/${run.id}` : '/operator/synthesis'} className="text-brand hover:underline">
          ← Back to synthesis
        </Link>
        <div className="flex gap-3">
          <PrintButton />
        </div>
      </div>

      <article className="mx-auto max-w-3xl px-6 py-12 print:px-12 print:py-12">
        {/* Letterhead */}
        <header className="mb-8 border-b-2 border-brand pb-4">
          <p className="text-xs uppercase tracking-[0.2em] text-brand">
            Pythia · Independent Signal Report
          </p>
          <p className="mt-1 text-xs text-ink-subtle">
            Independent · Voluntary · Consent-bound
          </p>
        </header>

        <Markdown
          content={report.contentMarkdown}
          className="prose-pythia text-sm leading-relaxed text-ink"
        />

        <footer className="mt-10 border-t border-brand-rule pt-4 text-xs leading-relaxed text-ink-subtle">
          <p>
            Pythia is independent infrastructure for community voice in clean
            energy and energy-transition projects. We are not the project
            developer. Communities own their contributions; their information
            is shared with developers, funders, or anyone else only with
            explicit permission. {project ? `· Project: ${project.name}` : ''}
          </p>
          <p className="mt-1 font-mono text-[10px]">
            Report ID: {report.id} · Generated {new Date(report.createdAt).toISOString()}
          </p>
        </footer>
      </article>

      <style>{`
        @media print {
          body { background: white; }
          .print\\:hidden { display: none !important; }
          @page { margin: 0.6in; }
        }
      `}</style>
    </main>
  );
}

function PrintButton() {
  return (
    <a
      href="javascript:window.print()"
      className="rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-dark"
    >
      Print / Save as PDF
    </a>
  );
}
