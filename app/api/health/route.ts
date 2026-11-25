import { NextResponse } from 'next/server';
import { complete, MODELS } from '@/lib/claude';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json(
      { ok: false, error: 'OPENROUTER_API_KEY not set in env' },
      { status: 500 }
    );
  }

  try {
    const start = Date.now();
    const reply = await complete({
      model: MODELS.utility,
      maxTokens: 32,
      messages: [{ role: 'user', content: 'Reply with: PYTHIA_HEALTH_OK' }],
    });
    const elapsed = Date.now() - start;

    return NextResponse.json({
      ok: true,
      model: MODELS.utility,
      elapsedMs: elapsed,
      reply: reply.trim(),
    });
  } catch (err) {
    const e = err as { status?: number; message?: string };
    return NextResponse.json(
      {
        ok: false,
        status: e.status ?? 0,
        error:
          e.message ??
          'OpenRouter API call failed. Check OPENROUTER_API_KEY and network.',
      },
      { status: 500 }
    );
  }
}
