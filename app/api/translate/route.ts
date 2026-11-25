/**
 * Lightweight translation endpoint. Given { text, target }, returns the text
 * translated into the target language. Used when the operator switches the
 * conversation language so the most recent message (and its read-aloud) match.
 * Operator-gated (not in the middleware allow-list), so it needs a valid session.
 */
import { NextRequest, NextResponse } from 'next/server';
import { complete } from '@/lib/claude';
import { languageName } from '@/lib/language';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
  const b = body as { text?: unknown; target?: unknown };
  const text = typeof b.text === 'string' ? b.text.trim() : '';
  const target = typeof b.target === 'string' ? b.target : '';
  if (!text) return NextResponse.json({ error: 'text required' }, { status: 400 });

  const targetName = languageName(target);
  try {
    const out = await complete({
      maxTokens: 1500,
      temperature: 0,
      feature: 'translate',
      messages: [
        {
          role: 'user',
          content:
            `Translate the message below into ${targetName}. Preserve the meaning, tone, and any line breaks. ` +
            `Do not add commentary, labels, or quotation marks — return ONLY the translated text.\n\n${text}`,
        },
      ],
    });
    const translated = (out || '').trim();
    return NextResponse.json({ text: translated || text });
  } catch (e: any) {
    console.error('[translate] failed:', e?.message || e);
    return NextResponse.json({ error: 'translation failed' }, { status: 500 });
  }
}
