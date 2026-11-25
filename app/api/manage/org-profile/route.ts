import { NextRequest, NextResponse } from 'next/server';
import { getOrgProfile, saveOrgProfile, type OrgProfile } from '@/lib/org-profile';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const profile = await getOrgProfile();
  return NextResponse.json({ profile });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
  const b = (body ?? {}) as Partial<OrgProfile>;
  const logo =
    typeof b.logoDataUrl === 'string' && b.logoDataUrl.startsWith('data:image/')
      ? b.logoDataUrl
      : undefined;
  if (logo && logo.length > 700000) {
    return NextResponse.json({ error: 'Logo is too large — keep it under ~500 KB.' }, { status: 413 });
  }
  const profile: OrgProfile = {
    name: typeof b.name === 'string' ? b.name.trim() : '',
    website: typeof b.website === 'string' && b.website.trim() ? b.website.trim() : undefined,
    email: typeof b.email === 'string' && b.email.trim() ? b.email.trim() : undefined,
    logoDataUrl: logo,
  };
  await saveOrgProfile(profile);
  return NextResponse.json({ ok: true, profile });
}
