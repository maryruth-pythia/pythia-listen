/**
 * Post-generation redaction — an enforced privacy checkpoint over AI-written
 * output. Names are harvested (high-precision) from citation metadata, then
 * stripped from any text before it renders; emails and phone numbers are
 * stripped generically. This is deliberately conservative (it errs toward
 * missing a name rather than redacting real content like place/org names). The
 * durable fix — a full NER/PII pass at ingestion — is still the roadmap target;
 * this closes the display-time gap in the meantime.
 */
import type { Signal } from './types';

// A person name is 2–3 capitalized words that AREN'T an org/topic term.
const ORG_KW =
  /Internationa|Alliance|Coalition|Cent(er|re)|Group|Board|County|Depart|Company|LLC|Solar|Energy|Renewable|Communit|Council|Institute|Universit|Foundation|Governance|Analyst|Meeting|Notes|Briefer|Brief|Call|Transcript|Draft|Summary|Agenda|Session|Interview|Discovery|Application|Playbook|Spreadsheet|Fellowship/i;

function isPersonName(t: string): boolean {
  return /^[A-Z][a-z]+(?:\s+[A-Z][a-z.'-]+){1,2}$/.test(t.trim()) && !ORG_KW.test(t);
}

/** Harvest likely person names from signal citation titles (transcript conventions). */
export function collectNames(signals: Signal[]): string[] {
  const names = new Set<string>();
  const add = (t?: string) => {
    const v = (t ?? '').trim();
    if (isPersonName(v)) {
      names.add(v);
      names.add(v.split(/\s+/)[0]); // first name alone, for summary mentions
    }
  };
  for (const s of signals) {
    const raw = s.citations?.[0]?.title;
    if (!raw) continue;
    const t = raw.replace(/\.[a-z0-9]+$/i, '');
    if (t.includes('__')) t.split('__').forEach(add);
    for (const p of t.match(/\(([^)]+)\)/g) ?? []) add(p.slice(1, -1));
    const w = t.match(/\bwith\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/i);
    if (w) add(w[1]);
  }
  return [...names].sort((a, b) => b.length - a.length);
}

/** Replace each harvested name with "[name withheld]". */
export function redactWith(names: string[], text: string): string {
  let out = text;
  for (const nm of names) {
    const esc = nm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(`\\b${esc}\\b`, 'g'), '[name withheld]');
  }
  return out;
}

// Unambiguous contact PII — high precision, safe to strip generically.
const EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const PHONE = /(?<!\d)(?:\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}(?!\d)/g;

export function redactPII(text: string): string {
  return text.replace(EMAIL, '[email withheld]').replace(PHONE, '[phone withheld]');
}

/** Full scrub of a single string: harvested names + generic contact PII. */
export function redactText(text: string, names: string[]): string {
  return redactPII(redactWith(names, text));
}

/** Recursively scrub every string field of an object/array; non-strings untouched. */
export function redactDeep<T>(value: T, names: string[]): T {
  if (typeof value === 'string') return redactText(value, names) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => redactDeep(v, names)) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = redactDeep(v, names);
    return out as unknown as T;
  }
  return value;
}
