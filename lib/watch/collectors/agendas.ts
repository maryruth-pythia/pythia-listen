/**
 * County and town meeting agendas. Virginia public bodies must post meeting notice at least
 * three working days ahead, on their website if they have one (Va. Code § 2.2-3707), so an
 * agenda is often the first local sign of a project: a siting agreement, a conditional-use
 * permit, a rezoning. We read each new agenda PDF once and keep the ones that mention energy
 * projects. Many small localities post nothing online; the coverage panel says so.
 */
import type { AgendaSource, WatchConfig, WatchCounty } from '../config';
import type { Lead, SourceCheck } from '../types';
import { ENERGY_RE, excerpts, fetchBuffer, fetchText, isoDate, pdfText, stripTags } from '../util';

interface Doc {
  url: string;
  title: string;
  date?: string;
}

const MAX_PDF_BYTES = 25 * 1024 * 1024;

async function civicplusDocs(src: Extract<AgendaSource, { kind: 'civicplus' }>): Promise<Doc[]> {
  const rss = await fetchText(`${src.base}/RSSFeed.aspx?ModID=65&CID=All-0`);
  const docs: Doc[] = [];
  for (const m of rss.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const it = m[1];
    const title = stripTags(it.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '');
    let link = stripTags(it.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? '');
    const date = isoDate(stripTags(it.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? ''));
    if (!link) continue;
    // RSS links point at a "previous versions" page; the PDF is linked from there.
    if (!/ViewFile/i.test(link)) {
      try {
        const page = await fetchText(link, {}, 15000);
        const f = page.match(/href="([^"]*\/AgendaCenter\/ViewFile\/(?:Agenda|Minutes)\/[^"]+)"/i);
        if (!f) continue;
        link = new URL(f[1].replace(/&amp;/g, '&'), src.base).toString();
      } catch {
        continue;
      }
    }
    docs.push({ url: link, title, date });
  }
  return docs;
}

async function pagePdfDocs(src: Extract<AgendaSource, { kind: 'page-pdfs' }>): Promise<Doc[]> {
  const html = await fetchText(src.url);
  const seen = new Set<string>();
  const docs: Doc[] = [];
  for (const m of html.matchAll(/<a[^>]+href="([^"]+\.pdf)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const url = new URL(m[1].replace(/&amp;/g, '&'), src.url).toString();
    if (seen.has(url)) continue;
    seen.add(url);
    const text = stripTags(m[2]).replace(/[()]/g, '').trim();
    const file = decodeURIComponent(url.split('/').pop() ?? '');
    if (!/agenda|packet|minutes/i.test(`${text} ${file}`)) continue;
    const ym = url.match(/\/uploads\/(\d{4})\/(\d{2})\//);
    docs.push({ url, title: `${src.label}: ${text || 'document'} (${file})`, date: ym ? `${ym[1]}-${ym[2]}-01` : undefined });
  }
  return docs.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
}

export interface AgendaResult {
  leads: Omit<Lead, 'firstSeen' | 'lastSeen'>[];
  checks: Omit<SourceCheck, 'checkedAt'>[];
  scannedNow: string[];
}

/**
 * Read up to `budget` agenda PDFs not already in `scanned` (newest first, spread across
 * sources), and report every source's state for the coverage panel.
 */
export async function collectAgendas(cfg: WatchConfig, scanned: Record<string, string>, budget = 10): Promise<AgendaResult> {
  const leads: AgendaResult['leads'] = [];
  const checks: AgendaResult['checks'] = [];
  const scannedNow: string[] = [];
  const queue: Array<{ county: WatchCounty; src: AgendaSource; doc: Doc }> = [];

  await Promise.all(
    cfg.counties.flatMap((county) =>
      county.agendas.map(async (src) => {
        const key = `agenda:${county.name}:${src.kind === 'civicplus' ? src.base : src.url}`;
        const url = src.kind === 'civicplus' ? `${src.base}/AgendaCenter` : src.url;
        try {
          const docs = src.kind === 'civicplus' ? await civicplusDocs(src) : await pagePdfDocs(src);
          const fresh = docs.filter((d) => !scanned[d.url]).slice(0, 6);
          fresh.forEach((doc) => queue.push({ county, src, doc }));
          checks.push({
            key,
            source: 'agenda',
            label: src.label,
            county: county.name,
            ok: true,
            items: docs.length,
            newest: docs.map((d) => d.date).filter(Boolean).sort().pop(),
            url,
          });
        } catch (e) {
          checks.push({ key, source: 'agenda', label: src.label, county: county.name, ok: false, items: 0, url, note: e instanceof Error ? e.message : String(e) });
        }
      })
    )
  );

  // Round-robin by source so one busy county can't use the whole budget.
  const bySource = new Map<string, typeof queue>();
  for (const q of queue) {
    const k = `${q.county.name}:${q.src.label}`;
    bySource.set(k, [...(bySource.get(k) ?? []), q]);
  }
  const picked: typeof queue = [];
  while (picked.length < budget && [...bySource.values()].some((l) => l.length)) {
    for (const l of bySource.values()) {
      const next = l.shift();
      if (next && picked.length < budget) picked.push(next);
    }
  }

  // Per source: documents read this run, ones with no text layer (scans), ones that failed.
  const stats = new Map<string, { read: number; scans: number; failed: number; error?: string }>();
  const stat = (k: string) => {
    if (!stats.has(k)) stats.set(k, { read: 0, scans: 0, failed: 0 });
    return stats.get(k)!;
  };
  const keyOf = (countyName: string, src: AgendaSource) => `agenda:${countyName}:${src.kind === 'civicplus' ? src.base : src.url}`;

  await Promise.all(
    picked.map(async ({ county, src, doc }) => {
      const st = stat(keyOf(county.name, src));
      try {
        const buf = await fetchBuffer(doc.url, 30000);
        if (buf.length > MAX_PDF_BYTES) {
          scannedNow.push(doc.url); // too big to read; don't retry every night
          st.failed++;
          st.error = 'a document was over 25 MB';
          return;
        }
        const text = await pdfText(buf);
        scannedNow.push(doc.url);
        st.read++;
        if (!text.trim()) {
          st.scans++; // scanned image with no text layer: nothing we can search
          return;
        }
        const terms = new Map<string, number>();
        for (const m of text.matchAll(ENERGY_RE)) {
          const k = m[0].toLowerCase();
          terms.set(k, (terms.get(k) ?? 0) + 1);
        }
        if (!terms.size) return;
        const list = [...terms.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} (${n})`);
        leads.push({
          id: `agenda:${doc.url}`,
          source: 'agenda',
          stage: 'local',
          county: county.name,
          title: `${county.label}: ${doc.title || 'meeting document'}`,
          detail: `Energy terms in this ${/minutes/i.test(`${doc.title} ${doc.url}`) ? 'set of minutes' : 'agenda'}: ${list.join(', ')}. Source: ${src.label}.`,
          date: doc.date,
          url: doc.url,
          excerpt: excerpts(text).join('\n\n'),
        });
      } catch (e) {
        // Not marked as read, so the next run tries it again.
        st.failed++;
        st.error = e instanceof Error ? e.message.slice(0, 120) : String(e);
      }
    })
  );

  // Fold the reading results into each source's coverage note.
  for (const c of checks) {
    const st = stats.get(c.key);
    if (!st) continue;
    const parts = [
      st.read ? `read ${st.read} new document${st.read === 1 ? '' : 's'}` : '',
      st.scans ? `${st.scans} scanned with no searchable text` : '',
      st.failed ? `${st.failed} couldn’t be read${st.error ? ` (${st.error})` : ''}` : '',
    ].filter(Boolean);
    if (parts.length) c.note = parts.join('; ');
    if (st.failed && !st.read) c.ok = false;
  }

  // Counties with no online agendas still get a row, so the gap is visible.
  for (const c of cfg.counties.filter((c) => !c.agendas.length)) {
    checks.push({ key: `agenda:${c.name}:none`, source: 'agenda', label: 'Meeting agendas', county: c.name, ok: false, items: 0, note: c.agendaNote });
  }
  return { leads, checks, scannedNow };
}
