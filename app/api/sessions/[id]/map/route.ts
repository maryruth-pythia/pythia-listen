import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { getSession, upsertSession } from '@/lib/db';
import type { MapPin } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * POST /api/sessions/[id]/map
 * Body: { pins: MapPin[] }
 *
 * Replaces the session's map pins with the supplied set.
 * Idempotent — safe to retry.
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

  const body = (await req.json()) as { pins?: MapPin[] };
  const pins = Array.isArray(body.pins) ? body.pins : [];

  for (const p of pins) {
    if (typeof p.lat !== 'number' || typeof p.lng !== 'number') {
      return NextResponse.json(
        { error: 'Each pin needs numeric lat and lng' },
        { status: 400 }
      );
    }
    if (p.lat < -90 || p.lat > 90 || p.lng < -180 || p.lng > 180) {
      return NextResponse.json(
        { error: 'Lat/lng out of range' },
        { status: 400 }
      );
    }
  }

  session.mapPins = pins.map((p) => ({
    id: p.id || randomUUID(),
    lat: p.lat,
    lng: p.lng,
    label: p.label ?? '',
    note: p.note?.trim() || undefined,
    kind: p.kind ?? 'concern',
    capturedAt: p.capturedAt ?? new Date().toISOString(),
  }));
  session.updatedAt = new Date().toISOString();
  await upsertSession(session);

  return NextResponse.json({ ok: true, count: pins.length });
}
