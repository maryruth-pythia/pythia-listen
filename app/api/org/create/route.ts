/**
 * Invite-code-gated self-serve organization creation.
 *
 * A signed-in (magic-link) user with no org posts {name, inviteCode}. If the
 * code matches PYTHIA_INVITE_CODES, we create their org server-side (they become
 * owner) and set it active. One org per user for now. This is the controlled
 * self-serve path that replaces the terminal-only seed step (plan A5).
 */

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth, authEnabled } from '@/lib/auth';
import { getCurrentUser } from '@/lib/session';
import { matchOrgInvite } from '@/lib/org-invites';
import { joinOrCreate } from '@/lib/org-join';



function validCodes(): string[] {
  return (process.env.PYTHIA_INVITE_CODES ?? '')
    .split(',')
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean);
}

function slugify(name: string): string {
  const s = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return s || 'org';
}

export async function POST(req: Request) {
  if (!authEnabled || !auth) {
    return NextResponse.json({ error: 'Accounts are not enabled on this deploy.' }, { status: 503 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 });
  }

  let body: { name?: string; inviteCode?: string };
  try {
    body = (await req.json()) as { name?: string; inviteCode?: string };
  } catch {
    return NextResponse.json({ error: 'Bad request.' }, { status: 400 });
  }

  const name = (body.name ?? '').trim();
  const inviteCode = (body.inviteCode ?? '').trim().toLowerCase();

  // Client-org codes first: join (or start) that org; the typed name is not used.
  const orgInvite = matchOrgInvite(inviteCode);
  if (orgInvite) {
    try {
      const orgId = await joinOrCreate(orgInvite, user.userId, await headers());
      if (!orgId) throw new Error('no org id');
      return NextResponse.json({ ok: true, slug: orgInvite.slug, orgId, next: orgInvite.home });
    } catch {
      return NextResponse.json({ error: 'Could not join the organization. Please contact the Pythia team.' }, { status: 500 });
    }
  }

  if (!name) {
    return NextResponse.json({ error: 'Please enter an organization name.' }, { status: 400 });
  }

  const codes = validCodes();
  if (codes.length === 0) {
    return NextResponse.json(
      { error: 'Invite codes are not configured yet. Contact the Pythia team.' },
      { status: 503 }
    );
  }
  if (!codes.includes(inviteCode)) {
    return NextResponse.json({ error: "That invite code isn't valid." }, { status: 403 });
  }

  const h = await headers();

  // One org per user for now.
  try {
    const existing = await auth.api.listOrganizations({ headers: h });
    if (Array.isArray(existing) && existing.length > 0) {
      return NextResponse.json({ error: 'You already have an organization.' }, { status: 409 });
    }
  } catch {
    // If listing fails we fall through and let the create attempt be the guard.
  }

  // Create server-side (owner = this user), retrying on slug collision.
  const base = slugify(name);
  let slug = base;
  let created: { id?: string } | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      created = (await auth.api.createOrganization({
        body: { name, slug, userId: user.userId },
      })) as { id?: string } | null;
      break;
    } catch {
      if (attempt === 4) {
        return NextResponse.json(
          { error: 'Could not create the organization. Try a slightly different name.' },
          { status: 500 }
        );
      }
      slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    }
  }

  const orgId = created?.id;
  if (orgId) {
    try {
      await auth.api.setActiveOrganization({ headers: h, body: { organizationId: orgId } });
    } catch {
      // Non-fatal: the sign-in page's active-org fallback will set it.
    }
  }

  return NextResponse.json({ ok: true, slug, orgId });
}
