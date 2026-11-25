import GradientHeader from '@/components/GradientHeader';
import MetaSynthesis from '@/components/operator/MetaSynthesis';
import { DEFAULT_CAMPAIGN_ID } from '@/lib/campaigns';

export const metadata = { title: 'Meta-synthesis · Pythia' };

export default function MetaPage() {
  return (
    <main>
      <GradientHeader
        eyebrow="Operator · Meta-synthesis"
        title="Where the sources agree, diverge, and go quiet"
      />
      <p className="mb-6 max-w-2xl text-sm text-ink-muted">
        Reconciles the live civic record with direct community listening into
        agreements, tensions, and under-represented voices.
      </p>

      <MetaSynthesis campaignId={DEFAULT_CAMPAIGN_ID} />
    </main>
  );
}
