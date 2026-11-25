/**
 * Binary-aware upload parser (slice 2). Extends the text parser to Drive docs.
 *
 *  - .pdf         -> pdf-parse (text layer)
 *  - .docx        -> mammoth (raw text)
  *  - .html/.htm   -> tags stripped to text
 *  - everything else falls through to the text parser (mbox/eml/txt/csv/md/json)
 *
 * Loaded via dynamic import so the heavy libs are only pulled when a matching
 * file is actually uploaded. On any parse failure the file is skipped, not fatal.
 */

import { parseUpload, type ParsedItem } from './parse-upload';

const MAX_CHARS_PER_ITEM = 6000;
const MAX_TEXT_CHUNKS = 40;

function chunkText(text: string): ParsedItem[] {
  const items: ParsedItem[] = [];
  const t = (text || '').trim();
  for (
    let i = 0;
    i < t.length && items.length < MAX_TEXT_CHUNKS;
    i += MAX_CHARS_PER_ITEM
  ) {
    items.push({ text: t.slice(i, i + MAX_CHARS_PER_ITEM), kind: 'text' });
  }
  return items;
}

function stripHtml(s: string): string {
  return s
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function parseFile(
  fileName: string,
  file: File
): Promise<ParsedItem[]> {
  const name = (fileName || '').toLowerCase();
  try {
    if (name.endsWith('.pdf')) {
      // pdf-parse v2 has no default export (the v1 call silently returned nothing).
      const { pdfText } = await import('@/lib/watch/util');
      return chunkText(await pdfText(Buffer.from(await file.arrayBuffer())));
    }
    if (name.endsWith('.docx')) {
      const buf = Buffer.from(await file.arrayBuffer());
      const mammoth = await import('mammoth');
      const res = await mammoth.extractRawText({ buffer: buf });
      return chunkText(res.value);
    }
    if (name.endsWith('.html') || name.endsWith('.htm')) {
      const text = await file.text();
      return chunkText(stripHtml(text));
    }
  } catch {
    return [];
  }
  const text = await file.text();
  return parseUpload(fileName, text);
}
