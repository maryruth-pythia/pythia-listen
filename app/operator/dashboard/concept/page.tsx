import Link from 'next/link';
import MultiSourceDashboard from '@/components/operator/MultiSourceDashboard';

export const metadata = { title: 'Concept mockup · Pythia' };

export default function ConceptDashboardPage() {
  return (
    <div>
      <div className="mb-4">
        <Link
          href="/operator/dashboard"
          className="text-xs text-brand underline underline-offset-2 hover:text-brand-dark"
        >
          ← Back to the live dashboard
        </Link>
        <p className="mt-1 text-xs text-ink-subtle">
          This is the original design mockup (illustrative data) — kept as a
          reference for features still being wired to live data.
        </p>
      </div>
      <MultiSourceDashboard />
    </div>
  );
}
