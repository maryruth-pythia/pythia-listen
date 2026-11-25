import type { OutlierAnalysis, OutlierKind } from '@/lib/analysis/outliers';

const KIND: Record<OutlierKind, { label: string; color: string }> = {
  divergent: { label: 'Divergent', color: '#6A0FC2' },
  'strong-minority': { label: 'Strong minority', color: '#B23A2E' },
  'rare-theme': { label: 'Rare angle', color: '#2F6B3C' },
  'rare-source': { label: 'Rare source', color: '#C77D2A' },
};

function sourceLabel(sourceType: string): string {
  return sourceType.replace(/^channel_/, '').replace(/_/g, ' ') || 'source';
}

export default function OutliersPanel({ data }: { data: OutlierAnalysis }) {
  if (!data.items.length) {
    return (
      <p className="text-sm text-ink-subtle">
        No clear outliers yet — as more signal that takes a position arrives,
        dissenting and unique views will surface here.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <p className="mb-1 text-xs text-ink-subtle">
        {data.items.length} view{data.items.length === 1 ? '' : 's'} that stand
        apart from the majority — shown verbatim, never averaged into the
        consensus. Click any one to see the detail. Drawn from the{' '}
        {data.considered} signals that expressed a view; names are withheld.
      </p>
      {data.items.map((it) => {
        const k = KIND[it.kind];
        return (
          <details
            key={it.id}
            className="group rounded-lg border border-brand-rule bg-white"
            style={{ borderLeft: `3px solid ${k.color}` }}
          >
            <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 p-3 [&::-webkit-details-marker]:hidden">
              <span
                className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold text-white"
                style={{ background: k.color }}
              >
                {k.label}
              </span>
              <span className="text-sm font-medium text-ink">{it.title}</span>
              <span className="ml-auto text-[11px] text-[#B9A9CE] group-open:hidden">▼</span>
              <span className="ml-auto hidden text-[11px] text-[#B9A9CE] group-open:inline">▲</span>
            </summary>
            <div className="border-t border-brand-rule/50 px-3 py-2">
              <p className="mb-1 text-xs text-ink-subtle">{it.why}</p>
              <p className="text-sm text-ink-muted">{it.summary}</p>
              {it.citation?.url && (
                <a
                  href={it.citation.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-xs text-brand underline underline-offset-2 hover:text-brand-dark"
                >
                  Open source ({sourceLabel(it.sourceType)}) →
                </a>
              )}
            </div>
          </details>
        );
      })}
    </div>
  );
}
