import GradientHeader from '@/components/GradientHeader';
import { listChannelSignals, driveConfigured } from '@/lib/ingest/channels';
import { loadChannelConfig } from '@/lib/ingest/drive';
import { DEFAULT_CAMPAIGN_ID, getCampaignById } from '@/lib/campaigns';
import { canAccessCampaign } from '@/lib/scope';
import { notFound } from 'next/navigation';
import type { Signal, SignalStance } from '@/lib/types';
import ChannelsRefreshButton from '@/components/operator/ChannelsRefreshButton';
import ConversationUpload from '@/components/operator/ConversationUpload';
import CampaignTabs from '@/components/operator/CampaignTabs';

export const dynamic = 'force-dynamic';

const STANCE: Record<SignalStance, { label: string; color: string; bg: string }> = {
  opposition: { label: 'Opposition', color: '#B23A2E', bg: '#FbeceA' },
  concern: { label: 'Concern', color: '#C77D2A', bg: '#FaF0E2' },
  mixed: { label: 'Mixed', color: '#7A6E88', bg: '#F1EEF4' },
  support: { label: 'Support', color: '#4F8A5C', bg: '#EAF3EC' },
  neutral: { label: 'Neutral', color: '#555555', bg: '#F0F0F0' },
};

const CHANNEL_META: Record<string, { label: string; icon: string }> = {
  channel_email: { label: 'Email', icon: '✉️' },
  channel_whatsapp: { label: 'WhatsApp', icon: '💬' },
  channel_drive: { label: 'Drive docs', icon: '📄' },
};

function metaFor(sourceType: string) {
  return (CHANNEL_META[sourceType] ?? {
    label: sourceType.replace(/^channel_/, '').replace(/_/g, ' '),
    icon: '📥',
  });
}

function fmtDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default async function ChannelsPage(
  props: {
    searchParams?: Promise<{ campaign?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const requested = searchParams?.campaign;
  const campaign =
    (requested ? await getCampaignById(requested) : undefined) ??
    (await getCampaignById(DEFAULT_CAMPAIGN_ID))!;
  // Deny opening a Project this org doesn't own (no-op in password mode).
  if (!(await canAccessCampaign(campaign.id))) notFound();
  const configured = driveConfigured();
  const signals = configured ? await listChannelSignals(campaign.id) : [];
  // The Listening inbox is community channels only — desk research is internal.
  const configuredChannels = loadChannelConfig().filter((c) => c.source !== 'desk');

  // Group by sourceType (channel).
  const groups = new Map<string, Signal[]>();
  for (const s of signals) {
    const arr = groups.get(s.sourceType) ?? [];
    arr.push(s);
    groups.set(s.sourceType, arr);
  }
  const sourceTypes =
    configuredChannels.length > 0
      ? configuredChannels.map((c) => `channel_${c.channel}`)
      : Array.from(groups.keys());

  return (
    <main>
      <GradientHeader eyebrow="Operator · Channels" title="Email, WhatsApp & Drive" />
      <p className="mb-4 max-w-2xl text-sm text-ink-muted">
        Community messages arriving through connected channels, turned into
        direct-listening signal. Messages land in shared folders with no
        campaign tag — Pythia routes each one to the right project from its
        content. Drop a new file into a folder and hit Refresh to watch it
        flow in.
      </p>
      <div className="mb-6">
        <CampaignTabs basePath="/operator/channels" activeId={campaign.id} />
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-xs text-ink-subtle">
            {signals.length} channel signal{signals.length !== 1 ? 's' : ''}{' '}
            routed to {campaign.name}
          </span>
          <ChannelsRefreshButton />
        </div>
      </div>
      <div className="mb-6">
        <ConversationUpload campaignId={campaign.id} />
      </div>
      {!configured ? (
        <SetupCard />
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {sourceTypes.map((st) => {
            const m = metaFor(st);
            const list = groups.get(st) ?? [];
            return (
              <div key={st}>
                <h3 className="mb-2 flex items-center gap-2 border-b border-brand-rule pb-1 font-serif text-base font-semibold text-brand-dark">
                  <span>{m.icon}</span> {m.label}
                  <span className="ml-auto text-xs font-normal text-ink-subtle">
                    {list.length}
                  </span>
                </h3>
                <ul className="space-y-2">
                  {list.length === 0 && (
                    <li className="text-xs text-ink-subtle">
                      No messages yet in this folder.
                    </li>
                  )}
                  {list.map((s) => (
                    <li
                      key={s.id}
                      className="rounded-md border border-brand-rule bg-white p-3"
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <span
                          className="rounded px-1.5 py-0.5 text-[11px] font-semibold"
                          style={{
                            backgroundColor: STANCE[s.stance].bg,
                            color: STANCE[s.stance].color,
                          }}
                        >
                          {STANCE[s.stance].label}
                        </span>
                        {s.observedAt && (
                          <span className="text-[11px] text-ink-subtle">
                            {fmtDate(s.observedAt)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-ink">{s.title}</p>
                      <p className="mt-1 text-xs text-ink-muted">{s.summary}</p>
                      {s.actor && (
                        <p className="mt-1 text-[11px] text-ink-subtle">
                          {s.actor}
                        </p>
                      )}
                      {s.themes.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {s.themes.map((t) => (
                            <span
                              key={t}
                              className="rounded bg-brand-vlight px-1.5 py-0.5 text-[10px] text-brand-dark"
                            >
                              {t.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      )}
                      {s.citations[0]?.url &&
                        s.citations[0].url.startsWith('http') && (
                          <a
                            href={s.citations[0].url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-block text-[11px] text-brand underline underline-offset-2"
                          >
                            open in Drive →
                          </a>
                        )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

function SetupCard() {
  return (
    <div className="rounded-lg border border-brand-rule bg-brand-vlight p-6 text-sm text-ink-muted">
      <h2 className="mb-2 font-serif text-lg font-semibold text-brand-dark">
        Connect your channel folders
      </h2>
      <p className="mb-3">
        This page reads Google Drive folders you share with a Google{' '}
        <em>service account</em> — one folder per channel (Email, WhatsApp,
        Drive docs). Drop dummy messages into those folders and they appear here
        as signal. Full step-by-step is in{' '}
        <code className="rounded bg-white px-1">DRIVE_SETUP.md</code> in the
        repo. In short:
      </p>
      <ol className="ml-5 list-decimal space-y-1">
        <li>Create a Google Cloud service account and enable the Drive API.</li>
        <li>
          Put its JSON key in the Vercel env var{' '}
          <code className="rounded bg-white px-1">PYTHIA_GOOGLE_SA_KEY</code>.
        </li>
        <li>
          Create 3 Drive folders, share each (Viewer) with the service
          account&rsquo;s email.
        </li>
        <li>
          Set folder ids in{' '}
          <code className="rounded bg-white px-1">
            PYTHIA_DRIVE_FOLDER_EMAIL / _WHATSAPP / _DRIVE
          </code>
          .
        </li>
        <li>Redeploy, then click &ldquo;Refresh channels&rdquo;.</li>
      </ol>
    </div>
  );
}
