import {
  getMyths,
  VERDICT_META,
  type ProjectCard,
} from '@/lib/reference/content';

export default function ProjectReference({ card }: { card: ProjectCard }) {
  const myths = getMyths(card.campaignId);
  return (
    <div className="mx-auto max-w-3xl">
      {/* Plain-language project card */}
      <section className="rounded-2xl border border-brand-rule bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.15em] text-brand">
            The project, in plain language
          </span>
          {card.illustrative && (
            <span className="rounded bg-brand-vlight px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-brand-dark">
              Illustrative
            </span>
          )}
        </div>
        <h2 className="mt-1 font-serif text-2xl font-semibold text-brand-dark">
          {card.name}
        </h2>
        <p className="mt-1 text-[15px] text-ink">{card.oneLine}</p>
        <p className="mt-3 text-sm text-ink-muted">{card.whatItIs}</p>

        <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <Fact label="Where" value={card.where} />
          <Fact label="Size" value={card.size} />
          <Fact label="Developer" value={card.developer} />
          <Fact label="Review process" value={card.process} />
        </dl>

        <div className="mt-4 rounded-lg bg-brand-vlight p-3">
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-dark">
            Where it stands
          </span>
          <p className="mt-1 text-sm text-ink">{card.status}</p>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <h3 className="mb-2 font-serif text-base font-semibold text-brand-dark">
              What the community could gain
            </h3>
            <ul className="space-y-1.5">
              {card.benefits.map((b) => (
                <li key={b} className="flex gap-2 text-sm text-ink-muted">
                  <span style={{ color: '#4F8A5C' }}>+</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-2 font-serif text-base font-semibold text-brand-dark">
              Commitments on the table
            </h3>
            <ul className="space-y-1.5">
              {card.commitments.map((c) => (
                <li key={c} className="flex gap-2 text-sm text-ink-muted">
                  <span style={{ color: '#6A0FC2' }}>•</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Myth vs fact */}
      <section className="mt-8">
        <h2 className="font-serif text-2xl font-semibold text-brand-dark">
          What you’ve heard, and what the evidence says
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-ink-muted">
          Straight answers to the worries that come up most — with the real
          concern behind each one taken seriously, and a source you can check
          yourself.
        </p>

        <div className="mt-5 space-y-4">
          {myths.map((m) => {
            const v = VERDICT_META[m.verdict];
            return (
              <div
                key={m.id}
                className="rounded-xl border border-brand-rule bg-white p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="max-w-xl font-serif text-lg font-semibold text-brand-dark">
                    “{m.claim}”
                  </p>
                  <span
                    className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.06em]"
                    style={{ backgroundColor: v.bg, color: v.color }}
                  >
                    {v.label}
                  </span>
                </div>
                <p className="mt-2 text-[15px] text-ink">{m.answer}</p>
                <div
                  className="mt-3 rounded-lg p-3 text-sm"
                  style={{ background: '#FaF5EC' }}
                >
                  <span className="font-semibold text-brand-dark">
                    The real concern:{' '}
                  </span>
                  <span className="text-ink-muted">{m.concern}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                  {m.sources.map((s) => (
                    <a
                      key={s.url}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[12px] text-brand underline underline-offset-2"
                    >
                      {s.label} →
                    </a>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <p className="mt-8 text-center text-[11px] text-ink-subtle">
        Compiled by the community, for the community · Pythia keeps the data;
        nothing is shared without the community’s say-so.
      </p>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-subtle">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-ink">{value}</dd>
    </div>
  );
}
