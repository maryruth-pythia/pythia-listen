/**
 * GET → who the server thinks you are: email, active org, memberships, and which boards
 * you can see. For diagnosing "I'm signed in but the board is empty" without database access.
 * Behind the sign-in gate; shows only the caller's own details.
 */
import { NextResponse } from 'next/server';
import { auth, authEnabled } from '@/lib/auth';
import { getScopeContext, getSessionContext } from '@/lib/session';
import { getScopedCampaigns } from '@/lib/scope';
import { matchOrgByEmail, ORG_INVITES } from '@/lib/org-invites';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!authEnabled || !auth) return NextResponse.json({ accounts: false });
  const s = await getSessionContext().catch(() => null);
  if (!s) return NextResponse.json({ accounts: true, signedIn: false });
  const scope = await getScopeContext();
  let memberships: string[] = [];
  try {
    const ctx = await auth.$context;
    const ms = (await ctx.adapter.findMany({ model: 'member', where: [{ field: 'userId', value: s.userId }] })) as {
      organizationId: string;
    }[];
    for (const m of ms) {
      const o = (await ctx.adapter.findOne({ model: 'organization', where: [{ field: 'id', value: m.organizationId }] })) as {
        slug?: string;
      } | null;
      memberships.push(o?.slug ?? m.organizationId);
    }
  } catch {
    memberships = ['(could not read memberships)'];
  }
  const boards = (await getScopedCampaigns()).map((c) => c.id);
  return NextResponse.json({
    accounts: true,
    signedIn: true,
    email: s.email,
    activeOrgSlug: scope.orgSlug ?? null,
    activeOrgSet: !!s.orgId,
    memberships,
    demoViewer: !!scope.demoViewer,
    canSeeBoards: boards,
    preApprovedFor: matchOrgByEmail(s.email)?.slug ?? null,
    // Whether each client org's member list is set on this deploy (counts only, no emails).
    memberListsSet: Object.fromEntries(
      ORG_INVITES.map((o) => [o.slug, (process.env[o.membersEnv] ?? '').split(',').filter((x) => x.trim()).length])
    ),
  });
}
