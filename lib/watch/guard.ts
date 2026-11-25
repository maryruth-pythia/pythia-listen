import type { NextRequest } from 'next/server';
import { verifySession } from '@/lib/pw-session';
import { accountsEnabled, getSessionContext } from '@/lib/session';
import { canAccessCampaign } from '@/lib/scope';

/** True for Vercel Cron (bearer secret). */
export function isCron(req: NextRequest): boolean {
  const secret = process.env.PYTHIA_CRON_SECRET ?? process.env.CRON_SECRET;
  return !!secret && (req.headers.get('authorization') ?? '') === `Bearer ${secret}`;
}

/**
 * Watch routes are reachable without the site gate (so cron can call them), so they guard
 * themselves: cron secret, or a signed-in operator who can see this campaign.
 */
export async function watchAuthorized(req: NextRequest, campaignId?: string): Promise<boolean> {
  return (await watchAccess(req, campaignId)).ok;
}

/** Like watchAuthorized, with the reason when it says no (shown to the operator). */
export async function watchAccess(req: NextRequest, campaignId?: string): Promise<{ ok: boolean; status?: number; reason?: string }> {
  if (isCron(req)) return { ok: true };
  if (accountsEnabled()) {
    const ctx = await getSessionContext().catch(() => null);
    if (!ctx) return { ok: false, status: 401, reason: 'not signed in (the sign-in cookie did not reach the server)' };
    if (!ctx.orgId) return { ok: false, status: 403, reason: `${ctx.email} is signed in but is not in any organization yet` };
    if (campaignId && !(await canAccessCampaign(campaignId))) {
      return { ok: false, status: 403, reason: `${ctx.email} is signed in, but their organization can't see this board` };
    }
    return { ok: true };
  }
  const pw = process.env.PYTHIA_PASSWORD;
  const ok = !!pw && (await verifySession(req.cookies.get('pythia-auth')?.value, pw));
  return ok ? { ok } : { ok, status: 401, reason: 'not signed in' };
}
