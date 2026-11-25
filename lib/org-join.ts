/**
 * Server-only: put a user into a client org (lib/org-invites.ts), creating the org the first time.
 * Used by the invite-code route and by email pre-approval on first sign-in.
 */
import { auth } from '@/lib/auth';
import type { OrgInvite } from '@/lib/org-invites';

/**
 * A client-org code: join that org if it exists (as a member), else create it with its
 * fixed name and slug (this user as owner). Works even if the user already has an org.
 */
export async function joinOrCreate(invite: OrgInvite, userId: string, h: Headers) {
  if (!auth) throw new Error('accounts disabled');
  const ctx = await auth.$context;
  const existing = (await ctx.adapter.findOne({
    model: 'organization',
    where: [{ field: 'slug', value: invite.slug }],
  })) as { id: string } | null;
  let orgId = existing?.id;
  if (orgId) {
    const already = await ctx.adapter.findOne({
      model: 'member',
      where: [
        { field: 'organizationId', value: orgId },
        { field: 'userId', value: userId },
      ],
    });
    if (!already) {
      await auth.api.addMember({ body: { userId, role: 'member', organizationId: orgId } });
    }
  } else {
    const created = (await auth.api.createOrganization({
      body: { name: invite.name, slug: invite.slug, userId },
    })) as { id?: string } | null;
    orgId = created?.id;
  }
  if (orgId) {
    try {
      await auth.api.setActiveOrganization({ headers: h, body: { organizationId: orgId } });
    } catch {
      /* the sign-in page's active-org fallback sets it */
    }
  }
  return orgId;
}
