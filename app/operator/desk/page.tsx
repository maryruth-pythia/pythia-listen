import GradientHeader from '@/components/GradientHeader';
import Link from 'next/link';
import { listSignals } from '@/lib/db';
import { getCampaignById, DEFAULT_CAMPAIGN_ID } from '@/lib/campaigns';
import { canAccessCampaign } from '@/lib/scope';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Desk research · Pythia' };

const STANCE_COLOR: Record<string, string> = {
  opposition: '#B23A2E',
  concern: '#C77D2A',
  mixed: '#7A6E88',
  support: '#4F8A5C',
  neutral: '#9A8FA6',
};

export default async function DeskPage(
  props: {
    searchParams?: Promise<{ campaign?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const campaign =
    (searchParams?.campaign
      ? await getCampaignById(searchParams.campaign)
      : undefined) ?? (await getCampaignById(DEFAULT_CAMPAIGN_ID))!;
  // Deny opening a Project this org doesn't own (no-op in password mode).
  if (!(await canAccessCampaign(campaign.id))) notFound();
  const signals = await listSignals(campaign.id, 'desk');
  signals.sort((a, b) =>
    (b.observedAt ?? b.ingestedAt).localeCompare(a.observedAt ?? a.ingestedAt)
  );

  return (
    <main className="mx-auto max-w-3xl">
      <GradientHeader eyebrow="Operator · Desk research" title={<>{campaign.name} — desk research</>} />
      <p className="mb-4 max-w-2xl text-sm text-ink-muted">
        {signals.length} cited research brief{signals.length !== 1 ? 's' : ''} Pythia gathered
        from public sources. This is its own source, kept separate from the civic record and
        direct listening — these documents are not counted in either of those channels.
      </p>
      <div className="mb-6 text-sm">
        <Link href="/operator/dashboard" className="text-brand underline underline-offset-2">
          ← Back to dashboard
        </Link>
      </div>

      {signals.length === 0 ? (
        <p className="text-sm text-ink-muted">
          No desk-research briefs yet. Run “Refresh all sources” on the dashboard to gather
          Pythia’s cited desk research.
        </p>
      ) : (
        <ul className="space-y-3">
          {signals.map((s) => (
            <li key={s.id} className="rounded-xl border border-brand-rule bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-serif text-[15px] font-semibold text-brand-dark">{s.title}</h2>
                <span
                  className="flex-none whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold"
                  style={{
                    background: `${STANCE_COLOR[s.stance] ?? '#9A8FA6'}22`,
                    color: STANCE_COLOR[s.stance] ?? '#9A8FA6',
                  }}
                >
                  {s.stance}
                </span>
              </div>
              <p className="mt-1 text-[13px] text-ink-muted">{s.summary}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-ink-subtle">
                {s.observedAt && <span>{s.observedAt.slice(0, 10)}</span>}
                {s.themes?.length ? <span>· {s.themes.slice(0, 4).join(', ')}</span> : null}
                {s.citations?.[0]?.url && (
                  <a
                    href={s.citations[0].url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand underline underline-offset-2"
                  >
                    source →
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
