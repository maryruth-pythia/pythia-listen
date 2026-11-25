import { NextRequest, NextResponse } from 'next/server';
import { complete } from '@/lib/claude';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Operator-only. Turn a pasted link or uploaded text into one distilled
 *  brief section, guided by the operator's instruction. */

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&rsquo;|&lsquo;/g, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/&mdash;/g, '—')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
  const b = (body ?? {}) as { url?: unknown; text?: unknown; instruction?: unknown };
  const url = typeof b.url === 'string' ? b.url.trim() : '';
  const text = typeof b.text === 'string' ? b.text : '';
  const instruction = typeof b.instruction === 'string' ? b.instruction.trim() : '';

  let source = '';
  if (url) {
    if (!/^https?:\/\//i.test(url)) {
      return NextResponse.json({ error: 'Please paste a full http(s) link.' }, { status: 400 });
    }
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 12000);
      const res = await fetch(url, { signal: ctrl.signal, headers: { 'user-agent': 'Mozilla/5.0 (compatible; PythiaBot/1.0)' } });
      clearTimeout(timer);
      if (!res.ok) return NextResponse.json({ error: `Couldn't fetch that page (HTTP ${res.status}).` }, { status: 502 });
      source = htmlToText(await res.text());
    } catch {
      return NextResponse.json({ error: "Couldn't reach that link — check it, or paste the text instead." }, { status: 502 });
    }
  } else if (text) {
    source = text;
  } else {
    return NextResponse.json({ error: 'Provide a link or some text.' }, { status: 400 });
  }
  source = source.slice(0, 8000);
  if (source.length < 60) {
    return NextResponse.json({ error: 'Not enough readable text to work with.' }, { status: 422 });
  }

  let reply: string;
  try {
    reply = await complete({
      maxTokens: 600,
      temperature: 0.2,
      system:
        'You help a community organization assemble a brief. From the SOURCE, write ONE short, clear section for that brief. ' +
        'Follow the operator instruction for what to pull out. Plain, neutral language; a few short sentences or bullet points. ' +
        'No preamble like "Here is" and no heading — just the section content. Do not invent facts beyond the source.',
      messages: [{ role: 'user', content: `INSTRUCTION: ${instruction || '(summarize the key points relevant to a community brief)'}\n\nSOURCE:\n${source}` }],
    });
  } catch {
    return NextResponse.json({ error: 'The extractor could not run just now — try again in a moment.' }, { status: 502 });
  }

  return NextResponse.json({ body: reply.trim() });
}
