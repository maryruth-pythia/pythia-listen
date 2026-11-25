import { inflateRawSync } from 'node:zlib';

// State and county sites sit behind firewalls that turn away requests that don't look like a
// browser (a 403 on Vercel even though the same page opens fine in Chrome). These are public
// pages with no terms against reading them, so we ask the way a browser does.
const BROWSER_HEADERS: Record<string, string> = {
  'user-agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,application/pdf,*/*;q=0.8',
  'accept-language': 'en-US,en;q=0.9',
};

async function once(url: string, init: RequestInit, ms: number): Promise<Response> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(url, {
      ...init,
      signal: ctl.signal,
      redirect: 'follow',
      headers: { ...BROWSER_HEADERS, ...((init.headers as Record<string, string>) ?? {}) },
      cache: 'no-store',
    });
  } finally {
    clearTimeout(t);
  }
}

/** Fetch with a timeout and one retry for blocks, rate limits, server errors and dropped connections. */
export async function fetchWithTimeout(url: string, init: RequestInit = {}, ms = 25000): Promise<Response> {
  try {
    const r = await once(url, init, ms);
    if (r.ok || ![403, 429, 500, 502, 503, 504].includes(r.status)) return r;
  } catch {
    /* fall through to the retry */
  }
  await new Promise((res) => setTimeout(res, 1500));
  return once(url, init, ms);
}

export async function fetchText(url: string, init: RequestInit = {}, ms?: number): Promise<string> {
  const r = await fetchWithTimeout(url, init, ms);
  if (!r.ok) throw new Error(`${r.status} from ${new URL(url).host}`);
  return r.text();
}

export async function fetchBuffer(url: string, ms?: number): Promise<Buffer> {
  const r = await fetchWithTimeout(url, {}, ms);
  if (!r.ok) throw new Error(`${r.status} from ${new URL(url).host}`);
  return Buffer.from(await r.arrayBuffer());
}

export function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

export function stripTags(s: string): string {
  return decodeEntities(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

/** First <tag>…</tag> text inside an XML fragment. */
export function xmlTag(block: string, tag: string): string {
  const m = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return m ? decodeEntities(m[1]).trim() : '';
}

/** Excel serial day (1900 system) -> ISO date (YYYY-MM-DD). */
export function excelDate(v: string | undefined): string | undefined {
  const n = Number(v);
  if (!v || !Number.isFinite(n) || n < 20000 || n > 80000) return undefined;
  const ms = Math.round((n - 25569) * 86400 * 1000);
  return new Date(ms).toISOString().slice(0, 10);
}

/** "4/27/2026" or any Date-parsable string -> ISO date, else undefined. */
export function isoDate(v: string | undefined): string | undefined {
  if (!v) return undefined;
  const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
}

/** Minimal ZIP reader (central directory) -> file name -> bytes. Enough for .xlsx. */
export function unzip(buf: Buffer): Map<string, Buffer> {
  const out = new Map<string, Buffer>();
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 66000); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('not a zip file');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  for (let k = 0; k < count; k++) {
    const method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const nl = buf.readUInt16LE(p + 28);
    const el = buf.readUInt16LE(p + 30);
    const cl = buf.readUInt16LE(p + 32);
    const lho = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nl).toString('utf8');
    const lnl = buf.readUInt16LE(lho + 26);
    const lel = buf.readUInt16LE(lho + 28);
    const start = lho + 30 + lnl + lel;
    const data = buf.subarray(start, start + csize);
    out.set(name, method === 0 ? Buffer.from(data) : inflateRawSync(data));
    p += 46 + nl + el + cl;
  }
  return out;
}

function colIndex(ref: string): number {
  const letters = ref.replace(/\d+/g, '');
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

/** First worksheet of an .xlsx as rows of cell strings (shared strings resolved). */
export function readXlsx(buf: Buffer): string[][] {
  const files = unzip(buf);
  const ssXml = files.get('xl/sharedStrings.xml')?.toString('utf8') ?? '';
  const strings = [...ssXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
    decodeEntities([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join(''))
  );
  const sheet = files.get('xl/worksheets/sheet1.xml')?.toString('utf8') ?? '';
  const rows: string[][] = [];
  for (const rm of sheet.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const row: string[] = [];
    for (const cm of rm[1].matchAll(/<c ([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cm[1];
      const ref = attrs.match(/r="([A-Z]+\d+)"/)?.[1];
      if (!ref) continue;
      const type = attrs.match(/t="(\w+)"/)?.[1];
      const inner = cm[2] ?? '';
      let val = inner.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? '';
      if (type === 's') val = strings[Number(val)] ?? '';
      else if (type === 'inlineStr') val = decodeEntities(inner.match(/<t[^>]*>([\s\S]*?)<\/t>/)?.[1] ?? '');
      row[colIndex(ref)] = decodeEntities(val).trim();
    }
    rows.push(Array.from(row, (v) => v ?? ''));
  }
  return rows;
}

/**
 * Text layer of a PDF (pdf-parse v2). Empty string when the PDF has no text layer (a scan).
 * Throws when the reader itself fails, so callers can retry instead of treating it as read.
 */
export async function pdfText(buf: Buffer): Promise<string> {
  {
    // Cast: an old @types/pdf-parse (v1 API) shadows v2's own types; the runtime is v2.
    const { PDFParse } = (await import('pdf-parse')) as unknown as {
      PDFParse: new (o: { data: Uint8Array }) => { getText(): Promise<{ text?: string }>; destroy(): Promise<void> };
    };
    const parser = new PDFParse({ data: new Uint8Array(buf) });
    try {
      const res = await parser.getText();
      return res.text ?? '';
    } finally {
      await parser.destroy().catch(() => undefined);
    }
  }
}

/** Words that mean an energy project is being discussed. */
export const ENERGY_RE =
  /\b(solar|photovoltaic|PV (?:facility|project|array)|battery (?:energy )?storage|energy storage|BESS|wind (?:farm|turbine|energy|project)|siting agreement|utility[- ]scale|renewable energy (?:facility|project))\b/gi;

/** Up to `max` short passages around energy words, merged where they overlap. */
export function excerpts(text: string, max = 3, radius = 180): string[] {
  // pdf-parse adds "-- 3 of 12 --" page markers; drop them.
  const t = text.replace(/--\s*\d+ of \d+\s*--/g, ' ').replace(/\s+/g, ' ');
  const spans: Array<[number, number]> = [];
  for (const m of t.matchAll(ENERGY_RE)) {
    const s = Math.max(0, (m.index ?? 0) - radius);
    const e = Math.min(t.length, (m.index ?? 0) + m[0].length + radius);
    const last = spans[spans.length - 1];
    if (last && s <= last[1]) last[1] = e;
    else spans.push([s, e]);
    if (spans.length > max) break;
  }
  return spans.slice(0, max).map(([s, e]) => `${s > 0 ? '…' : ''}${t.slice(s, e).trim()}${e < t.length ? '…' : ''}`);
}
