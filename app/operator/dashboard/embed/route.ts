import { DASHBOARD_HTML_B64 } from '../_dashboard-html';
import { listSignals, listSessions, listIngestionRuns } from '@/lib/db';
import { buildPythiaSignals } from '@/lib/ingest/pythia';
import { FRASIER_CAMPAIGN_ID, FRASIER_CONTEXT } from '@/lib/ingest/seed-frasier';
import type { Signal, SignalStance } from '@/lib/types';

// This route lives under /operator, so the password gate in middleware.ts
// protects it (a static file in /public would not be gated — the matcher
// excludes any path containing a dot).
//
// The dashboard HTML itself is a self-contained static prototype. Rather than
// rebuild it, we INJECT a live panel at the top of the body, populated from
// real database data: the ingested civic-record signals (Frasier pilot) and
// the computed direct/Pythia-listening signals (from real conversations).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Project whose real conversations feed the direct/Pythia bucket.
const PYTHIA_PROJECT_ID = 'honua-solar-storage-demo';

const STANCE_COLOR: Record<SignalStance, string> = {
  opposition: '#B23A2E',
  concern: '#C77D2A',
  mixed: '#7A6E88',
  support: '#4F8A5C',
  neutral: '#6B7280',
};
const STANCE_LABEL: Record<SignalStance, string> = {
  opposition: 'Opposition',
  concern: 'Concern',
  mixed: 'Mixed',
  support: 'Support',
  neutral: 'Procedural',
};

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function stanceCounts(signals: Signal[]) {
  const c: Record<SignalStance, number> = {
    opposition: 0,
    concern: 0,
    mixed: 0,
    support: 0,
    neutral: 0,
  };
  for (const s of signals) c[s.stance]++;
  return c;
}

function chips(signals: Signal[]): string {
  const c = stanceCounts(signals);
  return (Object.keys(c) as SignalStance[])
    .filter((k) => c[k] > 0)
    .map(
      (k) =>
        `<span style="display:inline-block;margin:2px 4px 2px 0;padding:2px 8px;border-radius:10px;font-size:11px;background:${STANCE_COLOR[k]}1A;color:${STANCE_COLOR[k]};font-weight:600">${c[k]} ${STANCE_LABEL[k]}</span>`
    )
    .join('');
}

function topItems(signals: Signal[], n: number): string {
  const sorted = [...signals].sort(
    (a, b) => (b.salience ?? 0) - (a.salience ?? 0)
  );
  return sorted
    .slice(0, n)
    .map((s) => {
      const url = s.citations[0]?.url;
      const link = url
        ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer" style="color:#6A0FC2;text-decoration:underline">source</a>`
        : '';
      return `<li style="margin-bottom:6px;font-size:12px;line-height:1.4">
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${STANCE_COLOR[s.stance]};margin-right:6px"></span>
        <strong style="color:#2A2A2A">${esc(s.title)}</strong> ${link}
      </li>`;
    })
    .join('');
}

function buildLivePanel(
  civic: Signal[],
  pythia: Signal[],
  scoredConvos: number,
  lastSync?: string
): string {
  const civicBlock = civic.length
    ? `<div style="margin-top:6px">${chips(civic)}</div>
       <ul style="list-style:none;padding:0;margin:8px 0 0">${topItems(civic, 3)}</ul>`
    : `<p style="font-size:12px;color:#777;margin:6px 0 0">No civic signals yet — open the Civic record tab and click “Refresh now”.</p>`;

  const pythiaBlock = pythia.length
    ? `<div style="margin-top:6px">${chips(pythia)}</div>
       <ul style="list-style:none;padding:0;margin:8px 0 0">${topItems(pythia, 3)}</ul>`
    : `<p style="font-size:12px;color:#777;margin:6px 0 0">No scored conversations yet.</p>`;

  return `
<div id="pythia-live-panel" style="max-width:1100px;margin:16px auto 0;padding:14px 18px;border:1px solid #E4D9F0;border-radius:14px;background:linear-gradient(180deg,#FbF7F2,#FFFFFF);font-family:Inter,system-ui,sans-serif;box-shadow:0 1px 3px rgba(0,0,0,.04)">
  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
    <span style="width:8px;height:8px;border-radius:50%;background:#4F8A5C;box-shadow:0 0 0 3px #4F8A5C22"></span>
    <span style="font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6A0FC2">Live data · from your database</span>
    ${lastSync ? `<span style="font-size:11px;color:#888">civic last synced ${esc(lastSync)}</span>` : ''}
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:10px">
    <div>
      <div style="font-size:13px;font-weight:700;color:#EC2BFC">Civic record — ${esc(FRASIER_CONTEXT.projectName)}</div>
      <div style="font-size:11px;color:#888">${civic.length} cited signal${civic.length !== 1 ? 's' : ''} · ${esc(FRASIER_CONTEXT.jurisdiction)}</div>
      ${civicBlock}
    </div>
    <div>
      <div style="font-size:13px;font-weight:700;color:#6A0FC2">Direct listening — Pythia conversations</div>
      <div style="font-size:11px;color:#888">${pythia.length} self-signification signal${pythia.length !== 1 ? 's' : ''} · ${scoredConvos} scored conversation${scoredConvos !== 1 ? 's' : ''}</div>
      ${pythiaBlock}
    </div>
  </div>
  <div style="font-size:10px;color:#AAA;margin-top:10px">Everything above is read live from real records — civic signals link to their public sources; direct-listening signals aggregate participants' own self-scores (no individual responses shown).</div>
</div>`;
}

export async function GET() {
  const html = Buffer.from(DASHBOARD_HTML_B64, 'base64').toString('utf8');

  let panel = '';
  let liveJson = '{}';
  try {
    const [civic, pythia, sessions, runs] = await Promise.all([
      listSignals(FRASIER_CAMPAIGN_ID, 'civic'),
      buildPythiaSignals(PYTHIA_PROJECT_ID),
      listSessions(PYTHIA_PROJECT_ID),
      listIngestionRuns(FRASIER_CAMPAIGN_ID),
    ]);
    const scored = sessions.filter(
      (s) => s.signifierResponses && s.signifierResponses.length > 0
    ).length;
    const lastSync = runs[0]
      ? fmtDate(runs[0].finishedAt ?? runs[0].startedAt)
      : undefined;
    panel = buildLivePanel(civic, pythia, scored, lastSync);
    liveJson = JSON.stringify({
      civic,
      pythia,
      scoredConversations: scored,
      lastSync,
    });
  } catch {
    // If the DB is unavailable, serve the static dashboard unchanged.
    panel = '';
  }

  const liveScript = `<script>window.__PYTHIA_LIVE__=${liveJson};</script>`;

  let out = html;
  if (panel) {
    if (/<body[^>]*>/i.test(out)) {
      out = out.replace(/<body[^>]*>/i, (m) => `${m}\n${panel}`);
    } else {
      out = panel + out;
    }
  }
  out = /<\/body>/i.test(out)
    ? out.replace(/<\/body>/i, `${liveScript}\n</body>`)
    : out + liveScript;

  return new Response(out, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}
