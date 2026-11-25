'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ReportBuilder from './ReportBuilder';

type Survey = { id: string; title: string };
type Project = { id: string; name: string };

/**
 * Persistent top panel — how-to instructions plus the project and survey
 * pickers — that stays visible above the builder. Below it, the heavy analyses
 * fetch client-side; a skeleton shows until they arrive, then the builder swaps
 * in. The survey selection made up here is applied to the brief.
 */
export default function BriefLoader({
  campaign,
  campaignName,
  surveys,
  projects,
}: {
  campaign: string;
  campaignName: string;
  surveys: Survey[];
  projects: Project[];
}) {
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [builderProps, setBuilderProps] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pick, setPick] = useState<Record<string, boolean>>(
    Object.fromEntries(surveys.map((s) => [s.id, true]))
  );
  const [preset, setPreset] = useState<'fact' | 'report'>('fact');
  const [audience, setAudience] = useState<'community' | 'developer'>('community');

  useEffect(() => {
    let live = true;
    setBuilderProps(null);
    setErr(null);
    fetch(`/api/manage/brief-data?campaign=${encodeURIComponent(campaign)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!live) return;
        if (d.ok && d.props) setBuilderProps(d.props);
        else setErr(d?.error ?? 'Could not build the brief.');
      })
      .catch(() => { if (live) setErr('Network error building the brief.'); });
    return () => { live = false; };
  }, [campaign]);

  // Apply the survey selection to whatever the builder receives.
  let builder = null;
  if (builderProps) {
    const sf = builderProps.surveyFindings ?? { surveys: [] };
    const filtered = {
      ...builderProps,
      surveyFindings: {
        ...sf,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        surveys: (sf.surveys ?? []).filter((sv: any) => pick[sv.surveyId] !== false),
      },
    };
    builder = <ReportBuilder {...filtered} preset={preset} audience={audience} onAudience={setAudience} />;
  }

  return (
    <>
      {/* Persistent top panel: instructions + pickers */}
      <div className="mx-auto max-w-5xl px-4">
        <div className="mb-4 rounded-xl border border-brand-rule bg-white p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand">How to use this</p>

          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-subtle">Format</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setPreset('fact'); setAudience('community'); }} className="flex-1 rounded-lg border px-2.5 py-2 text-left" style={{ borderColor: preset === 'fact' ? '#6A0FC2' : '#E7DCD0', background: preset === 'fact' ? '#F7F4FB' : '#fff' }}>
                  <span className="block font-serif text-[14px] font-semibold" style={{ color: '#1F1330' }}>Fact sheet</span>
                  <span className="text-[11px] text-ink-muted">1&ndash;2 pp &middot; skimmable</span>
                </button>
                <button type="button" onClick={() => { setPreset('report'); setAudience('developer'); }} className="flex-1 rounded-lg border px-2.5 py-2 text-left" style={{ borderColor: preset === 'report' ? '#6A0FC2' : '#E7DCD0', background: preset === 'report' ? '#F7F4FB' : '#fff' }}>
                  <span className="block font-serif text-[14px] font-semibold" style={{ color: '#1F1330' }}>Report</span>
                  <span className="text-[11px] text-ink-muted">fuller narrative</span>
                </button>
              </div>
            </div>
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-subtle">Audience</p>
              <div className="flex overflow-hidden rounded-lg border" style={{ borderColor: '#E7DCD0' }}>
                {([['community', 'Community advocacy'], ['developer', 'Developer']] as const).map(([v, lbl], i) => (
                  <button key={v} type="button" onClick={() => setAudience(v)} className="flex-1 px-2 py-2 text-[12px] font-medium" style={{ borderLeft: i === 0 ? 'none' : '1px solid #E7DCD0', background: audience === v ? '#6A0FC2' : '#fff', color: audience === v ? '#fff' : '#6A5F74' }}>{lbl}</button>
                ))}
              </div>
              <p className="mt-1 text-[11px] text-ink-subtle">Sets the tone of the narrative &amp; summary.</p>
            </div>
          </div>

          <p className="mt-3 rounded-md px-3 py-2 text-[12.5px]" style={{ background: '#F7F4FB', color: '#4A3D57' }}>
            {preset === 'fact'
              ? (<>You&rsquo;re building a <b>fact sheet</b> &mdash; short and skimmable. In the left panel, tick the sections to include and drag to reorder; expand <b>Project facts</b> to choose which facts show. Add your headline ask, then Download PDF or .docx. No narrative step &mdash; it stays punchy.</>)
              : (<>You&rsquo;re building a <b>report</b> &mdash; a fuller narrative. In the left panel, pick sections and length, write your case, then click <b>&ldquo;Write the narrative&rdquo;</b> to turn the dashboard data into prose tuned to your audience. Edit the summary, then Download PDF or .docx.</>)}
          </p>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-subtle">Project</p>
              <select
                value={campaign}
                onChange={(e) => router.push(`/operator/report?campaign=${encodeURIComponent(e.target.value)}`)}
                className="w-full rounded-md border px-2 py-1.5 text-[13px]"
                style={{ borderColor: '#E7DCD0', color: '#1F1330' }}
              >
                {projects.length === 0 && <option value={campaign}>{campaignName}</option>}
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-subtle">Surveys to include</p>
              {surveys.length === 0 ? (
                <p className="text-[12.5px] text-ink-muted">No published surveys yet — the brief draws on the civic record and internal docs.</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {surveys.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 text-[12.5px] text-ink">
                      <input
                        type="checkbox"
                        checked={pick[s.id] !== false}
                        onChange={(e) => setPick((m) => ({ ...m, [s.id]: e.target.checked }))}
                        className="accent-brand"
                      />
                      {s.title}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Builder, or a skeleton while the analyses load */}
      {builder ?? (
        <div className="mx-auto max-w-5xl px-4">
          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            <aside className="rounded-xl border border-brand-rule bg-white p-4">
              <div className="rounded-md px-2.5 py-2 text-[12px]" style={{ background: '#F7F4FB', color: '#6A0FC2' }}>
                <span className="inline-block h-2 w-2 animate-pulse rounded-full align-middle" style={{ background: '#6A0FC2' }} />{' '}
                Assembling the analyses… the builder opens in a moment. First build takes a few seconds; quicker once warm.
              </div>
              {err && (
                <p className="mt-2 text-[12px]" style={{ color: '#B23A2E' }}>
                  {err}{' '}
                  <button type="button" onClick={() => window.location.reload()} className="underline">Retry</button>
                </p>
              )}
            </aside>
            <div className="min-w-0 rounded-xl border border-brand-rule bg-white p-8">
              <div className="h-2 w-40 animate-pulse rounded" style={{ background: '#E7DCD0' }} />
              <div className="mt-4 h-6 w-2/3 animate-pulse rounded" style={{ background: '#E7DCD0' }} />
              <div className="mt-6 space-y-3">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-20 animate-pulse rounded" style={{ background: '#F1EAF6' }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
