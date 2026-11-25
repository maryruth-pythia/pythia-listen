/**
 * DEQ notices of intent for renewable energy projects are posted for 30 days on Virginia
 * Regulatory Town Hall's General Notices page (and in the Virginia Register). This catches
 * them while they're live, in case DEQ's spreadsheet lags.
 */
import type { WatchConfig } from '../config';
import { matchCounty } from '../config';
import type { Lead, SourceCheck } from '../types';
import { fetchText, isoDate, stripTags } from '../util';

const TOWNHALL = 'https://townhall.virginia.gov/L/GeneralNotice.cfm?boardid=53';
const ENERGY = /(solar|renewable energy|photovoltaic|energy storage|battery|wind energy|permit by rule)/i;

export async function collectTownhall(cfg: WatchConfig): Promise<{ leads: Omit<Lead, 'firstSeen' | 'lastSeen'>[]; check: Omit<SourceCheck, 'checkedAt'> }> {
  const base = { key: 'townhall', source: 'townhall' as const, label: 'Town Hall notices (DEQ)', url: TOWNHALL };
  try {
    const html = await fetchText(TOWNHALL);
    const leads: Omit<Lead, 'firstSeen' | 'lastSeen'>[] = [];
    let energy = 0;
    for (const tr of html.matchAll(/<tr[\s\S]*?<\/tr>/gi)) {
      const row = tr[0];
      const a = row.match(/href="([^"]*ViewNotice\.cfm\?gnid=(\d+)[^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
      if (!a) continue;
      const title = stripTags(a[3]);
      if (!ENERGY.test(title)) continue;
      energy++;
      const text = stripTags(row);
      const url = new URL(a[1].replace(/&amp;/g, '&'), TOWNHALL).toString();
      const findCounty = (t: string) =>
        cfg.counties.map((c) => c.name).find((n) => new RegExp(`\\b${n}\\s+(County|City)\\b|\\bCity of ${n}\\b`, 'i').test(t)) ?? null;
      let county = findCounty(text);
      // Notice titles often name only the company; the county is in the notice body.
      if (!county) county = findCounty(await fetchText(url).then(stripTags).catch(() => ''));
      const name = county ? matchCounty(cfg, county) : null;
      if (!name) continue;
      const added = text.match(/(\d{1,2}\/\d{1,2}\/\d{4})/)?.[1];
      leads.push({
        id: `townhall:${a[2]}`,
        source: 'townhall',
        stage: 'state',
        county: name,
        title,
        detail: `DEQ public notice posted on Virginia Regulatory Town Hall${added ? ` on ${isoDate(added)}` : ''}.`,
        date: isoDate(added),
        url,
      });
    }
    return {
      leads,
      check: { ...base, ok: true, items: leads.length, note: `${energy} energy-related DEQ notice${energy === 1 ? '' : 's'} live statewide` },
    };
  } catch (e) {
    return { leads: [], check: { ...base, ok: false, items: 0, note: e instanceof Error ? e.message : String(e) } };
  }
}
