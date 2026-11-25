import GradientHeader from '@/components/GradientHeader';
import { listSignals, listIngestionRuns } from '@/lib/db';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FRASIER_CAMPAIGN_ID } from '@/lib/ingest/seed-frasier';
import { CEDAR_CAMPAIGN_ID } from '@/lib/ingest/seed-cedar';
import { KAHUKU_CAMPAIGN_ID } from '@/lib/ingest/seed-kahuku';
import { DGATEWAY_CAMPAIGN_ID } from '@/lib/ingest/seed-datacenter';
import { DEFAULT_CAMPAIGN_ID, getCampaignById } from '@/lib/campaigns';
import { canAccessCampaign } from '@/lib/scope';
import type { Signal, SignalStance } from '@/lib/types';
import CivicRefreshButton from '@/components/operator/CivicRefreshButton';

export const dynamic = 'force-dynamic';

const STANCE: Record<
  SignalStance,
  { label: string; color: string; bg: string }
> = {
  opposition: { label: 'Opposition', color: '#B23A2E', bg: '#FbeceA' },
  concern: { label: 'Concern', color: '#C77D2A', bg: '#FaF0E2' },
  mixed: { label: 'Mixed', color: '#7A6E88', bg: '#F1EEF4' },
  support: { label: 'Support', color: '#4F8A5C', bg: '#EAF3EC' },
  neutral: { label: 'Procedural', color: '#555555', bg: '#F0F0F0' },
};

function fmtDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** Projects the nightly civic-record search covers (app/api/ingest/civic) — only these get "Refresh now". */
const LIVE_CIVIC = new Set([FRASIER_CAMPAIGN_ID, CEDAR_CAMPAIGN_ID, KAHUKU_CAMPAIGN_ID, DGATEWAY_CAMPAIGN_ID]);

export default async function CivicPage(props: { searchParams?: Promise<{ campaign?: string }> }) {
  // Follow the project the operator came from (?campaign=…), like the other source pages.
  const requested = (await props.searchParams)?.campaign;
  const campaign =
    (requested ? await getCampaignById(requested) : undefined) ??
    (await getCampaignById(DEFAULT_CAMPAIGN_ID))!;
  if (!(await canAccessCampaign(campaign.id))) notFound();
  const live = LIVE_CIVIC.has(campaign.id);
  const [signals, runs] = await Promise.all([
    listSignals(campaign.id, 'civic'),
    listIngestionRuns(campaign.id),
  ]);

  // Sort by salience desc, then most-recently observed.
  const sorted = [...signals].sort((a, b) => {
    const sa = a.salience ?? 0;
    const sb = b.salience ?? 0;
    if (sb !== sa) return sb - sa;
    return (b.observedAt ?? '').localeCompare(a.observedAt ?? '');
  });

  const counts: Record<SignalStance, number> = {
    opposition: 0,
    concern: 0,
    mixed: 0,
    support: 0,
    neutral: 0,
  };
  for (const s of signals) counts[s.stance]++;

  const lastRun = runs[0];
  const liveCount = signals.filter((s) => s.origin === 'web_search').length;
  const seedCount = signals.filter((s) => s.origin === 'seed').length;

  return (
    <main>
      <GradientHeader
        eyebrow="Operator · Civic record"
        title={<>{campaign.name}{campaign.jurisdiction ? <> — {campaign.jurisdiction}</> : null}</>}
      />
      <p className="mb-2 text-sm">
        <Link href={`/operator/dashboard?campaign=${encodeURIComponent(campaign.id)}`} className="underline underline-offset-2" style={{ color: '#6A0FC2' }}>
          ← Back to the dashboard
        </Link>
      </p>
      <p className="mb-4 max-w-2xl text-sm text-ink-muted">
        Public-record signal for {campaign.docket || campaign.name}. Every item is
        drawn from a cited public source — no synthesis without a link.
        {!live && ' These records were added from reviewed public sources; this project has no automatic public-record search.'}
      </p>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-ink-subtle">
            {signals.length} signal{signals.length !== 1 ? 's' : ''} ·{' '}
            {seedCount} verified baseline · {liveCount} from live search ·{' '}
            {lastRun ? (
              <>
                last sync {fmtDate(lastRun.finishedAt ?? lastRun.startedAt)}{' '}
                <span
                  style={{
                    color:
                      lastRun.status === 'ok'
                        ? '#4F8A5C'
                        : lastRun.status === 'error'
                          ? '#C77D2A'
                          : '#888',
                  }}
                >
                  ({lastRun.status})
                </span>
              </>
            ) : (
              live ? 'not yet synced' : 'added by hand'
            )}
          </div>
        {live && <CivicRefreshButton />}
      </div>

      {/* Stance summary strip */}
      <div className="mb-6 flex flex-wrap gap-2">
        {(Object.keys(STANCE) as SignalStance[]).map((k) => (
          <div
            key={k}
            className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm"
            style={{ backgroundColor: STANCE[k].bg, color: STANCE[k].color }}
          >
            <span className="font-semibold">{counts[k]}</span>
            <span>{STANCE[k].label}</span>
          </div>
        ))}
      </div>

      {sorted.length === 0 ? (
        <p className="rounded-md border border-brand-rule bg-brand-vlight p-6 text-sm text-ink-muted">
          {live ? (
            <>No civic signals yet. Click <strong>Refresh now</strong> to seed the verified baseline and run the first live pass.</>
          ) : (
            <>No public-record signals for this project yet.</>
          )}
        </p>
      ) : (
        <ul className="space-y-4">
          {sorted.map((s) => (
            <SignalCard key={s.id} signal={s} />
          ))}
        </ul>
      )}

      {/* Sync log */}
      {runs.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 font-serif text-lg font-semibold text-brand-dark">
            Sync log
          </h2>
          <ul className="space-y-1 text-xs text-ink-muted">
            {runs.slice(0, 8).map((r) => (
              <li key={r.id}>
                <div className="flex flex-wrap gap-x-3">
                  <span className="text-ink-subtle">
                    {fmtDate(r.finishedAt ?? r.startedAt)}
                  </span>
                  <span
                    style={{
                      color:
                        r.status === 'ok'
                          ? '#4F8A5C'
                          : r.status === 'error'
                            ? '#C77D2A'
                            : '#888',
                    }}
                  >
                    {r.status}
                  </span>
                  <span>
                    {r.created} new · {r.updated} refreshed · {r.collected}{' '}
                    sources
                  </span>
                  {r.model && <span className="text-ink-subtle">{r.model}</span>}
                  {r.notes && (
                    <span className="text-ink-subtle">— {r.notes}</span>
                  )}
                </div>
                {r.searchQueries && r.searchQueries.length > 0 && (
                  <div className="mt-0.5 pl-2 text-[11px] text-ink-subtle">
                    searched: {r.searchQueries.join(' · ')}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function SignalCard({ signal: s }: { signal: Signal }) {
  const st = STANCE[s.stance];
  return (
    <li className="rounded-lg border border-brand-rule bg-white p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span
          className="rounded px-2 py-0.5 text-xs font-semibold"
          style={{ backgroundColor: st.bg, color: st.color }}
        >
          {st.label}
        </span>
        <span className="rounded bg-brand-light px-2 py-0.5 text-xs text-brand-dark">
          {s.sourceType.replace(/_/g, ' ')}
        </span>
        {s.origin === 'seed' && (
          <span className="rounded border border-brand-rule px-2 py-0.5 text-xs text-ink-subtle">
            verified
          </span>
        )}
        {s.observedAt && (
          <span className="text-xs text-ink-subtle">{fmtDate(s.observedAt)}</span>
        )}
        {typeof s.salience === 'number' && (
          <span className="ml-auto text-xs text-ink-subtle">
            salience {s.salience}
          </span>
        )}
      </div>

      <h3 className="font-serif text-base font-semibold text-ink">{s.title}</h3>
      <p className="mt-1 text-sm text-ink-muted">{s.summary}</p>

      {s.actor && (
        <p className="mt-2 text-xs text-ink-subtle">
          <span className="font-medium text-ink-muted">Who:</span> {s.actor}
        </p>
      )}

      {s.themes.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {s.themes.map((t) => (
            <span
              key={t}
              className="rounded bg-brand-vlight px-1.5 py-0.5 text-[11px] text-brand-dark"
            >
              {t.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      )}

      {s.citations.length > 0 && (
        <div className="mt-3 border-t border-brand-rule pt-2">
          <span className="text-[11px] uppercase tracking-wide text-ink-subtle">
            Sources
          </span>
          <ul className="mt-1 space-y-0.5">
            {s.citations.map((c, i) => (
              <li key={i} className="text-xs">
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand underline underline-offset-2 hover:text-brand-dark"
                >
                  {c.title || c.publisher || hostOf(c.url)}
                </a>
                <span className="text-ink-subtle"> · {hostOf(c.url)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}
