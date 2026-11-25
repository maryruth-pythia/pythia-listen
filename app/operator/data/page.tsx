import DataConnectors from '@/components/operator/DataConnectors';
import MonitoredSources from '@/components/operator/MonitoredSources';
import { FRASIER_CAMPAIGN_ID, FRASIER_CONTEXT } from '@/lib/ingest/seed-frasier';

export const metadata = { title: 'Data · Pythia' };

export default function DataPage() {
  return (
    <div>
      <DataConnectors />
      <section className="mt-10 border-t border-brand-rule pt-8">
        <p className="mb-3 text-xs uppercase tracking-[0.18em] text-brand">
          Civic-record sources
        </p>
        <MonitoredSources
          campaignId={FRASIER_CAMPAIGN_ID}
          projectName={FRASIER_CONTEXT.projectName}
          jurisdiction={FRASIER_CONTEXT.jurisdiction}
          docket={FRASIER_CONTEXT.docket}
        />
      </section>
    </div>
  );
}
