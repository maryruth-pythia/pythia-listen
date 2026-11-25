/**
 * Export the brief as a real, editable .docx — built by hand as OOXML zipped
 * with jszip (already a dependency), so no new package is needed. Text-focused
 * (headings, prose, bullets); charts stay in the PDF/web versions. The point is
 * an editable Word draft.
 *
 * Operator-only (under /api/manage/*).
 */
import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Block = { heading?: string; lead?: string; paras?: string[]; bullets?: string[] };

const esc = (t: string) =>
  String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function para(text: string, o: { bold?: boolean; italic?: boolean; size?: number; color?: string; before?: number } = {}) {
  const rpr = [
    o.bold ? '<w:b/>' : '',
    o.italic ? '<w:i/>' : '',
    o.size ? `<w:sz w:val="${o.size}"/><w:szCs w:val="${o.size}"/>` : '',
    o.color ? `<w:color w:val="${o.color}"/>` : '',
  ].join('');
  const ppr = `<w:pPr><w:spacing w:before="${o.before ?? 40}" w:after="40"/></w:pPr>`;
  return `<w:p>${ppr}<w:r><w:rPr>${rpr}</w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`;
}
const bullet = (text: string) =>
  `<w:p><w:pPr><w:spacing w:before="20" w:after="20"/><w:ind w:left="360" w:hanging="360"/></w:pPr>` +
  `<w:r><w:rPr><w:sz w:val="22"/></w:rPr><w:t xml:space="preserve">•  ${esc(text)}</w:t></w:r></w:p>`;

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'invalid JSON' }, { status: 400 }); }
  const b = (body ?? {}) as {
    filename?: string; title?: string; subtitle?: string; orgName?: string;
    dateStr?: string; preparedBy?: string; caseText?: string; cta?: string;
    summary?: string; blocks?: Block[];
  };

  const parts: string[] = [];
  if (b.orgName) parts.push(para(b.orgName, { bold: true, size: 24, color: '3B2A4E' }));
  parts.push(para(b.title || 'Community brief', { bold: true, size: 40, color: '3B2A4E', before: 60 }));
  if (b.subtitle) parts.push(para(b.subtitle, { size: 24, color: '6A5F74' }));
  const meta = [b.dateStr, b.preparedBy ? `Prepared by ${b.preparedBy}` : ''].filter(Boolean).join('  ·  ');
  if (meta) parts.push(para(meta, { size: 20, color: '9A8FA6' }));
  if (b.caseText) parts.push(para(b.caseText, { bold: true, size: 24, color: '7A4FC0', before: 120 }));
  if (b.cta) parts.push(para(b.cta, { bold: true, size: 24, color: 'B26A1E', before: 60 }));
  if (b.summary) { parts.push(para('Summary & context', { bold: true, size: 30, color: '3B2A4E', before: 200 })); parts.push(para(b.summary, { size: 24 })); }

  for (const blk of Array.isArray(b.blocks) ? b.blocks : []) {
    if (blk.heading) parts.push(para(blk.heading, { bold: true, size: 30, color: '3B2A4E', before: 200 }));
    if (blk.lead) parts.push(para(blk.lead, { size: 24, bold: true, color: '3B2A4E' }));
    for (const p of blk.paras ?? []) parts.push(para(p, { size: 24 }));
    for (const bl of blk.bullets ?? []) parts.push(bullet(bl));
  }

  const documentXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>` +
    parts.join('') +
    `<w:sectPr><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>`;

  const zip = new JSZip();
  zip.file('[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
  zip.file('_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  zip.file('word/document.xml', documentXml);

  const buf = await zip.generateAsync({ type: 'uint8array' });
  const safe = (b.filename || 'brief').replace(/[^a-z0-9\-_]+/gi, '_').slice(0, 60);
  return new NextResponse(buf as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${safe}.docx"`,
      'Cache-Control': 'no-store',
    },
  });
}
