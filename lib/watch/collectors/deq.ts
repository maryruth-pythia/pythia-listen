/**
 * Virginia DEQ small renewable energy permit by rule (projects up to 150 MW). The applicant
 * files a notice of intent "as early in the project development process as practicable",
 * then an application; DEQ then authorizes. DEQ publishes a status spreadsheet of every PBR
 * project with county, MW and the date of each step.
 * Page: https://www.deq.virginia.gov/news-info/shortcuts/permits/renewable-energy/renewable-energy-project-status
 */
import type { WatchConfig } from '../config';
import { matchCounty } from '../config';
import type { Lead, LeadStage, SourceCheck } from '../types';
import { excelDate, fetchBuffer, fetchText, readXlsx } from '../util';

/**
 * Fallback: DEQ's own GIS layer "Renewable Energy Permits (Daily)", on a separate server
 * (gisdata.deq.virginia.gov) that www.deq.virginia.gov's firewall doesn't sit in front of.
 * Same permit numbers and statuses as the spreadsheet, fewer dates (no NOI/application dates).
 */
const GIS_LAYER = 'https://gisdata.deq.virginia.gov/arcgis/rest/services/public/EDMA/MapServer/98';

async function collectDeqGis(cfg: WatchConfig): Promise<Omit<Lead, 'firstSeen' | 'lastSeen'>[]> {
  const q = new URLSearchParams({
    where: '1=1',
    outFields: 'PERM_NUM,PERM_NAME,PERM_MW,PERM_TOTAL_ACRES,PTC_DESCRIPTION,CLAS_DESCRIPTION,PERMIT_STATUS,COUNTY,INSERTED_DATE',
    returnGeometry: 'false',
    resultRecordCount: '2000',
    f: 'json',
  });
  const j = JSON.parse(await fetchText(`${GIS_LAYER}/query?${q}`, {}, 30000)) as {
    error?: { message?: string };
    features?: { attributes: Record<string, string | number | null> }[];
  };
  if (j.error) throw new Error(`GIS layer: ${j.error.message ?? 'error'}`);
  const leads: Omit<Lead, 'firstSeen' | 'lastSeen'>[] = [];
  for (const f of j.features ?? []) {
    const a = f.attributes;
    const county = matchCounty(cfg, String(a.COUNTY ?? ''));
    const name = String(a.PERM_NAME ?? '').trim();
    if (!county || !name) continue;
    const status = String(a.CLAS_DESCRIPTION ?? '').trim(); // "NOI - Active" / "Permit - Active", as in the spreadsheet
    const detailStatus = String(a.PERMIT_STATUS ?? '').trim(); // e.g. "Solar Permit - Active Producing"
    if (/withdrawn/i.test(`${status} ${detailStatus}`)) continue;
    const producing = /active producing/i.test(detailStatus);
    const mw = Number(a.PERM_MW) || undefined;
    const acres = Number(a.PERM_TOTAL_ACRES) || undefined;
    const tech = String(a.PTC_DESCRIPTION ?? '').trim() || undefined;
    const added = typeof a.INSERTED_DATE === 'number' ? new Date(a.INSERTED_DATE).toISOString().slice(0, 10) : undefined;
    leads.push({
      id: `deq:${a.PERM_NUM || name}`,
      source: 'deq',
      stage: producing ? 'built' : /permit/i.test(status) ? 'permitted' : 'state',
      county,
      title: name,
      detail: `${tech ?? 'Renewable'} project${mw ? `, ${mw} MW` : ''}${acres ? ` on about ${acres} acres` : ''}. DEQ status: ${detailStatus || status || 'unknown'}${added ? `; on DEQ's permit map since ${added}` : ''}.`,
      tech,
      mw,
      status: status || undefined,
      date: added,
      url: DEQ_PAGE,
    });
  }
  return leads;
}

export const DEQ_PAGE =
  'https://www.deq.virginia.gov/news-info/shortcuts/permits/renewable-energy/renewable-energy-project-status';
const FALLBACK_XLSX = 'https://www.deq.virginia.gov/home/showpublisheddocument/5591';

function stageOf(status: string, row: Record<string, string>): LeadStage {
  if (row['Commercial Operation Commenced'] || row['Construction Commenced']) return 'built';
  if (/permit/i.test(status)) return 'permitted';
  return 'state';
}

export async function collectDeq(cfg: WatchConfig): Promise<{ leads: Omit<Lead, 'firstSeen' | 'lastSeen'>[]; check: Omit<SourceCheck, 'checkedAt'> }> {
  const base = { key: 'deq', source: 'deq' as const, label: 'DEQ renewable energy permits (status spreadsheet)', url: DEQ_PAGE };
  try {
    // The spreadsheet link carries a version number that changes with each update.
    let xlsxUrl = FALLBACK_XLSX;
    try {
      const page = await fetchText(DEQ_PAGE);
      const m = page.match(/href="([^"]*showpublisheddocument\/5591[^"]*)"/i);
      if (m) xlsxUrl = new URL(m[1].replace(/&amp;/g, '&'), DEQ_PAGE).toString();
    } catch {
      /* use the unversioned link */
    }
    const rows = readXlsx(await fetchBuffer(xlsxUrl, 30000));
    const hi = rows.findIndex((r) => r.includes('Permit Name') && r.includes('County'));
    if (hi < 0) throw new Error('spreadsheet layout changed (no "Permit Name"/"County" header)');
    const header = rows[hi];
    const leads: Omit<Lead, 'firstSeen' | 'lastSeen'>[] = [];
    for (const r of rows.slice(hi + 1)) {
      const row: Record<string, string> = {};
      header.forEach((h, i) => (row[h] = r[i] ?? ''));
      const county = matchCounty(cfg, row['County']);
      if (!county || !row['Permit Name']) continue;
      const status = row['Project Status'];
      if (/withdrawn/i.test(status)) continue;
      const mw = Number(row['Megawatts']) || undefined;
      const noi = excelDate(row['NOI Received']);
      const app = excelDate(row['Application Received']);
      const meeting = excelDate(row['Public Meeting Date']);
      const auth = excelDate(row['PBR Authorization Letter']);
      const steps = [
        noi && `notice of intent received ${noi}`,
        app && `application received ${app}`,
        meeting && `public meeting ${meeting}`,
        auth && `authorized ${auth}`,
        excelDate(row['Construction Commenced']) && `construction started ${excelDate(row['Construction Commenced'])}`,
        excelDate(row['Commercial Operation Commenced']) && `operating since ${excelDate(row['Commercial Operation Commenced'])}`,
      ].filter(Boolean);
      const acres = Number(row['Total Acres']) || undefined;
      leads.push({
        id: `deq:${row['Permit Number'] || row['Permit Name']}`,
        source: 'deq',
        stage: stageOf(status, row),
        county,
        title: row['Permit Name'],
        detail: `${row['Permit Type'] || 'Renewable'} project${mw ? `, ${mw} MW` : ''}${acres ? ` on about ${acres} acres` : ''}. DEQ status: ${status || 'unknown'}${steps.length ? `; ${steps.join('; ')}` : ''}.`,
        tech: row['Permit Type'] || undefined,
        mw,
        status: status || undefined,
        date: app || noi || auth,
        url: DEQ_PAGE,
      });
    }
    return { leads, check: { ...base, ok: true, items: leads.length, url: DEQ_PAGE } };
  } catch (e) {
    const why = e instanceof Error ? e.message : String(e);
    // The spreadsheet's server blocks some cloud hosts (403 on Vercel). Read DEQ's GIS layer instead.
    try {
      const leads = await collectDeqGis(cfg);
      return {
        leads,
        check: { ...base, label: 'DEQ renewable energy permits (DEQ permit map)', ok: true, items: leads.length, url: DEQ_PAGE, note: `spreadsheet blocked (${why}); read DEQ's daily permit map instead` },
      };
    } catch (e2) {
      return { leads: [], check: { ...base, ok: false, items: 0, note: `${why}; permit map also failed: ${e2 instanceof Error ? e2.message : String(e2)}` } };
    }
  }
}
