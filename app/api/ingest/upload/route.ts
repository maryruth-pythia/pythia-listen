/**
 * Direct conversation/document upload -> channel ingestion.
 *
 * Files are parsed (email .mbox/.eml per-message; .pdf/.docx/text) and handed to
 * ingestChannelItems, which extracts signals and — importantly — lets the
 * content-router assign each one to the RIGHT campaign from its content. No
 * campaign is chosen by hand. The client sends the whole set in small batches so
 * no single request is too big; this endpoint just processes the batch it gets.
 *
 * Operator-gated by the site password wall. The extractor drops PII.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { ingestChannelItems } from '@/lib/ingest/channels';
import { listSignals } from '@/lib/db';
import { getScopeContext } from '@/lib/session';
import { parseFile } from '@/lib/ingest/parse-file';
import type { RawChannelItem } from '@/lib/ingest/drive';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  viber: 'Viber',
  signal: 'Signal',
  email: 'Email',
  documents: 'Documents',
  other: 'Uploaded',
};
const ALLOWED = ['whatsapp', 'viber', 'signal', 'email', 'documents', 'other'];

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: 'expected multipart form-data with a file' },
      { status: 400 }
    );
  }

  const files = form.getAll('file').filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: 'no file uploaded' }, { status: 400 });
  }

  const raw = String(form.get('channel') ?? 'other').toLowerCase();
  const channel = ALLOWED.includes(raw) ? raw : 'other';
  const channelLabel = CHANNEL_LABELS[channel] ?? 'Uploaded';

  const items: RawChannelItem[] = [];
  for (const file of files) {
    const parsed = await parseFile(file.name || 'upload.txt', file);
    if (parsed.length === 0) continue;
    const base =
      'up_' +
      createHash('sha1')
        .update(`${file.name}:${file.size}`)
        .digest('hex')
        .slice(0, 16);
    parsed.forEach((p, idx) => {
      items.push({
        channel: p.kind === 'email' ? 'email' : channel,
        channelLabel: p.kind === 'email' ? 'Email' : channelLabel,
        fileId: parsed.length > 1 ? `${base}_i${idx}` : base,
        fileName: file.name || `${channel}-upload.txt`,
        text: p.text,
        source: 'pythia',
      });
    });
  }

  if (items.length === 0) {
    return NextResponse.json(
      { error: 'files were empty or unreadable' },
      { status: 400 }
    );
  }

  // Skip chunks already ingested (resume-friendly + avoids re-extraction cost).
  const seen = new Set(
    (await listSignals())
      .map((sig) => sig.dedupeKey)
      .filter((k): k is string => !!k)
  );
  const fresh = items.filter((it) => !seen.has(`ch_${it.fileId}`));
  if (fresh.length === 0) {
    return NextResponse.json({
      ok: true,
      files: files.length,
      items: items.length,
      created: 0,
      updated: items.length,
      extracted: 0,
      byCampaign: {},
    });
  }

  try {
    // Content-router assigns each signal's campaign automatically.
    const scope = await getScopeContext();
    const result = await ingestChannelItems(fresh, undefined, scope);
    return NextResponse.json({ ok: true, files: files.length, items: items.length, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `ingestion failed: ${message}` }, { status: 500 });
  }
}
