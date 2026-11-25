import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { getSession, upsertSession } from '@/lib/db';
import type { PhotovoiceEntry } from '@/lib/types';

export const dynamic = 'force-dynamic';
// Allow base64 image payloads up to ~10MB after encoding overhead.
export const maxDuration = 30;

/**
 * POST /api/sessions/[id]/photovoice
 * Body: { entries: PhotovoiceEntry[] }  // each with imageDataUrl + caption
 *
 * Replaces the session's photovoice entries with the supplied set.
 * Idempotent — safe to retry. Caller is responsible for client-side
 * resizing before upload (max ~1280px, JPEG q=0.7 recommended).
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const sessionId = (await ctx.params).id;
  const session = await getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const body = (await req.json()) as { entries?: PhotovoiceEntry[] };
  const entries = Array.isArray(body.entries) ? body.entries : [];

  // Basic validation: each entry must have an imageDataUrl and a caption.
  for (const e of entries) {
    if (!e.imageDataUrl || !e.imageDataUrl.startsWith('data:image/')) {
      return NextResponse.json(
        { error: 'Each photovoice entry needs a valid image data URL' },
        { status: 400 }
      );
    }
    if (typeof e.caption !== 'string') {
      return NextResponse.json(
        { error: 'Each photovoice entry needs a caption (can be empty)' },
        { status: 400 }
      );
    }
    // Cap individual image size at ~5MB of base64.
    if (e.imageDataUrl.length > 5 * 1024 * 1024 * 1.4) {
      return NextResponse.json(
        { error: 'One of the images is too large. Please resize before upload.' },
        { status: 413 }
      );
    }
  }

  session.photovoiceEntries = entries.map((e) => ({
    id: e.id || randomUUID(),
    imageDataUrl: e.imageDataUrl,
    caption: e.caption,
    capturedAt: e.capturedAt ?? new Date().toISOString(),
  }));
  session.updatedAt = new Date().toISOString();
  await upsertSession(session);

  return NextResponse.json({ ok: true, count: entries.length });
}
