import type { RepresentationAnalysis } from '@/lib/analysis/representation';
import CoachNudge from '@/components/operator/CoachNudge';

const STANCE_COLOR: Record<string, string> = {
  opposition: '#B23A2E',
  concern: '#C77D2A',
  mixed: '#D9B24A',
  support: '#3E8E6E',
  neutral: '#8A8A8A',
};

type Disag = NonNullable<RepresentationAnalysis['disaggregation']>;

function Dim({ title, rows }: { title: string; rows: Disag['gender'] }) {
  if (!rows.length) return null;
  return (
    <div>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-subtle">{title}</p>
      <ul className="space-y-1">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center gap-2 text-[12.5px]">
            <span className="w-40 shrink-0 text-ink-muted">{r.label}</span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-brand-vlight">
              <span className="block h-full rounded-full" style={{ width: `${Math.max(2, r.share)}%`, background: '#6A0FC2' }} />
            </span>
            <span className="w-28 shrink-0 text-right text-ink-subtle">
              {r.n} · {r.share}%{r.meanStance != null ? ` · ${r.meanStance}/100` : ''}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Disagg({ d }: { d: Disag }) {
  if (!d.respondents) return null;
  return (
    <div>
      <h4 className="mb-1 text-xs font-semibold uppercase tracking-[0.1em] text-brand">
        Who actually answered · real numbers
      </h4>
      <p className="mb-3 text-[12px] text-ink-muted">
        Counted from {d.respondents} conversation{d.respondents !== 1 ? 's' : ''} with demographics
        {d.withStance ? '; sentiment is the mean pre-conversation stance (0 opposed – 100 supportive)' : ''}. Not model-generated.
      </p>
      {d.underrepresented.length > 0 && (
        <div className="mb-3 rounded-lg border p-3" style={{ borderColor: '#F0C9C4', background: '#FBECEA' }}>
          <p className="mb-1 text-[12px] font-semibold" style={{ color: '#8A2B22' }}>Under-represented vs the county</p>
          <ul className="space-y-0.5 text-[12.5px]" style={{ color: '#6A5F74' }}>
            {d.underrepresented.map((u) => (
              <li key={u.label}>
                <strong>{u.label}:</strong> {u.respondentShare}% of respondents vs {u.baselinePct}% of the county
                {u.gap < 0 ? ` — ${Math.abs(u.gap)} pts under` : u.gap > 0 ? ` — ${u.gap} pts over` : ''}.{' '}
                <span className="text-ink-subtle">{u.hint}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Dim title="Gender" rows={d.gender} />
        <Dim title="Age" rows={d.age} />
        <Dim title="Relationship to the area" rows={d.relationship} />
        <Dim title="Indigenous identity" rows={d.indigenous} />
      </div>
      {d.baselineSource && (
        <p className="mt-2 text-[11px] text-ink-subtle">
          Baseline: <a href={d.baselineSource.url} target="_blank" rel="noopener noreferrer" className="underline">{d.baselineSource.label}</a>
        </p>
      )}
    </div>
  );
}

export default function RepresentationPanel({
  data,
  density,
}: {
  data: RepresentationAnalysis;
  density?: 'skimmable' | 'balanced' | 'detailed';
}) {
  if (!data.generated) {
    return (
      <div className="flex flex-col gap-5">
        <p className="text-sm text-ink-subtle">
          {data.note ?? 'Not enough signal yet to map representation.'}
        </p>
        {data.disaggregation && data.disaggregation.respondents > 0 && <Disagg d={data.disaggregation} />}
      </div>
    );
  }
  const staticMode = !!density;
  const openAt = (i: number) => density === 'detailed' || (density === 'balanced' && i < 2);

  return (
    <div className={staticMode ? 'rep-static flex flex-col gap-5' : 'flex flex-col gap-5'}>
      {staticMode && (
        <style dangerouslySetInnerHTML={{ __html: '.rep-static summary{pointer-events:none;} .rep-static summary span[class*="B9A9CE"]{display:none;}' }} />
      )}

      {/* Top row: who's in vs who's missing, side by side */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* Segments */}
        {data.segments.length > 0 && (
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-brand">
              Who&rsquo;s in the record — by segment
            </h4>
            <div className="flex flex-col gap-1.5">
              {data.segments.map((s, i) => {
                const color = STANCE_COLOR[s.stance] ?? '#8A8A8A';
                return (
                  <details
                    key={i}
                    open={staticMode ? openAt(i) : undefined}
                    className="group rounded-lg border border-brand-rule bg-white"
                  >
                    <summary className="flex cursor-pointer list-none items-center gap-2 p-2.5 [&::-webkit-details-marker]:hidden">
                      <span className="text-[13px] font-medium text-ink">{s.name}</span>
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white" style={{ background: color }}>
                        {s.stance}
                      </span>
                      <span className="ml-auto text-xs text-ink-subtle">{s.share}%</span>
                      <span className="text-[11px] text-[#B9A9CE] group-open:hidden">▼</span>
                      <span className="hidden text-[11px] text-[#B9A9CE] group-open:inline">▲</span>
                    </summary>
                    <div className="px-2.5 pb-2.5">
                      <div className="mb-1 h-1.5 w-full rounded-full bg-brand-rule/40">
                        <div className="h-1.5 rounded-full" style={{ width: `${Math.max(2, Math.min(100, s.share))}%`, background: color }} />
                      </div>
                      <p className="text-[12.5px] text-ink-muted">{s.gist}</p>
                    </div>
                  </details>
                );
              })}
            </div>
          </div>
        )}

        {/* Who's missing */}
        {data.missing.length > 0 && (
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-brand">
              Who we haven&rsquo;t heard from
            </h4>
            <div className="flex flex-col gap-1.5">
              {data.missing.map((m, i) => (
                <details
                  key={i}
                  open={staticMode ? openAt(i) : undefined}
                  className="group rounded-lg border border-brand-rule bg-white"
                  style={{ borderLeft: '3px solid #B23A2E' }}
                >
                  <summary className="flex cursor-pointer list-none items-center gap-2 p-2.5 [&::-webkit-details-marker]:hidden">
                    <span className="text-[13px] font-medium text-ink">{m.who}</span>
                    <span className="ml-auto text-[11px] text-[#B9A9CE] group-open:hidden">▼</span>
                    <span className="ml-auto hidden text-[11px] text-[#B9A9CE] group-open:inline">▲</span>
                  </summary>
                  <p className="px-2.5 pb-2.5 text-[12.5px] text-ink-muted">{m.why}</p>
                </details>
              ))}
            </div>
            <p className="mt-1 text-xs text-ink-subtle">
              A gap means the record is thin on this voice — not that the view doesn&rsquo;t exist.
            </p>
            {!staticMode && <CoachNudge campaignId={data.campaignId} />}
          </div>
        )}
      </div>

      {/* Paths forward — as compact cards */}
      {data.pathsForward.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-brand">
            Paths forward
          </h4>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {data.pathsForward.map((p, i) => (
              <div key={i} className="rounded-lg border border-brand-rule bg-white p-3" style={{ borderLeft: '3px solid #3E8E6E' }}>
                <p className="text-[13px] font-semibold text-ink">{p.idea}</p>
                <p className="mt-1 text-[12.5px] text-ink-muted">{p.detail}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.disaggregation && <Disagg d={data.disaggregation} />}
    </div>
  );
}
