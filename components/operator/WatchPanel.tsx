'use client';

import { useMemo, useState } from 'react';
import type { Lead, LeadStage, SourceCheck, WatchState } from '@/lib/watch/types';
import WatchMap, { type MapCounty } from './WatchMap';

const C = { plum: '#1F1330', ink: '#2E2438', muted: '#6A5F74', subtle: '#9A8FA6', rule: '#E7DCD0', purple: '#6A0FC2' };
const CARD: React.CSSProperties = {
  background: '#fff',
  border: `1px solid ${C.rule}`,
  borderRadius: 16,
  boxShadow: '0 1px 2px rgba(59,42,78,.05),0 6px 22px rgba(59,42,78,.07)',
};

/** Earliest first: the order a project usually moves through. */
const STAGES: { key: LeadStage; label: string; hint: string; color: string }[] = [
  { key: 'grid', label: 'Grid request', hint: 'Asked PJM to connect: often the first public sign, sometimes years ahead', color: '#FCC029' },
  { key: 'local', label: 'Local agenda', hint: 'Energy project named in a county or town meeting document', color: '#F08A24' },
  { key: 'state', label: 'State filing', hint: 'Notice of intent or application to DEQ', color: '#EC2BFC' },
  { key: 'permitted', label: 'Permitted', hint: 'DEQ permit issued', color: '#9B3FD6' },
  { key: 'built', label: 'Built', hint: 'Construction started or operating', color: '#6A0FC2' },
];
const STAGE = Object.fromEntries(STAGES.map((s) => [s.key, s])) as Record<LeadStage, (typeof STAGES)[number]>;
const SOURCE_LABEL: Record<Lead['source'], string> = { pjm: 'PJM queue', deq: 'DEQ', townhall: 'Town Hall', agenda: 'Agenda' };

const DAY = 86400000;
function isNew(l: Lead, now: number) {
  return !l.baseline && now - Date.parse(l.firstSeen) < 14 * DAY;
}
function isChanged(l: Lead, now: number) {
  return !!l.changedAt && now - Date.parse(l.changedAt) < 14 * DAY;
}
function fmt(d?: string) {
  if (!d) return '';
  const t = new Date(d.length === 10 ? `${d}T12:00:00` : d);
  return isNaN(t.getTime()) ? d : t.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Runs the watch now (every source, every county), then reloads. Used on both tabs. */
function CheckNow({ campaignId, className = '' }: { campaignId: string; className?: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  async function run() {
    setBusy(true);
    setMsg('Checking every source. This takes a minute or two…');
    try {
      const r = await fetch('/api/watch/run', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ campaignId }),
      });
      if (r.ok) {
        setMsg('Done. Reloading…');
        window.location.reload();
        return;
      }
      const body = (await r.json().catch(() => ({}))) as { error?: string };
      setMsg(
        r.status === 401 || r.status === 403
          ? `The check was refused: ${body.error ?? 'your sign-in didn’t reach it'}. Open /api/org/whoami and send it to the Pythia team.`
          : `The check failed (${r.status}${body.error ? `: ${body.error}` : ''}).`
      );
    } catch {
      setMsg('The check didn’t finish. Try again in a moment.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={className}>
      <button
        type="button"
        disabled={busy}
        onClick={run}
        className="cursor-pointer rounded-lg px-3 py-1.5 text-[12.5px] font-semibold text-white disabled:cursor-wait disabled:opacity-60"
        style={{ background: C.purple }}
      >
        {busy ? 'Checking…' : 'Check now'}
      </button>
      {msg && <p className="mt-2 text-[12px]" style={{ color: C.muted }}>{msg}</p>}
    </div>
  );
}

/** Turn one item into its own public-record board, then open it. */
function FollowButton({ campaignId, lead, boardId }: { campaignId: string; lead: Lead; boardId?: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (lead.source === 'agenda') return null;
  if (boardId) {
    return (
      <a href={`/operator/dashboard?campaign=${encodeURIComponent(boardId)}`} className="rounded-md px-2 py-1 text-[11.5px] font-semibold" style={{ background: '#EAF3EC', color: '#2F6B3E' }}>
        Following · open its board →
      </a>
    );
  }
  async function follow() {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch('/api/watch/follow', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ campaignId, leadId: lead.id }),
      });
      const body = (await r.json().catch(() => ({}))) as { url?: string; error?: string };
      if (r.ok && body.url) {
        window.location.href = body.url;
        return;
      }
      setErr(body.error ?? `Couldn’t follow it (${r.status}).`);
    } catch {
      setErr('Couldn’t follow it. Try again in a moment.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <span className="inline-flex flex-col items-start">
      <button
        type="button"
        onClick={follow}
        disabled={busy}
        title="Start a public-record board for this one project: hearing comments, news and filings about it, with the community sections."
        className="cursor-pointer rounded-md px-2 py-1 text-[11.5px] font-semibold disabled:cursor-wait disabled:opacity-60"
        style={{ border: `1px solid ${C.purple}`, color: C.purple, background: '#fff' }}
      >
        {busy ? 'Creating its board…' : '+ Follow this project'}
      </button>
      {err && <span className="mt-1 text-[11px]" style={{ color: '#B42318' }}>{err}</span>}
    </span>
  );
}

export function WatchPipeline({
  state,
  counties,
  campaignId,
}: {
  state: WatchState | null;
  counties: MapCounty[];
  campaignId: string;
}) {
  const [county, setCounty] = useState('all');
  const [showNearby, setShowNearby] = useState(false);
  const [stage, setStage] = useState<LeadStage | 'all'>('all');
  const [open, setOpen] = useState<string | null>(null);
  const now = Date.now();
  const nearbyNames = useMemo(() => new Set(counties.filter((c) => c.tier === 'nearby').map((c) => c.name)), [counties]);
  const allLeads = state?.leads ?? [];
  const nearbyCount = allLeads.filter((l) => nearbyNames.has(l.county)).length;
  // Nearby counties stay out of the counts and list until switched on (or picked on the map).
  const leads = useMemo(
    () => allLeads.filter((l) => showNearby || !nearbyNames.has(l.county) || l.county === county),
    [allLeads, showNearby, nearbyNames, county]
  );
  const inCounty = useMemo(() => leads.filter((l) => county === 'all' || l.county === county), [leads, county]);
  const shown = useMemo(
    () =>
      inCounty
        .filter((l) => stage === 'all' || l.stage === stage)
        .sort((a, b) => {
          const fresh = Number(isNew(b, now) || isChanged(b, now)) - Number(isNew(a, now) || isChanged(a, now));
          if (fresh) return fresh;
          const st = STAGES.findIndex((s) => s.key === a.stage) - STAGES.findIndex((s) => s.key === b.stage);
          if (st) return st;
          return (b.date ?? '').localeCompare(a.date ?? '');
        }),
    [inCounty, stage, now]
  );

  if (!state) {
    return (
      <div className="p-5 text-[13px]" style={{ ...CARD, color: C.muted }}>
        <p>The watch hasn’t run yet. It runs every morning; check now to run it straight away.</p>
        <CheckNow campaignId={campaignId} className="mt-3" />
      </div>
    );
  }

  return (
    <div className="p-5" style={CARD}>
      {/* Stage strip: how many projects sit at each step. Click to filter. */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {STAGES.map((s) => {
          const n = inCounty.filter((l) => l.stage === s.key).length;
          const fresh = inCounty.filter((l) => l.stage === s.key && (isNew(l, now) || isChanged(l, now))).length;
          const on = stage === s.key;
          return (
            <button
              key={s.key}
              type="button"
              title={s.hint}
              onClick={() => setStage(on ? 'all' : s.key)}
              className="rounded-xl px-3 py-2 text-left"
              style={{ border: `1.5px solid ${on ? s.color : C.rule}`, background: on ? `${s.color}14` : '#fff' }}
            >
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: C.muted }}>
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
                {s.label}
              </div>
              <div className="mt-0.5 font-serif text-[24px] font-semibold leading-none" style={{ color: C.plum }}>
                {n}
                {fresh > 0 && <span className="ml-1.5 align-middle text-[11px] font-sans font-semibold" style={{ color: '#B5179E' }}>{fresh} {fresh === 1 ? 'update' : 'updates'}</span>}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-xl p-3" style={{ background: '#FBFAFD', border: `1px solid ${C.rule}` }}>
        <WatchMap counties={counties} leads={allLeads} selected={county} onSelect={setCounty} showNearby={showNearby} />
      </div>

      {/* Say plainly when a source couldn't be read, so an empty stage isn't mistaken for "nothing there". */}
      {(() => {
        const failed = state.checks.filter((k) => !k.ok && k.url);
        if (!failed.length) return null;
        return (
          <div className="mt-4 rounded-lg p-3 text-[12.5px]" style={{ background: '#FbeceA', border: '1px solid #F0C9C4', color: '#8A2B22' }}>
            <b>{failed.length} source{failed.length === 1 ? '' : 's'} couldn’t be read on the last check</b>, so this list is missing
            what {failed.length === 1 ? 'it holds' : 'they hold'}:
            <ul className="mt-1 list-disc pl-5">
              {failed.map((k) => (
                <li key={k.key}>
                  {k.county ? `${counties.find((c) => c.name === k.county)?.label ?? k.county}: ` : ''}
                  {k.label}
                  {k.note ? ` (${k.note})` : ''}
                </li>
              ))}
            </ul>
          </div>
        );
      })()}

      <div className="mt-4 flex flex-wrap items-center gap-2 text-[12px]" style={{ color: C.muted }}>
        <label htmlFor="watch-county">County</label>
        <select id="watch-county" value={county} onChange={(e) => setCounty(e.target.value)} className="rounded-md border px-2 py-1" style={{ borderColor: C.rule }}>
          <option value="all">All ({leads.length})</option>
          {counties
            .filter((c) => c.tier !== 'nearby' || showNearby)
            .map((c) => (
              <option key={c.name} value={c.name}>
                {c.label}
                {c.tier === 'nearby' ? ' (nearby)' : ''} ({allLeads.filter((l) => l.county === c.name).length})
              </option>
            ))}
        </select>
        {nearbyNames.size > 0 && (
          <label className="inline-flex cursor-pointer items-center gap-1.5">
            <input type="checkbox" checked={showNearby} onChange={(e) => setShowNearby(e.target.checked)} />
            Include nearby counties ({nearbyCount})
          </label>
        )}
        {stage !== 'all' && (
          <button type="button" onClick={() => setStage('all')} className="underline underline-offset-2">
            Show all stages
          </button>
        )}
        <span className="ml-auto" style={{ color: C.subtle }}>Checked {fmt(state.updatedAt)}</span>
      </div>

      <ul className="mt-2">
        {shown.length === 0 && (
          <li className="py-4 text-[13px]" style={{ color: C.subtle }}>
            Nothing at this stage{county !== 'all' ? ' in this county' : ''} right now.
          </li>
        )}
        {shown.map((l) => {
          const s = STAGE[l.stage];
          const fresh = isNew(l, now);
          const changed = !fresh && isChanged(l, now);
          const expanded = open === l.id;
          return (
            <li key={l.id} className="py-3" style={{ borderTop: `1px solid ${C.rule}` }}>
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="rounded px-1.5 py-0.5 font-semibold" style={{ background: `${s.color}22`, color: C.ink }}>{s.label}</span>
                <span className="rounded px-1.5 py-0.5" style={{ background: '#F4EFF8', color: C.muted }}>{counties.find((c) => c.name === l.county)?.label ?? l.county}</span>
                <span style={{ color: C.subtle }}>{SOURCE_LABEL[l.source]}{l.date ? ` · ${fmt(l.date)}` : ''}</span>
                {fresh && <span className="rounded px-1.5 py-0.5 font-semibold" style={{ background: '#FCE4F6', color: '#B5179E' }}>New</span>}
                {changed && (
                  <span className="rounded px-1.5 py-0.5 font-semibold" style={{ background: '#FCF6C4', color: '#8A6A00' }} title={`Was: ${l.prevStatus ?? '?'}`}>
                    Status changed
                  </span>
                )}
              </div>
              <a href={l.url} target="_blank" rel="noopener noreferrer" className="mt-1 block text-[14px] font-semibold hover:underline" style={{ color: C.plum }}>
                {l.title} →
              </a>
              <p className="mt-0.5 text-[12.5px] leading-snug" style={{ color: C.muted }}>{l.detail}</p>
              {l.related && l.related.length > 0 && (
                <p className="mt-1 text-[12px]" style={{ color: C.ink }}>
                  <span style={{ color: C.subtle }}>Same project in: </span>
                  {l.related.map((r, i) => (
                    <span key={r.id}>
                      {i > 0 && ' · '}
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                        {SOURCE_LABEL[r.source]}: {r.title}
                      </a>
                      <span style={{ color: r.how === 'name' ? '#2F6B3E' : '#9A5A12' }}>
                        {r.how === 'name' ? ' (same name)' : ' (likely: same county and size)'}
                      </span>
                    </span>
                  ))}
                </p>
              )}
              <div className="mt-1.5">
                <FollowButton campaignId={campaignId} lead={l} boardId={state.follows?.[l.id]} />
              </div>
              {l.excerpt && (
                <>
                  <button type="button" onClick={() => setOpen(expanded ? null : l.id)} className="mt-1 text-[11.5px] underline underline-offset-2" style={{ color: C.purple }}>
                    {expanded ? 'Hide' : 'Show'} the passages
                  </button>
                  {expanded && (
                    <blockquote className="mt-1.5 whitespace-pre-line rounded-lg p-2.5 text-[12px] leading-snug" style={{ background: '#F7F5FB', color: C.ink }}>
                      {l.excerpt}
                    </blockquote>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function CheckCell({ c }: { c?: SourceCheck }) {
  if (!c) return <span style={{ color: '#C9BEB2' }}>—</span>;
  if (!c.url) return <span title={c.note} style={{ color: '#9A5A12' }}>None online</span>;
  if (!c.ok) return <span title={c.note} style={{ color: '#B42318' }}>Couldn’t read</span>;
  return (
    <a href={c.url} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: C.ink }} title={c.note}>
      {c.items} doc{c.items === 1 ? '' : 's'}
      {c.newest && <span style={{ color: C.subtle }}> · newest {fmt(c.newest)}</span>}
    </a>
  );
}

export function WatchCoverage({
  state,
  counties,
  campaignId,
}: {
  state: WatchState | null;
  counties: (MapCounty & { agendaNote?: string })[];
  campaignId: string;
}) {
  const checks = state?.checks ?? [];
  const core = counties.filter((c) => c.tier !== 'nearby');
  const nearby = counties.filter((c) => c.tier === 'nearby');
  const leads = state?.leads ?? [];
  const statewide = checks.filter((c) => !c.county);
  const count = (county: string, src: Lead['source']) => leads.filter((l) => l.county === county && l.source === src).length;

  return (
    <div className="p-5" style={CARD}>
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-[12.5px]" style={{ color: C.muted }}>
          What each source holds for each county, so it’s clear where the watch can see and where it can’t.
          {state && <> Last checked {fmt(state.updatedAt)}.</>}
        </p>
        <CheckNow campaignId={campaignId} className="ml-auto text-right" />
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[620px] border-collapse text-[12.5px]">
          <thead>
            <tr style={{ color: C.subtle }} className="text-left text-[11px] uppercase tracking-wide">
              <th className="pb-2 pr-3 font-semibold">County</th>
              <th className="pb-2 pr-3 font-semibold">Grid queue</th>
              <th className="pb-2 pr-3 font-semibold">DEQ permits</th>
              <th className="pb-2 pr-3 font-semibold">Town Hall</th>
              <th className="pb-2 font-semibold">Meeting agendas</th>
            </tr>
          </thead>
          <tbody>
            {[...core, ...nearby].map((c, idx) => {
              const agendaChecks = checks.filter((k) => k.source === 'agenda' && k.county === c.name);
              const header =
                idx === core.length && nearby.length ? (
                  <tr key={`h-${c.name}`}>
                    <td colSpan={5} className="pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wide" style={{ color: C.subtle }}>
                      Nearby, not yet confirmed: grid queue and state filings only
                    </td>
                  </tr>
                ) : null;
              return [
                header,
                <tr key={c.name} style={{ borderTop: `1px solid ${C.rule}` }} className="align-top">
                  <td className="py-2 pr-3 font-semibold" style={{ color: C.plum }}>{c.label}</td>
                  <td className="py-2 pr-3" style={{ color: C.ink }}>{count(c.name, 'pjm')} project{count(c.name, 'pjm') === 1 ? '' : 's'}</td>
                  <td className="py-2 pr-3" style={{ color: C.ink }}>{count(c.name, 'deq')} project{count(c.name, 'deq') === 1 ? '' : 's'}</td>
                  <td className="py-2 pr-3" style={{ color: C.ink }}>{count(c.name, 'townhall')} live notice{count(c.name, 'townhall') === 1 ? '' : 's'}</td>
                  <td className="py-2">
                    {agendaChecks.length === 0 ? (
                      <CheckCell />
                    ) : (
                      <div className="space-y-0.5">
                        {agendaChecks.map((k) => (
                          <div key={k.key}>
                            {k.url && <span style={{ color: C.subtle }}>{k.label}: </span>}
                            <CheckCell c={k} />
                          </div>
                        ))}
                        {count(c.name, 'agenda') > 0 && (
                          <div className="text-[11.5px]" style={{ color: '#B5179E' }}>{count(c.name, 'agenda')} mention energy projects</div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>,
              ];
            })}
          </tbody>
        </table>
      </div>

      {statewide.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {statewide.map((k) => (
            <a
              key={k.key}
              href={k.url}
              target="_blank"
              rel="noopener noreferrer"
              title={k.note}
              className="rounded-full px-2.5 py-1 text-[11.5px]"
              style={{ background: k.ok ? '#EAF3EC' : '#FbeceA', color: k.ok ? '#2F6B3E' : '#8A2B22' }}
            >
              {k.ok ? '✓' : '✕'} {k.label}
              {k.note ? ` · ${k.note}` : ''}
            </a>
          ))}
        </div>
      )}
      <p className="mt-3 text-[11.5px] leading-snug" style={{ color: C.subtle }}>
        Not watched automatically: newspaper legal notices. Public Notice Virginia’s terms don’t allow automated collection, so a
        person still needs to check it (search “solar” and filter by county).
      </p>
    </div>
  );
}
