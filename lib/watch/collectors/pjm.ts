/**
 * PJM interconnection queue: projects that have asked to connect to the grid. Usually the
 * earliest public sign of a utility-scale project, often years before construction.
 *
 * Source: the "Full Export → XML" on PJM's Cycle Service Request Status page
 * (https://www.pjm.com/planning/m/cycle-service-request-status). It covers Transition
 * Cycles 1–2 and Cycle 1 onward (the older serial queue file stopped updating in 2023).
 */
import type { WatchConfig } from '../config';
import { matchCounty } from '../config';
import type { Lead, SourceCheck } from '../types';
import { fetchText, isoDate, xmlTag } from '../util';

export const PJM_PAGE = 'https://www.pjm.com/planning/m/cycle-service-request-status';
const PJM_XML = 'https://www.pjm.com/m/ProjectTransition/GenerateXMLTransitionProjectsAll';

export async function collectPjm(cfg: WatchConfig): Promise<{ leads: Omit<Lead, 'firstSeen' | 'lastSeen'>[]; check: Omit<SourceCheck, 'checkedAt'> }> {
  const base = { key: 'pjm', source: 'pjm' as const, label: 'PJM interconnection queue', url: PJM_PAGE };
  try {
    const xml = await fetchText(PJM_XML, { method: 'POST' }, 45000);
    const leads: Omit<Lead, 'firstSeen' | 'lastSeen'>[] = [];
    for (const m of xml.matchAll(/<Project>([\s\S]*?)<\/Project>/g)) {
      const p = m[1];
      if (xmlTag(p, 'State').toUpperCase() !== cfg.state) continue;
      const county = matchCounty(cfg, xmlTag(p, 'County'));
      if (!county) continue;
      const fuel = xmlTag(p, 'Fuel');
      if (!cfg.fuels.some((f) => fuel.toLowerCase().includes(f))) continue;
      const status = xmlTag(p, 'Status');
      if (/withdrawn/i.test(status)) continue;
      const num = xmlTag(p, 'ProjectNumber');
      const developer = xmlTag(p, 'Developer') || undefined;
      const mw = Number(xmlTag(p, 'MWO') || xmlTag(p, 'MWEnergy')) || undefined;
      const cycle = xmlTag(p, 'Cycle');
      const stage = xmlTag(p, 'Stage');
      const poi = xmlTag(p, 'Name');
      const report =
        xmlTag(p, 'Phase3SISReport') || xmlTag(p, 'Phase2SISReport') || xmlTag(p, 'Phase1SISReport');
      leads.push({
        id: `pjm:${num}`,
        source: 'pjm',
        stage: /in service/i.test(status) ? 'built' : 'grid',
        county,
        // Without a commercial name, "Name" is only the substation it would connect to.
        title: xmlTag(p, 'CommercialName')
          ? `${xmlTag(p, 'CommercialName')} (${num})`
          : `${mw ? `${mw} MW ` : ''}${(fuel || 'energy').toLowerCase()} project near ${poi || 'an unnamed substation'} (${num})`,
        detail: [
          `${fuel}${mw ? `, ${mw} MW` : ''} request to connect at ${poi || 'an unnamed point'}`,
          developer ? ` by ${developer}` : '',
          `. PJM ${cycle || 'queue'}${stage ? `, ${stage}` : ''}; status ${status || 'unknown'}.`,
          isoDate(xmlTag(p, 'RequestedInServiceDate')) ? ` Wants to be operating by ${isoDate(xmlTag(p, 'RequestedInServiceDate'))}.` : '',
        ].join(''),
        tech: fuel || undefined,
        mw,
        developer,
        status: [status, stage].filter(Boolean).join(' · ') || undefined,
        date: isoDate(xmlTag(p, 'SubmittedDate')),
        url: /^https?:\/\//.test(report) ? report.replace('pjm.com//', 'pjm.com/') : PJM_PAGE,
      });
    }
    return { leads, check: { ...base, ok: true, items: leads.length } };
  } catch (e) {
    return { leads: [], check: { ...base, ok: false, items: 0, note: e instanceof Error ? e.message : String(e) } };
  }
}
