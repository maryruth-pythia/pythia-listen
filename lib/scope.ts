/**
 * Server-only scoping helpers.
 *
 * Kept separate from lib/campaigns.ts so that widely-imported module never pulls
 * in the auth stack. Everything here resolves the acting org via lib/session.ts.
 *
 * Contract (see getScopeContext):
 *   - password mode: NO org boundary — returns everything (live pilot unchanged).
 *   - accounts mode: only the acting org's campaigns; deny-by-default when no org.
 *
 * This is the app-level wall. The database-level backstop (Postgres RLS) is A4b.
 */
import { getAllCampaigns, scopeCampaignsToOrg, type Campaign } from './campaigns';
import { getScopeContext } from './session';

/** Campaigns the acting org may see. */
export async function getScopedCampaigns(): Promise<Campaign[]> {
  const [all, ctx] = await Promise.all([getAllCampaigns(), getScopeContext()]);
  return scopeCampaignsToOrg(all, ctx);
}

/** Whether the acting org may access this campaign (always true in password mode). */
export async function canAccessCampaign(campaignId: string): Promise<boolean> {
  const scoped = await getScopedCampaigns();
  return scoped.some((c) => c.id === campaignId);
}

/** The org id to stamp on newly created data; undefined in password mode. */
export async function actingOrgId(): Promise<string | undefined> {
  const ctx = await getScopeContext();
  return ctx.accountsMode ? ctx.orgId ?? undefined : undefined;
}
