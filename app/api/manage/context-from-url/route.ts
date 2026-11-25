import { NextRequest, NextResponse } from 'next/server';
import { complete } from '@/lib/claude';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Operator-only (under /api/manage, behind the site password wall).
 *  Fetch a URL, distill it into a few plain community-concern lines the
 *  operator can drop into a project's Background context. */

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
  const url = (body as { url?: unknown })?.url;
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: 'Please paste a full http(s) link.' }, { status: 400 });
  }

  let html: string;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; PythiaBot/1.0)' },
    });
    clearTimeout(timer);
    if (!res.ok) {
      return NextResponse.json({ error: `Couldn't fetch that page (HTTP ${res.status}).` }, { status: 502 });
    }
    html = await res.text();
  } catch {
    return NextResponse.json({ error: "Couldn't reach that link — check it, or paste the concerns by hand." }, { status: 502 });
  }

  const text = htmlToText(html).slice(0, 6000);
  if (text.length < 120) {
    return NextResponse.json({ error: "That page didn't have enough readable text to work with." }, { status: 422 });
  }

  let reply: string;
  try {
    reply = await complete({
      maxTokens: 400,
      temperature: 0,
      system:
        'You read an article about a community and a proposed energy or infrastructure project. ' +
        'Extract the concrete concerns, hopes, or points of contention community members have. ' +
        'Return 3 to 6 short lines, ONE concern per line, in plain neutral language, each under 15 words. ' +
        'No numbering, no bullets, no preamble — only the lines. If there are no community concerns, return nothing.',
      messages: [{ role: 'user', content: text }],
    });
  } catch {
    return NextResponse.json({ error: 'The extractor could not run just now — try again in a moment.' }, { status: 502 });
  }

  const lines = reply
    .split('\n')
    .map((l) => l.replace(/^[\s\-*\d.)]+/, '').trim())
    .filter((l) => l.length > 3)
    .slice(0, 6);

  return NextResponse.json({ lines, text: lines.join('\n') });
}
