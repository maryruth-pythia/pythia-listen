/**
 * Multi-format upload parser (dependency-free slice).
 *
 * Turns an uploaded file into one or more extraction items so a real email
 * export or a set of notes ingests cleanly instead of being blindly char-chunked.
 *
 *  - .mbox            -> one item per email message (Subject + plain-text body)
 *  - .eml             -> one item (single message)
 *  - .txt/.md/.csv/.json/.log -> text, split into bounded chunks
 *
 * Binary docs (.pdf/.docx/.xlsx) are handled in a later slice (needs libraries).
 *
 * Privacy: raw From/To/Cc address headers are dropped here (only Subject + body
 * are kept); the downstream extractor scrubs any remaining PII, same as before.
 */

export type ItemKind = 'email' | 'text';

export interface ParsedItem {
  text: string;
  kind: ItemKind;
  /** e.g. the email subject, for labelling/dedupe */
  label?: string;
}

const MAX_MESSAGES = 5000; // per mbox upload; the UI now pre-splits mbox files
                           // client-side, so this is a defensive ceiling only.
const MAX_CHARS_PER_ITEM = 6000;
const MAX_TEXT_CHUNKS = 40;

function decodeBase64(s: string): string {
  try {
    return Buffer.from(s.replace(/\s+/g, ''), 'base64').toString('utf8');
  } catch {
    return s;
  }
}

function decodeQuotedPrintable(s: string): string {
  return s
    .replace(/=\r?\n/g, '')
    .replace(/=([0-9A-Fa-f]{2})/g, (_m, h: string) =>
      String.fromCharCode(parseInt(h, 16))
    );
}

function stripHtml(s: string): string {
  return s
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n');
}

function parseHeaders(raw: string): {
  headers: Record<string, string>;
  bodyStart: number;
} {
  const crlf = raw.indexOf('\r\n\r\n');
  const lf = raw.indexOf('\n\n');
  let sep = -1;
  let sepLen = 0;
  if (crlf >= 0 && (lf < 0 || crlf <= lf)) {
    sep = crlf;
    sepLen = 4;
  } else if (lf >= 0) {
    sep = lf;
    sepLen = 2;
  }
  const headerBlock = sep >= 0 ? raw.slice(0, sep) : raw;
  const bodyStart = sep >= 0 ? sep + sepLen : raw.length;
  const headers: Record<string, string> = {};
  const unfolded = headerBlock.replace(/\r?\n[ \t]+/g, ' ');
  for (const line of unfolded.split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9-]+):\s?(.*)$/);
    if (m) headers[m[1].toLowerCase()] = m[2];
  }
  return { headers, bodyStart };
}

function extractPlainBody(raw: string): { subject: string; body: string } {
  const { headers, bodyStart } = parseHeaders(raw);
  const subject = headers['subject'] ?? '';
  let body = raw.slice(bodyStart);
  const ctype = headers['content-type'] ?? '';
  const cte = (headers['content-transfer-encoding'] ?? '').toLowerCase();

  const boundaryMatch = ctype.match(/boundary="?([^";]+)"?/i);
  if (/multipart\//i.test(ctype) && boundaryMatch) {
    const boundary = boundaryMatch[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = body.split(new RegExp('--' + boundary));
    let plain = '';
    let html = '';
    for (const p of parts) {
      const ph = parseHeaders(p);
      const pct = (ph.headers['content-type'] ?? '').toLowerCase();
      const pcte = (ph.headers['content-transfer-encoding'] ?? '').toLowerCase();
      let pbody = p.slice(ph.bodyStart);
      if (pcte === 'base64') pbody = decodeBase64(pbody);
      else if (pcte === 'quoted-printable') pbody = decodeQuotedPrintable(pbody);
      if (pct.startsWith('text/plain') && !plain) plain = pbody;
      else if (pct.startsWith('text/html') && !html) html = pbody;
    }
    body = plain || (html ? stripHtml(html) : '');
  } else {
    if (cte === 'base64') body = decodeBase64(body);
    else if (cte === 'quoted-printable') body = decodeQuotedPrintable(body);
    if (/text\/html/i.test(ctype)) body = stripHtml(body);
  }
  return { subject, body: body.trim() };
}

function messageToItem(raw: string): ParsedItem | null {
  const { subject, body } = extractPlainBody(raw);
  const text = (subject ? `Subject: ${subject}\n\n` : '') + body;
  if (text.trim().length < 20) return null;
  return { text: text.slice(0, MAX_CHARS_PER_ITEM), kind: 'email', label: subject };
}

export function parseUpload(fileName: string, raw: string): ParsedItem[] {
  const name = (fileName || '').toLowerCase();
  const items: ParsedItem[] = [];

  if (name.endsWith('.mbox')) {
    const msgs = raw.split(/\r?\n(?=From )/);
    for (const msg of msgs) {
      if (items.length >= MAX_MESSAGES) break;
      const trimmed = msg.replace(/^From .*\r?\n/, '');
      const item = messageToItem(trimmed);
      if (item) items.push(item);
    }
    return items;
  }

  if (name.endsWith('.eml')) {
    const item = messageToItem(raw);
    if (item) items.push(item);
    return items;
  }

  const text = raw.trim();
  if (!text) return items;
  for (
    let i = 0;
    i < text.length && items.length < MAX_TEXT_CHUNKS;
    i += MAX_CHARS_PER_ITEM
  ) {
    items.push({ text: text.slice(i, i + MAX_CHARS_PER_ITEM), kind: 'text' });
  }
  return items;
}
