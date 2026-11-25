import Link from 'next/link';
import GradientHeader, { GRAD } from '@/components/GradientHeader';

export const metadata = { title: 'Listening tool · Pythia' };

/** The current listening sections — none are hidden; all live here. */
const SECTIONS: {
  href: string;
  label: string;
  title: string;
  desc: string;
}[] = [
  {
    href: '/operator/onboarding',
    label: 'Get set up',
    title: 'First-time setup',
    desc: 'New to Pythia? Bring in your community’s voice and launch your first survey, step by step.',
  },
  {
    href: '/operator/channels',
    label: 'Bring in conversations',
    title: 'Upload chats & emails',
    desc: 'Turn exported WhatsApp, Viber, or email threads into signal — no setup required.',
  },
  {
    href: '/operator/surveys',
    label: 'Surveys',
    title: 'All surveys',
    desc: 'Every survey you’ve built and published — open a public link or delete old ones.',
  },
  {
    href: '/operator/conversations',
    label: 'Conversations',
    title: 'All conversations',
    desc: 'The individual community conversations collected across your projects.',
  },
  {
    href: '/operator/signals',
    label: 'Signals',
    title: 'Self-signification distributions',
    desc: 'How participants tagged their own stories — the signifier distributions.',
  },
  {
    href: '/operator/synthesis',
    label: 'Synthesis',
    title: 'Cross-conversation analysis',
    desc: 'What emerges across conversations — patterns, tensions, and themes.',
  },
  {
    href: '/operator/consent',
    label: 'Consent ledger',
    title: 'What participants have permitted',
    desc: 'Who allowed what to be shared, and with whom — the community’s say-so.',
  },
];

export default function ListeningToolPage() {
  return (
    <>
      <GradientHeader
        eyebrow="Operator · Listening"
        title={<>Build and run your listening</>}
      >
        <p className="max-w-2xl text-[13.5px]" style={{ color: 'rgba(255,255,255,.9)' }}>
          Everything for hearing your community in one place — design a survey with the
          builder, then move through your projects, conversations, signals, synthesis, and
          consent ledger.
        </p>
      </GradientHeader>

      <div className="space-y-8">
        {/* Survey builder — the centerpiece */}
        <section className="rounded-2xl border border-brand-rule bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-brand">
                Start here · live agent
              </span>
              <h2 className="mt-1 font-serif text-2xl font-semibold text-brand-dark">
                Survey Builder
              </h2>
              <p className="mt-1 text-sm text-ink-muted">
                Walks you from “what’s this project about?” to a live community survey — the
                direction you want to take, then the questions you want to ask. It proposes a
                short draft, you give a quick yes, and it builds the survey on the spot.
              </p>
            </div>
            <Link
              href="/operator/agents/survey-builder"
              className="shrink-0 rounded-lg px-4 py-2.5 text-sm font-semibold text-white"
              style={{ background: GRAD }}
            >
              Open the Survey Builder →
            </Link>
          </div>
        </section>

        {/* Sections — nothing hidden */}
        <section>
          <h2 className="mb-1 font-serif text-xl font-semibold" style={{ color: '#1F1330' }}>
            Your listening sections
          </h2>
          <p className="mb-4 max-w-2xl text-[13.5px]" style={{ color: '#6A5F74' }}>
            All of these live under the Listening tool now — open any one.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SECTIONS.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="group flex flex-col rounded-xl border border-brand-rule bg-white p-5 shadow-sm transition hover:border-brand hover:shadow"
              >
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-brand">
                  {s.label}
                </span>
                <span className="mt-1 font-serif text-lg font-semibold text-brand-dark">
                  {s.title}
                </span>
                <span className="mt-1 flex-1 text-sm text-ink-muted">{s.desc}</span>
                <span className="mt-3 text-sm font-medium text-brand group-hover:text-brand-dark">
                  Open →
                </span>
              </Link>
            ))}
          </div>
        </section>

        <p className="text-center text-[11px] text-ink-subtle">
          The community owns the data · nothing is shared without the community’s say-so.
        </p>
      </div>
    </>
  );
}
