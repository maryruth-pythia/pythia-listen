/**
 * POST → { joined, next? }. If the signed-in user's email is pre-approved for a client org
 * (PYTHIA_ORG_MEMBERS_*), add them to it (creating it the first time) and set it active, so
 * they never see the create-org form. Called by /operator/create-org on load.
 */
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth, authEnabled } from '@/lib/auth';
import { getCurrentUser } from '@/lib/session';
import { matchOrgByEmail } from '@/lib/org-invites';
import { joinOrCreate } from '@/lib/org-join';

/** Opening /api/org/auto-join in a browser runs the same join and shows the result (for support). */
export async function GET() {
  return POST();
}

export async function POST() {
  if (!authEnabled) return NextResponse.json({ joined: false, reason: 'accounts are off on this deploy' });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ joined: false, reason: 'not signed in' }, { status: 401 });
  const invite = matchOrgByEmail(user.email);
  if (!invite) {
    return NextResponse.json({
      joined: false,
      reason: `${user.email} is not on any client org's pre-approved list (check the PYTHIA_ORG_MEMBERS_* variable and redeploy)`,
    });
  }
  try {
    const h = await headers();
    const before = auth
      ? ((await auth.api.getSession({ headers: h }))?.session as { activeOrganizationId?: string | null } | undefined)
          ?.activeOrganizationId ?? null
      : null;
    const orgId = await joinOrCreate(invite, user.userId, h);
    // Only report a change, so a member already in (and active in) the org isn't redirected
    // every time they open the sign-in page.
    return NextResponse.json({ joined: !!orgId && orgId !== before, next: invite.home });
  } catch (e) {
    return NextResponse.json({ joined: false, reason: `joining ${invite.slug} failed: ${e instanceof Error ? e.message : String(e)}` });
  }
}
