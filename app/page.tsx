import Link from 'next/link';
import Wordmark from '@/components/Wordmark';

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16 sm:py-24">
      <header className="mb-12 border-b border-brand-rule pb-8">
        <div className="mb-4">
          <Wordmark size={26} />
        </div>
        <div className="mb-5 h-1 w-16 rounded-full bg-pythia-gradient" />
        <h1 className="font-serif text-4xl font-semibold text-brand-dark sm:text-5xl">
          Community voice for clean-energy projects.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-muted">
          Independent infrastructure that listens to communities directly, in
          the channels and languages they already use, and produces credible
          third-party signal — early enough to shape decisions, not contest
          them.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/start"
          className="group flex flex-col rounded-lg border border-brand-rule bg-white p-6 transition hover:border-brand hover:bg-brand-vlight"
        >
          <span className="text-xs uppercase tracking-[0.15em] text-brand">
            Community
          </span>
          <span className="mt-2 font-serif text-xl font-semibold text-brand-dark">
            Share your perspective
          </span>
          <span className="mt-3 text-sm leading-relaxed text-ink-muted">
            Have a private conversation with Pythia about a proposed clean-energy
            project in your area. Voluntary, confidential, and yours to control.
          </span>
          <span className="mt-6 text-sm font-medium text-brand group-hover:underline">
            Begin →
          </span>
        </Link>

        <Link
          href="/operator"
          className="group flex flex-col rounded-lg border border-brand-rule bg-white p-6 transition hover:border-brand hover:bg-brand-vlight"
        >
          <span className="text-xs uppercase tracking-[0.15em] text-brand">
            Operator
          </span>
          <span className="mt-2 font-serif text-xl font-semibold text-brand-dark">
            Pythia team dashboard
          </span>
          <span className="mt-3 text-sm leading-relaxed text-ink-muted">
            Manage projects, review conversations and consent records, run
            cross-conversation synthesis, and generate Tier 1 client deliverables.
          </span>
          <span className="mt-6 text-sm font-medium text-brand group-hover:underline">
            Sign in →
          </span>
        </Link>
      </section>

      <footer className="mt-16 border-t border-brand-rule pt-6 text-xs leading-relaxed text-ink-subtle">
        <p>
          Pythia is independent. We are not the developer of any project we
          discuss. Communities own their contributions; their information is
          shared with developers, funders, or anyone else only with explicit
          permission.
        </p>
      </footer>
    </main>
  );
}
