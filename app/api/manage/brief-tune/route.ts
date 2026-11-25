import { NextRequest, NextResponse } from 'next/server';
import { complete } from '@/lib/claude';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Operator-only. Given the brief's PURPOSE and the sections that have data,
 *  pick which to include, a density, and a one-line "case" statement. */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
  const b = (body ?? {}) as { purpose?: unknown; sections?: unknown; preset?: unknown };
  const purpose = typeof b.purpose === 'string' ? b.purpose.trim() : '';
  const preset = typeof b.preset === 'string' ? b.preset : 'fact';
  const sections = Array.isArray(b.sections)
    ? (b.sections as Array<{ id?: unknown; label?: unknown }>)
        .filter((s) => typeof s?.id === 'string')
        .map((s) => ({ id: String(s.id), label: String(s.label ?? s.id) }))
    : [];
  if (!purpose) return NextResponse.json({ error: 'Describe the purpose first.' }, { status: 400 });
  if (sections.length === 0) return NextResponse.json({ error: 'No sections available.' }, { status: 400 });

  const list = sections.map((s) => `- ${s.id}: ${s.label}`).join('\n');
  let reply: string;
  try {
    reply = await complete({
      maxTokens: 500,
      temperature: 0.2,
      system:
        'You configure a community brief for a community-based organization. Given the PURPOSE and the AVAILABLE sections (id + label), decide which section ids to include, a density, and write ONE short sentence stating the case being made that matches the purpose. ' +
        'Reply with ONLY a JSON object, no prose: {"sections": string[], "density": "skimmable"|"balanced"|"detailed", "caseText": string, "note": string}. ' +
        'Use only ids from the AVAILABLE list. "note" is one short sentence to the operator explaining what you chose and why.',
      messages: [{ role: 'user', content: `PURPOSE: ${purpose}\nCURRENT PRESET: ${preset}\nAVAILABLE SECTIONS:\n${list}` }],
    });
  } catch {
    return NextResponse.json({ error: 'The tuner could not run just now — try again.' }, { status: 502 });
  }

  const match = reply.match(/\{[\s\S]*\}/);
  if (!match) return NextResponse.json({ error: 'Could not read the tuner response.' }, { status: 502 });
  try {
    const parsed = JSON.parse(match[0]) as {
      sections?: unknown; density?: unknown; caseText?: unknown; note?: unknown;
    };
    const allowed = new Set(sections.map((s) => s.id));
    const outSections = Array.isArray(parsed.sections)
      ? parsed.sections.filter((x): x is string => typeof x === 'string' && allowed.has(x))
      : [];
    const density = ['skimmable', 'balanced', 'detailed'].includes(String(parsed.density))
      ? String(parsed.density)
      : undefined;
    return NextResponse.json({
      sections: outSections,
      density,
      caseText: typeof parsed.caseText === 'string' ? parsed.caseText : '',
      note: typeof parsed.note === 'string' ? parsed.note : '',
    });
  } catch {
    return NextResponse.json({ error: 'Could not parse the tuner response.' }, { status: 502 });
  }
}
