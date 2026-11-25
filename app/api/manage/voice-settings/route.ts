import { NextRequest, NextResponse } from 'next/server';
import { getVoiceProvider, saveVoiceProvider, elevenLabsConfigured } from '@/lib/voice-settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Operator-only (gated by the site password wall — under /api/manage/*). */
export async function GET() {
  const provider = await getVoiceProvider();
  return NextResponse.json({ provider, elevenAvailable: elevenLabsConfigured() });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
  const p = (body as { provider?: unknown }).provider;
  const provider = p === 'elevenlabs' ? 'elevenlabs' : 'fal';
  if (provider === 'elevenlabs' && !elevenLabsConfigured()) {
    return NextResponse.json(
      { error: 'ELEVENLABS_API_KEY is not set in this environment.' },
      { status: 400 }
    );
  }
  await saveVoiceProvider(provider);
  return NextResponse.json({ ok: true, provider });
}
