const GRAD = 'linear-gradient(90deg,#FCC029 0%,#EC2BFC 52%,#6A0FC2 100%)';

/**
 * Shown by Next.js while the dashboard server-renders (the analyses can take a
 * beat, especially on a cold cache or a project switch).
 */
export default function Loading() {
  return (
    <div className="-mx-6 -my-8 min-h-screen px-6 py-8" style={{ background: '#F7F5FB' }}>
      <div className="mx-auto max-w-xl rounded-2xl border border-brand-rule bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 h-2 w-40 overflow-hidden rounded-full" style={{ background: '#EEE7DC' }}>
          <div className="h-full w-1/2 animate-pulse rounded-full" style={{ background: GRAD }} />
        </div>
        <p className="font-serif text-lg font-semibold text-brand-dark">Loading your project dashboard…</p>
        <p className="mt-1.5 text-sm text-ink-muted">
          This can take a beat — Pythia is pulling together the analyses (sentiment, clusters,
          questions and more) for this project. It&rsquo;s quicker next time once they&rsquo;re warm.
        </p>
      </div>
    </div>
  );
}
