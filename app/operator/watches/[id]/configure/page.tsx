import { notFound } from 'next/navigation';
import { getCampaignById } from '@/lib/campaigns';
import { canAccessCampaign } from '@/lib/scope';
import ConfigureWatch from '@/components/operator/ConfigureWatch';
import ChannelsRefreshButton from '@/components/operator/ChannelsRefreshButton';
import GradientHeader, { HeaderButton } from '@/components/GradientHeader';
import CampaignPicker from '@/components/operator/CampaignPicker';

export const metadata = { title: 'Tune the model · Pythia' };

export default async function ConfigureWatchPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const watch = await getCampaignById(id);
  if (!watch) notFound();
  // Deny configuring a Project this org doesn't own (no-op in password mode).
  if (!(await canAccessCampaign(id))) notFound();

  return (
    <main>
      <GradientHeader
        eyebrow="Operator · Tune the model"
        title={watch.name}
        actions={
          <>
            <ChannelsRefreshButton />
            <HeaderButton href={`/operator/dashboard?campaign=${encodeURIComponent(watch.id)}`}>
              ← Dashboard
            </HeaderButton>
            <HeaderButton href="/operator/agents">Agents →</HeaderButton>
          </>
        }
      >
        <div>
          <span className="text-[12px] uppercase tracking-[0.1em]" style={{ color: 'rgba(255,255,255,.8)' }}>
            Project
          </span>
          <div className="mt-2">
            <CampaignPicker
              basePath=""
              activeId={watch.id}
              hrefPattern="/operator/watches/{id}/configure"
              tone="light"
            />
          </div>
          {watch.meta && (
            <div className="mt-2 text-[12.5px]" style={{ color: 'rgba(255,255,255,.9)' }}>
              {watch.meta}
            </div>
          )}
        </div>
      </GradientHeader>

      <ConfigureWatch watch={watch} />
    </main>
  );
}
