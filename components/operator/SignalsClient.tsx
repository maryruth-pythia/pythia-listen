'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { Session, Project } from '@/lib/types';
import type { SignifierId } from '@/lib/signifiers';
import { SIGNIFIERS } from '@/lib/signifiers';
import type { Dyad, SignifierResponse } from '@/lib/signifiers';

// ─── Dyad / triad display sets ───────────────────────────────────────────────

interface DyadDef { id: SignifierId; label: string; poleLow: string; poleHigh: string }

const DYADS: DyadDef[] = [
  { id: 'stance',             label: 'Overall stance on the project', poleLow: 'Strongly opposed',      poleHigh: 'Strongly supportive' },
  { id: 'trust_developer',    label: 'Trust in the developer',        poleLow: 'No trust',              poleHigh: 'Full trust' },
  { id: 'engagement_respect', label: 'How engagement has felt',       poleLow: 'Coercive / extractive', poleHigh: 'Respectful' },
  { id: 'community_impact',   label: 'Expected community impact',     poleLow: 'Strongly negative',     poleHigh: 'Strongly positive' },
];

const ALL_DYADS = SIGNIFIERS.filter((s): s is Dyad => s.kind === 'dyad');

interface TriadDef { id: SignifierId; label: string; poles: [string, string, string] }

const TRIADS: TriadDef[] = [
  { id: 'project_framing', label: 'How the project gets framed',       poles: ['Necessary', 'Wanted by us', 'Imposed on us'] },
  { id: 'who_decides',     label: 'Who should hold decision power',    poles: ['The community', 'The developer', 'The government'] },
];

// ─── Statistical helpers ──────────────────────────────────────────────────────

function mean(vs: number[]) { return vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : 0; }

function stddev(vs: number[]) {
  if (vs.length < 2) return 0;
  const m = mean(vs);
  return Math.sqrt(vs.reduce((s, v) => s + (v - m) ** 2, 0) / vs.length);
}

/** Pearson r between two same-length arrays. */
function pearson(xs: number[], ys: number[]): number {
  if (xs.length < 3) return NaN;
  const mx = mean(xs), my = mean(ys);
  const num = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
  const den = Math.sqrt(
    xs.reduce((s, x) => s + (x - mx) ** 2, 0) *
    ys.reduce((s, y) => s + (y - my) ** 2, 0)
  );
  return den === 0 ? NaN : num / den;
}

function histogram(values: number[], buckets = 10): number[] {
  const counts = Array<number>(buckets).fill(0);
  for (const v of values) counts[Math.min(Math.floor((v / 100) * buckets), buckets - 1)]++;
  return counts;
}

function baryToXY(
  a: number, b: number, c: number,
  vA: [number, number], vB: [number, number], vC: [number, number]
): [number, number] {
  return [a * vA[0] + b * vB[0] + c * vC[0], a * vA[1] + b * vB[1] + c * vC[1]];
}

function bucketColor(i: number, buckets = 10): string {
  const mid = (i + 0.5) / buckets;
  if (mid < 0.35) return '#ef4444';
  if (mid < 0.5)  return '#f59e0b';
  return '#22c55e';
}

// ─── Session-keyed response types ────────────────────────────────────────────

interface SessResp { sessionId: string; response: SignifierResponse }
interface DeltaPoint { sessionId: string; pre: number; post: number; delta: number }

// ─── Main component ───────────────────────────────────────────────────────────

export default function SignalsClient({ sessions, projects }: { sessions: Session[]; projects: Project[] }) {
  const [filterProject, setFilterProject]     = useState('all');
  const [filterLang, setFilterLang]           = useState('all');
  const [filterIndigenous, setFilterIndigenous] = useState('all');
  const [scatterX, setScatterX]               = useState<SignifierId>('stance');
  const [scatterY, setScatterY]               = useState<SignifierId>('trust_developer');

  // Wave comparison date ranges
  const [waveAStart, setWaveAStart] = useState('');
  const [waveAEnd,   setWaveAEnd]   = useState('');
  const [waveBStart, setWaveBStart] = useState('');
  const [waveBEnd,   setWaveBEnd]   = useState('');

  const filtered = useMemo(() => sessions.filter((s) => {
    if (filterProject !== 'all' && s.projectId !== filterProject) return false;
    if (filterLang    !== 'all' && s.language   !== filterLang)   return false;
    if (filterIndigenous !== 'all' && s.demographics?.indigenous !== filterIndigenous) return false;
    return true;
  }), [sessions, filterProject, filterLang, filterIndigenous]);

  // Session-keyed response map
  const sessionResponseMap = useMemo(() => {
    const map = new Map<SignifierId, SessResp[]>();
    for (const s of filtered) {
      for (const r of s.signifierResponses ?? []) {
        const arr = map.get(r.signifierId) ?? [];
        arr.push({ sessionId: s.id, response: r });
        map.set(r.signifierId, arr);
      }
    }
    return map;
  }, [filtered]);

  // Pre/post delta: sessions with both preStance AND post-conversation stance signifier
  const deltaData = useMemo<DeltaPoint[]>(() => {
    return filtered.flatMap((s) => {
      const pre = s.demographics?.preStance;
      if (pre === undefined) return [];
      const postResp = s.signifierResponses?.find(r => r.signifierId === 'stance');
      const post = postResp?.dyadValue;
      if (post === undefined) return [];
      return [{ sessionId: s.id, pre, post, delta: post - pre }];
    });
  }, [filtered]);

  // Wave comparison: filter sessions into wave A and wave B by date range
  const waveASessions = useMemo(() => {
    if (!waveAStart && !waveAEnd) return [];
    return filtered.filter((s) => {
      const d = s.createdAt.slice(0, 10);
      if (waveAStart && d < waveAStart) return false;
      if (waveAEnd   && d > waveAEnd)   return false;
      return true;
    });
  }, [filtered, waveAStart, waveAEnd]);

  const waveBSessions = useMemo(() => {
    if (!waveBStart && !waveBEnd) return [];
    return filtered.filter((s) => {
      const d = s.createdAt.slice(0, 10);
      if (waveBStart && d < waveBStart) return false;
      if (waveBEnd   && d > waveBEnd)   return false;
      return true;
    });
  }, [filtered, waveBStart, waveBEnd]);

  const waveAMap = useMemo(() => {
    const map = new Map<SignifierId, SessResp[]>();
    for (const s of waveASessions) {
      for (const r of s.signifierResponses ?? []) {
        const arr = map.get(r.signifierId) ?? [];
        arr.push({ sessionId: s.id, response: r });
        map.set(r.signifierId, arr);
      }
    }
    return map;
  }, [waveASessions]);

  const waveBMap = useMemo(() => {
    const map = new Map<SignifierId, SessResp[]>();
    for (const s of waveBSessions) {
      for (const r of s.signifierResponses ?? []) {
        const arr = map.get(r.signifierId) ?? [];
        arr.push({ sessionId: s.id, response: r });
        map.set(r.signifierId, arr);
      }
    }
    return map;
  }, [waveBSessions]);

  // Weak signal detection: sessions where any signifier deviates >1.5 SD from cohort mean
  // AND the session is complete (consented or closed).
  const weakSignalSessions = useMemo(() => {
    // Build per-signifier mean + sd across full filtered set
    const signifierStats = new Map<SignifierId, { m: number; sd: number }>();
    for (const [sid, rows] of sessionResponseMap) {
      const vals = rows.map(r => r.response.dyadValue).filter((v): v is number => v !== undefined);
      if (vals.length >= 3) {
        signifierStats.set(sid, { m: mean(vals), sd: stddev(vals) });
      }
    }

    return filtered
      .filter((s) => s.status === 'consented' || s.status === 'closed')
      .flatMap((s) => {
        const flags: Array<{ signifierId: SignifierId; value: number; m: number; sd: number }> = [];
        for (const r of s.signifierResponses ?? []) {
          const v = r.dyadValue;
          if (v === undefined) continue;
          const stats = signifierStats.get(r.signifierId);
          if (!stats || stats.sd === 0) continue;
          if (Math.abs(v - stats.m) > 1.5 * stats.sd) {
            flags.push({ signifierId: r.signifierId, value: v, m: stats.m, sd: stats.sd });
          }
        }
        if (flags.length === 0) return [];
        return [{ session: s, flags }];
      });
  }, [filtered, sessionResponseMap]);

  const n = filtered.length;

  return (
    <div>
      {/* ── Cohort filter bar ── */}
      <div className="mb-8 flex flex-wrap items-end gap-3 rounded-lg border border-brand-rule bg-brand-vlight p-4">
        <FilterSelect label="Project" value={filterProject} onChange={setFilterProject}>
          <option value="all">All projects</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </FilterSelect>
        <FilterSelect label="Language" value={filterLang} onChange={setFilterLang}>
          <option value="all">All languages</option>
          <option value="en">English</option>
          <option value="es">Spanish</option>
          <option value="tl">Tagalog</option>
        </FilterSelect>
        <FilterSelect label="Indigenous" value={filterIndigenous} onChange={setFilterIndigenous}>
          <option value="all">All</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
          <option value="prefer_not_to_say">Prefer not to say</option>
        </FilterSelect>
        <span className="ml-auto self-end text-xs text-ink-subtle">
          {n} conversation{n !== 1 ? 's' : ''} in cohort
        </span>
      </div>

      {n === 0 ? (
        <p className="rounded border border-brand-rule bg-brand-vlight p-6 text-sm text-ink-muted">
          No scored conversations match this cohort.
        </p>
      ) : (
        <div className="space-y-14">

          {/* ── Dyad histograms ── */}
          <section>
            <h2 className="mb-1 font-serif text-xl font-semibold text-brand-dark">Dyad distributions</h2>
            <p className="mb-6 text-sm text-ink-muted">
              Each bar shows how many participants placed themselves in that range. Left = pole A, right = pole B.
              Click a bar to see matching conversations.
            </p>
            <div className="grid gap-6 sm:grid-cols-2">
              {DYADS.map((d) => {
                const rows = sessionResponseMap.get(d.id) ?? [];
                const values = rows.map(r => r.response.dyadValue).filter((v): v is number => v !== undefined);
                return (
                  <DyadHistogram
                    key={d.id}
                    label={d.label}
                    poleLow={d.poleLow}
                    poleHigh={d.poleHigh}
                    rows={rows}
                    values={values}
                    total={n}
                  />
                );
              })}
            </div>
          </section>

          {/* ── Pre/post stance delta ── */}
          {deltaData.length > 0 && (
            <section>
              <h2 className="mb-1 font-serif text-xl font-semibold text-brand-dark">Stance movement</h2>
              <p className="mb-6 text-sm text-ink-muted">
                How far each participant's overall stance shifted between the start of the conversation (pre-interview slider)
                and their post-conversation signifier. Positive = moved toward support.
              </p>
              <DeltaPanel data={deltaData} />
            </section>
          )}

          {/* ── Wave comparison ── */}
          <section>
            <h2 className="mb-1 font-serif text-xl font-semibold text-brand-dark">Wave comparison</h2>
            <p className="mb-4 text-sm text-ink-muted">
              Compare dyad distributions across two engagement rounds or time periods.
              Set date ranges below — sessions are matched by conversation start date.
            </p>
            <div className="mb-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-brand-rule bg-white p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-brand">Wave A</p>
                <div className="flex flex-wrap gap-3">
                  <label className="flex flex-col gap-1 text-xs text-ink-subtle">
                    From
                    <input type="date" value={waveAStart} onChange={e => setWaveAStart(e.target.value)}
                      className="rounded border border-brand-rule px-2 py-1 text-sm focus:border-brand focus:outline-none" />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-ink-subtle">
                    To
                    <input type="date" value={waveAEnd} onChange={e => setWaveAEnd(e.target.value)}
                      className="rounded border border-brand-rule px-2 py-1 text-sm focus:border-brand focus:outline-none" />
                  </label>
                </div>
                <p className="mt-2 text-xs text-ink-subtle">{waveASessions.length} conversations</p>
              </div>
              <div className="rounded-lg border border-brand-rule bg-white p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-brand-dark">Wave B</p>
                <div className="flex flex-wrap gap-3">
                  <label className="flex flex-col gap-1 text-xs text-ink-subtle">
                    From
                    <input type="date" value={waveBStart} onChange={e => setWaveBStart(e.target.value)}
                      className="rounded border border-brand-rule px-2 py-1 text-sm focus:border-brand focus:outline-none" />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-ink-subtle">
                    To
                    <input type="date" value={waveBEnd} onChange={e => setWaveBEnd(e.target.value)}
                      className="rounded border border-brand-rule px-2 py-1 text-sm focus:border-brand focus:outline-none" />
                  </label>
                </div>
                <p className="mt-2 text-xs text-ink-subtle">{waveBSessions.length} conversations</p>
              </div>
            </div>

            {(waveASessions.length > 0 || waveBSessions.length > 0) && (
              <div className="space-y-5">
                {DYADS.map((d) => {
                  const aRows = waveAMap.get(d.id) ?? [];
                  const bRows = waveBMap.get(d.id) ?? [];
                  const aVals = aRows.map(r => r.response.dyadValue).filter((v): v is number => v !== undefined);
                  const bVals = bRows.map(r => r.response.dyadValue).filter((v): v is number => v !== undefined);
                  if (aVals.length === 0 && bVals.length === 0) return null;
                  return (
                    <WaveCompareRow
                      key={d.id}
                      label={d.label}
                      poleLow={d.poleLow}
                      poleHigh={d.poleHigh}
                      aValues={aVals}
                      bValues={bVals}
                    />
                  );
                })}
              </div>
            )}
            {waveASessions.length === 0 && waveBSessions.length === 0 && (
              <p className="rounded border border-brand-rule bg-brand-vlight p-4 text-sm italic text-ink-muted">
                Set date ranges above to compare two waves side by side.
              </p>
            )}
          </section>

          {/* ── Weak signal detection ── */}
          <section>
          {weakSignalSessions.length === 0 ? (
            <div>
              <h2 className="mb-1 font-serif text-xl font-semibold text-brand-dark">Flagged for qualitative follow-up</h2>
              <p className="mt-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                ✓ No outliers detected — all completed sessions fall within 1.5 standard deviations of the cohort mean on every signifier.
              </p>
            </div>
          ) : (
            <div>
              <h2 className="mb-1 font-serif text-xl font-semibold text-brand-dark">Flagged for qualitative follow-up</h2>
              <p className="mb-4 text-sm text-ink-muted">
                Completed conversations where at least one signifier score deviates more than 1.5 standard deviations
                from the cohort mean — potential outliers worth a closer read.
              </p>
              <div className="space-y-2">
                {weakSignalSessions.map(({ session: s, flags }) => (
                  <div key={s.id} className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link
                          href={`/operator/conversations/${s.id}`}
                          className="text-sm font-medium text-brand hover:underline"
                        >
                          Conversation {s.id.slice(0, 8)}…
                        </Link>
                        <p className="mt-0.5 text-xs text-ink-subtle">
                          {s.language.toUpperCase()} · {s.createdAt.slice(0, 10)}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 border border-amber-200">
                        {flags.length} signal{flags.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <ul className="mt-2 space-y-1">
                      {flags.map((f, i) => {
                        const def = ALL_DYADS.find(d => d.id === f.signifierId);
                        const dir = f.value > f.m ? 'high' : 'low';
                        return (
                          <li key={i} className="text-xs text-amber-900">
                            <strong>{def?.label ?? f.signifierId}</strong>: scored {Math.round(f.value)}/100
                            ({dir} outlier — cohort mean {Math.round(f.m)}, SD {f.sd.toFixed(1)})
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
          </section>

          {/* ── Cross-signifier scatter ── */}
          <section>
            <h2 className="mb-1 font-serif text-xl font-semibold text-brand-dark">Cross-signifier correlation</h2>
            <p className="mb-3 text-sm text-ink-muted">
              Pick two dyads to see how they relate across the cohort.
            </p>
            <div className="mb-4 flex flex-wrap gap-4">
              <FilterSelect label="X axis" value={scatterX} onChange={(v) => setScatterX(v as SignifierId)}>
                {ALL_DYADS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
              </FilterSelect>
              <FilterSelect label="Y axis" value={scatterY} onChange={(v) => setScatterY(v as SignifierId)}>
                {ALL_DYADS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
              </FilterSelect>
            </div>
            <CrossSignifierPlot
              xId={scatterX}
              yId={scatterY}
              xLabel={ALL_DYADS.find(d => d.id === scatterX)?.label ?? scatterX}
              yLabel={ALL_DYADS.find(d => d.id === scatterY)?.label ?? scatterY}
              xPoleLow={ALL_DYADS.find(d => d.id === scatterX)?.poleLow ?? ''}
              xPoleHigh={ALL_DYADS.find(d => d.id === scatterX)?.poleHigh ?? ''}
              yPoleLow={ALL_DYADS.find(d => d.id === scatterY)?.poleLow ?? ''}
              yPoleHigh={ALL_DYADS.find(d => d.id === scatterY)?.poleHigh ?? ''}
              sessionResponseMap={sessionResponseMap}
            />
          </section>

          {/* ── Triad plots ── */}
          <section>
            <h2 className="mb-1 font-serif text-xl font-semibold text-brand-dark">Triad distributions</h2>
            <p className="mb-6 text-sm text-ink-muted">
              Each dot is one participant's self-placement inside the triangle. The heat map shows where responses cluster.
            </p>
            <div className="grid gap-8 sm:grid-cols-2">
              {TRIADS.map((t) => {
                const rows = sessionResponseMap.get(t.id) ?? [];
                const coords = rows
                  .map(r => r.response.triadCoords)
                  .filter((c): c is { a: number; b: number; c: number } => c !== undefined);
                return (
                  <TriadPlot key={t.id} label={t.label} poles={t.poles} coords={coords} total={n} />
                );
              })}
            </div>
          </section>

        </div>
      )}
    </div>
  );
}

// ─── DyadHistogram ─────────────────────────────────────────────────────────────

function DyadHistogram({
  label, poleLow, poleHigh, rows, values, total,
}: {
  label: string; poleLow: string; poleHigh: string;
  rows: SessResp[]; values: number[]; total: number;
}) {
  const [openBucket, setOpenBucket] = useState<number | null>(null);

  const BUCKETS = 10;
  const counts = histogram(values, BUCKETS);
  const max    = Math.max(...counts, 1);
  const m      = values.length > 0 ? Math.round(mean(values)) : null;
  const sd     = stddev(values);

  // Which buckets contain outlier sessions (>1.5 SD from mean)?
  function bucketHasOutlier(i: number): boolean {
    if (values.length < 4 || sd === 0) return false;
    const lo = (i / BUCKETS) * 100;
    const hi = ((i + 1) / BUCKETS) * 100;
    return values.some(v => v >= lo && v < hi && Math.abs(v - (m ?? 0)) > 1.5 * sd);
  }

  function sessionsInBucket(i: number): SessResp[] {
    const lo = (i / BUCKETS) * 100;
    const hi = ((i + 1) / BUCKETS) * 100;
    return rows.filter(r => {
      const v = r.response.dyadValue;
      return v !== undefined && v >= lo && (i === BUCKETS - 1 ? v <= hi : v < hi);
    });
  }

  const outlierCount = values.filter(v => m !== null && sd > 0 && Math.abs(v - m) > 1.5 * sd).length;

  const SVG_H = 80;
  const SVG_W = 280;
  const barW  = SVG_W / BUCKETS;

  return (
    <div className="rounded-lg border border-brand-rule bg-white p-4">
      <div className="mb-1 flex items-start justify-between gap-2">
        <span className="text-sm font-medium text-ink">{label}</span>
        {outlierCount > 0 && (
          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
            {outlierCount} outlier{outlierCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      <div className="mb-3 flex justify-between text-xs text-ink-subtle">
        <span>{values.length} response{values.length !== 1 ? 's' : ''}</span>
        {m !== null && <span>Mean: <strong>{m}/100</strong></span>}
      </div>

      {values.length === 0 ? (
        <div className="flex h-20 items-center justify-center rounded bg-brand-vlight text-xs italic text-ink-subtle">
          No responses yet
        </div>
      ) : (
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          width="100%"
          height={SVG_H}
          className="overflow-visible cursor-pointer"
          aria-label={`Histogram: ${label}`}
        >
          {counts.map((count, i) => {
            const barH    = Math.round((count / max) * SVG_H);
            const x       = i * barW + 1;
            const y       = SVG_H - barH;
            const isOpen  = openBucket === i;
            const hasOut  = bucketHasOutlier(i);
            return (
              <g key={i} onClick={() => setOpenBucket(isOpen ? null : i)} style={{ cursor: 'pointer' }}>
                <rect x={x} y={y} width={barW - 2} height={barH}
                  fill={bucketColor(i)} rx={2}
                  opacity={isOpen ? 1 : 0.85}
                  stroke={isOpen ? '#1F1330' : 'none'} strokeWidth={1.5}
                />
                {hasOut && barH > 0 && (
                  <circle cx={x + (barW - 2) / 2} cy={y - 5} r={3} fill="#f59e0b" />
                )}
                {count > 0 && (
                  <title>{`${i * 10}–${i * 10 + 10}: ${count} session${count !== 1 ? 's' : ''}${hasOut ? ' ⚠ outlier' : ''}`}</title>
                )}
              </g>
            );
          })}
          {/* Mean line */}
          {m !== null && (
            <line x1={(m / 100) * SVG_W} y1={0} x2={(m / 100) * SVG_W} y2={SVG_H}
              stroke="#1F1330" strokeWidth={1.5} strokeDasharray="3 2" opacity={0.6} />
          )}
        </svg>
      )}

      <div className="mt-2 flex justify-between text-xs text-ink-subtle">
        <span className="max-w-[45%] leading-tight">{poleLow}</span>
        <span className="max-w-[45%] text-right leading-tight">{poleHigh}</span>
      </div>

      {/* ── Bucket drill-down ── */}
      {openBucket !== null && (() => {
        const bucket = openBucket;
        const matching = sessionsInBucket(bucket);
        return (
          <div className="mt-3 rounded-md border border-brand-rule bg-brand-vlight p-3">
            <p className="mb-2 text-xs font-semibold text-brand-dark">
              Score {bucket * 10}–{bucket * 10 + 10}: {matching.length} session{matching.length !== 1 ? 's' : ''}
            </p>
            {matching.length === 0 ? (
              <p className="text-xs italic text-ink-subtle">No sessions in this range.</p>
            ) : (
              <ul className="space-y-1">
                {matching.map(({ sessionId }) => (
                  <li key={sessionId}>
                    <Link
                      href={`/operator/conversations/${sessionId}`}
                      className="text-xs text-brand underline-offset-2 hover:underline"
                    >
                      View conversation {sessionId.slice(0, 8)}…
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={() => setOpenBucket(null)}
              className="mt-2 text-xs text-ink-subtle hover:text-ink"
            >
              Close ✕
            </button>
          </div>
        );
      })()}
    </div>
  );
}

// ─── DeltaPanel ───────────────────────────────────────────────────────────────

function DeltaPanel({ data }: { data: DeltaPoint[] }) {
  if (data.length === 0) return null;

  const BUCKETS = 10;
  const deltas  = data.map(d => d.delta);
  const bucketSize = 200 / BUCKETS; // range is -100 to +100 = 200 wide
  const counts  = Array<number>(BUCKETS).fill(0);
  for (const d of deltas) {
    const idx = Math.min(Math.floor(((d + 100) / 200) * BUCKETS), BUCKETS - 1);
    counts[idx]++;
  }
  const maxCount = Math.max(...counts, 1);
  const avgDelta = Math.round(mean(deltas));

  const movedToward = deltas.filter(d => d > 5).length;
  const movedAgainst = deltas.filter(d => d < -5).length;
  const unchanged = deltas.length - movedToward - movedAgainst;

  const SVG_H = 80;
  const SVG_W = 280;
  const barW  = SVG_W / BUCKETS;

  function barColor(i: number): string {
    const mid = (i + 0.5) / BUCKETS;
    if (mid < 0.4) return '#ef4444';
    if (mid < 0.55) return '#9ca3af';
    return '#22c55e';
  }

  return (
    <div className="rounded-lg border border-brand-rule bg-white p-5">
      {/* Summary row */}
      <div className="mb-5 grid grid-cols-3 divide-x divide-brand-rule text-center">
        <div className="px-4">
          <p className="text-2xl font-semibold text-green-600">+{movedToward}</p>
          <p className="mt-0.5 text-xs text-ink-muted">moved toward support</p>
        </div>
        <div className="px-4">
          <p className="text-2xl font-semibold text-ink-subtle">{unchanged}</p>
          <p className="mt-0.5 text-xs text-ink-muted">unchanged (±5)</p>
        </div>
        <div className="px-4">
          <p className="text-2xl font-semibold text-red-600">−{movedAgainst}</p>
          <p className="mt-0.5 text-xs text-ink-muted">moved toward opposition</p>
        </div>
      </div>

      {/* Delta histogram */}
      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} width="100%" height={SVG_H} className="overflow-visible">
        {counts.map((count, i) => {
          const barH = Math.round((count / maxCount) * SVG_H);
          return (
            <g key={i}>
              <rect
                x={i * barW + 1} y={SVG_H - barH}
                width={barW - 2} height={barH}
                fill={barColor(i)} rx={2} opacity={0.85}
              />
              {count > 0 && <title>{`${Math.round(-100 + i * bucketSize)}–${Math.round(-100 + (i + 1) * bucketSize)}: ${count}`}</title>}
            </g>
          );
        })}
        {/* Zero line */}
        <line x1={SVG_W / 2} y1={0} x2={SVG_W / 2} y2={SVG_H}
          stroke="#374151" strokeWidth={1} strokeDasharray="3 2" opacity={0.4} />
        {/* Avg delta line */}
        {avgDelta !== 0 && (
          <line
            x1={((avgDelta + 100) / 200) * SVG_W} y1={0}
            x2={((avgDelta + 100) / 200) * SVG_W} y2={SVG_H}
            stroke="#1F1330" strokeWidth={1.5} strokeDasharray="3 2" opacity={0.7}
          />
        )}
      </svg>

      <div className="mt-2 flex justify-between text-xs text-ink-subtle">
        <span>← Moved toward opposition</span>
        <span className="text-ink-subtle">
          {data.length} pair{data.length !== 1 ? 's' : ''} · avg Δ {avgDelta > 0 ? '+' : ''}{avgDelta}
        </span>
        <span>Moved toward support →</span>
      </div>
    </div>
  );
}

// ─── TriadPlot ────────────────────────────────────────────────────────────────

function TriadPlot({
  label, poles, coords, total,
}: {
  label: string; poles: [string, string, string];
  coords: Array<{ a: number; b: number; c: number }>; total: number;
}) {
  const W = 280, H = 260, PAD = 36;
  const vA: [number, number] = [W / 2, PAD];
  const vB: [number, number] = [W - PAD, H - PAD];
  const vC: [number, number] = [PAD, H - PAD];

  const points = coords.map(({ a, b, c }) => baryToXY(a, b, c, vA, vB, vC));
  const cx = (vA[0] + vB[0] + vC[0]) / 3;
  const cy = (vA[1] + vB[1] + vC[1]) / 3;

  return (
    <div className="rounded-lg border border-brand-rule bg-white p-4">
      <div className="mb-1 text-sm font-medium text-ink">{label}</div>
      <div className="mb-3 text-xs text-ink-subtle">
        {coords.length} response{coords.length !== 1 ? 's' : ''}
        {coords.length >= 5 && ' · heat map shows density'}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="overflow-visible" style={{ maxHeight: 240 }}>
        <defs>
          {/* Gaussian blur filter for attractor heat map */}
          <filter id="heatblur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="10" />
          </filter>
        </defs>

        {/* Triangle fill */}
        <polygon
          points={`${vA[0]},${vA[1]} ${vB[0]},${vB[1]} ${vC[0]},${vC[1]}`}
          fill="#f0f6f1" stroke="#cde0d0" strokeWidth={1.5}
        />

        {/* Heat map layer — blurred glow circles at each data point */}
        {coords.length >= 3 && (
          <g filter="url(#heatblur)">
            {points.map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={22}
                fill="#1a5c2e"
                opacity={Math.min(0.35, 0.08 + 0.03 * Math.log(coords.length + 1))}
              />
            ))}
          </g>
        )}

        {/* Centroid reference */}
        <circle cx={cx} cy={cy} r={3} fill="#cde0d0" />

        {/* Crisp participant dots */}
        {points.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={5}
            fill="#1a5c2e" fillOpacity={0.75} stroke="white" strokeWidth={1.5}
          />
        ))}

        {/* Pole labels */}
        <text x={vA[0]} y={vA[1] - 10} textAnchor="middle" fontSize={10} fill="#3d6b4a" fontWeight="600">{poles[0]}</text>
        <text x={vB[0] + 6} y={vB[1] + 14} textAnchor="start"  fontSize={10} fill="#3d6b4a" fontWeight="600">{poles[1]}</text>
        <text x={vC[0] - 6} y={vC[1] + 14} textAnchor="end"    fontSize={10} fill="#3d6b4a" fontWeight="600">{poles[2]}</text>
      </svg>
    </div>
  );
}

// ─── CrossSignifierPlot ───────────────────────────────────────────────────────

function CrossSignifierPlot({
  xId, yId, xLabel, yLabel, xPoleLow, xPoleHigh, yPoleLow, yPoleHigh,
  sessionResponseMap,
}: {
  xId: SignifierId; yId: SignifierId;
  xLabel: string; yLabel: string;
  xPoleLow: string; xPoleHigh: string;
  yPoleLow: string; yPoleHigh: string;
  sessionResponseMap: Map<SignifierId, SessResp[]>;
}) {
  const xRows = sessionResponseMap.get(xId) ?? [];
  const yRows = sessionResponseMap.get(yId) ?? [];

  // Sessions that have both — build lookup maps first
  const xBySession = new Map(xRows.map(r => [r.sessionId, r.response.dyadValue]));
  const yBySession = new Map(yRows.map(r => [r.sessionId, r.response.dyadValue]));

  const points: Array<{ x: number; y: number; sessionId: string }> = [];
  for (const [sid, xVal] of xBySession) {
    const yVal = yBySession.get(sid);
    if (xVal !== undefined && yVal !== undefined) {
      points.push({ x: xVal, y: yVal, sessionId: sid });
    }
  }

  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const r  = pearson(xs, ys);

  if (xId === yId) {
    return (
      <div className="rounded-lg border border-brand-rule bg-brand-vlight p-6 text-sm text-ink-muted">
        Select two different dyads to compare.
      </div>
    );
  }

  const W = 280, H = 240, PAD = 28;
  const plotW = W - PAD * 2;
  const plotH = H - PAD * 2;

  function toSVG(val: number, range: number, offset: number) {
    return offset + (val / 100) * range;
  }

  const strength = isNaN(r) ? '—' : Math.abs(r) < 0.2 ? 'weak' : Math.abs(r) < 0.5 ? 'moderate' : 'strong';
  const direction = isNaN(r) || Math.abs(r) < 0.1 ? '' : r > 0 ? ' positive' : ' negative';

  return (
    <div className="rounded-lg border border-brand-rule bg-white p-4">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-medium text-ink">{xLabel} vs {yLabel}</span>
        {!isNaN(r) && (
          <span className="text-xs text-ink-subtle">
            r = <strong className={Math.abs(r) > 0.3 ? 'text-brand-dark' : ''}>{r.toFixed(2)}</strong>
            {' '}({strength}{direction})
          </span>
        )}
      </div>
      <div className="mb-3 text-xs text-ink-subtle">
        {points.length} session{points.length !== 1 ? 's' : ''} scored on both
      </div>

      {points.length < 2 ? (
        <div className="flex h-32 items-center justify-center rounded bg-brand-vlight text-xs italic text-ink-subtle">
          Not enough data — need at least 2 sessions scored on both dyads.
        </div>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="overflow-visible">
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map(v => (
            <g key={v}>
              <line
                x1={PAD} y1={PAD + plotH - (v / 100) * plotH}
                x2={PAD + plotW} y2={PAD + plotH - (v / 100) * plotH}
                stroke="#e5e7eb" strokeWidth={1}
              />
              <line
                x1={PAD + (v / 100) * plotW} y1={PAD}
                x2={PAD + (v / 100) * plotW} y2={PAD + plotH}
                stroke="#e5e7eb" strokeWidth={1}
              />
            </g>
          ))}
          {/* Axes */}
          <rect x={PAD} y={PAD} width={plotW} height={plotH}
            fill="none" stroke="#d1d5db" strokeWidth={1} rx={2} />

          {/* Dots */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={toSVG(p.x, plotW, PAD)}
              cy={PAD + plotH - (p.y / 100) * plotH}
              r={5} fill="#6A0FC2" fillOpacity={0.65} stroke="white" strokeWidth={1}
            >
              <title>Session {p.sessionId.slice(0, 8)} — {xLabel}: {p.x}, {yLabel}: {p.y}</title>
            </circle>
          ))}

          {/* Axis labels */}
          <text x={PAD} y={H - 4} fontSize={8} fill="#6b7280">{xPoleLow}</text>
          <text x={PAD + plotW} y={H - 4} textAnchor="end" fontSize={8} fill="#6b7280">{xPoleHigh}</text>
          <text x={4} y={PAD + plotH} fontSize={8} fill="#6b7280" writingMode="vertical-rl" transform={`rotate(-90, 8, ${PAD + plotH / 2})`}>{yPoleLow}</text>
        </svg>
      )}

      <div className="mt-1 flex justify-between text-xs text-ink-subtle">
        <span>← {xPoleLow}</span>
        <span className="text-center text-ink-subtle">X: {xLabel}</span>
        <span>{xPoleHigh} →</span>
      </div>
    </div>
  );
}

// ─── WaveCompareRow ───────────────────────────────────────────────────────────

function WaveCompareRow({
  label, poleLow, poleHigh, aValues, bValues,
}: {
  label: string; poleLow: string; poleHigh: string;
  aValues: number[]; bValues: number[];
}) {
  const BUCKETS = 10;
  const aCounts = histogram(aValues, BUCKETS);
  const bCounts = histogram(bValues, BUCKETS);
  const aMax    = Math.max(...aCounts, 1);
  const bMax    = Math.max(...bCounts, 1);
  const aMean   = aValues.length > 0 ? Math.round(mean(aValues)) : null;
  const bMean   = bValues.length > 0 ? Math.round(mean(bValues)) : null;

  const SVG_H = 70;
  const SVG_W = 240;
  const barW  = SVG_W / BUCKETS;

  function MiniHist({ counts, max, mv, wave }: { counts: number[]; max: number; mv: number | null; wave: 'A' | 'B' }) {
    const color = wave === 'A' ? '#6A0FC2' : '#FCC029';
    return (
      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} width="100%" height={SVG_H} className="overflow-visible">
        {counts.map((count, i) => {
          const barH = Math.round((count / max) * SVG_H);
          return (
            <rect key={i}
              x={i * barW + 1} y={SVG_H - barH}
              width={barW - 2} height={barH}
              fill={color} opacity={0.75} rx={2}
            />
          );
        })}
        {mv !== null && (
          <line x1={(mv / 100) * SVG_W} y1={0} x2={(mv / 100) * SVG_W} y2={SVG_H}
            stroke={color} strokeWidth={1.5} strokeDasharray="3 2" opacity={0.9} />
        )}
      </svg>
    );
  }

  return (
    <div className="rounded-lg border border-brand-rule bg-white p-4">
      <p className="mb-3 text-sm font-medium text-ink">{label}</p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="rounded-full bg-brand-vlight px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand">Wave A</span>
            {aMean !== null && <span className="text-xs text-ink-subtle">Mean: <strong>{aMean}</strong></span>}
          </div>
          {aValues.length === 0
            ? <div className="flex h-[70px] items-center justify-center rounded bg-brand-vlight text-xs italic text-ink-subtle">No data</div>
            : <MiniHist counts={aCounts} max={aMax} mv={aMean} wave="A" />
          }
          <p className="mt-1 text-xs text-ink-subtle">{aValues.length} responses</p>
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-700">Wave B</span>
            {bMean !== null && <span className="text-xs text-ink-subtle">Mean: <strong>{bMean}</strong></span>}
          </div>
          {bValues.length === 0
            ? <div className="flex h-[70px] items-center justify-center rounded bg-violet-50 text-xs italic text-ink-subtle">No data</div>
            : <MiniHist counts={bCounts} max={bMax} mv={bMean} wave="B" />
          }
          <p className="mt-1 text-xs text-ink-subtle">{bValues.length} responses</p>
        </div>
      </div>
      <div className="mt-2 flex justify-between text-xs text-ink-subtle">
        <span>{poleLow}</span>
        <span>{poleHigh}</span>
      </div>
    </div>
  );
}

// ─── FilterSelect ─────────────────────────────────────────────────────────────

function FilterSelect({
  label, value, onChange, children,
}: {
  label: string; value: string; onChange: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-ink-subtle">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-brand-rule bg-white px-2 py-1.5 text-sm text-ink focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
      >
        {children}
      </select>
    </label>
  );
}
