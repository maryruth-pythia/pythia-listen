/**
 * Thin session/org seam.
 *
 * The REST of the app talks to auth ONLY through these helpers — never by
 * importing Better Auth's API directly into pages/routes. That keeps the whole
 * auth surface behind one interface, so swapping providers later (or turning
 * accounts off) touches this file, not hundreds of call sites.
 *
 * When accounts are disabled (legacy password mode), these return null and the
 * caller falls back to existing behavior.
 */

import { headers } from 'next/headers';
import { auth, authEnabled } from './auth';

export interface SessionContext {
  userId: string;
  email: string;
  name?: string;
  /** The org the user is currently acting in (Better Auth activeOrganizationId). */
  orgId: string | null;
}

/** The user's first org membership, for sessions that never had an active org set. */
async function firstMembership(userId: string): Promise<string | null> {
  if (!auth) return null;
  try {
    const ctx = await auth.$context;
    const m = (await ctx.adapter.findOne({ model: 'member', where: [{ field: 'userId', value: userId }] })) as {
      organizationId?: string;
    } | null;
    return m?.organizationId ?? null;
  } catch {
    return null;
  }
}

export async function getSessionContext(): Promise<SessionContext | null> {
  if (!authEnabled || !auth) return null;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  // A session can arrive with no active org (e.g. a sign-in link that returns straight to a
  // board, skipping the sign-in page that sets it). Fall back to the user's first org rather
  // than denying everything.
  const activeOrg =
    (session.session as { activeOrganizationId?: string | null } | undefined)
      ?.activeOrganizationId ?? (await firstMembership(session.user.id));
  return {
    userId: session.user.id,
    email: session.user.email,
    name: session.user.name ?? undefined,
    orgId: activeOrg,
  };
}

export async function getCurrentUser(): Promise<SessionContext | null> {
  return getSessionContext();
}

/** The org the logged-in user is acting in, or null. Deny-by-default upstream. */
export async function getSessionOrg(): Promise<string | null> {
  const ctx = await getSessionContext();
  return ctx?.orgId ?? null;
}

/** True when the per-org accounts system is active (vs the legacy shared password). */
export function accountsEnabled(): boolean {
  return authEnabled;
}

export interface ScopeContext {
  /** Accounts mode on? In password mode there is a single implicit tenant. */
  accountsMode: boolean;
  /** Active org id, or null. In accounts mode a null org is deny-by-default. */
  orgId: string | null;
  /** Admin/demo viewer (email in PYTHIA_DEMO_EMAILS): sees all seed/demo projects. */
  demoViewer?: boolean;
  /** Slug of the active org, for boards shared with one org by slug (Campaign.orgSlug). */
  orgSlug?: string | null;
}

/** Slug for an org id (null if unknown). Read straight from Better Auth's organization table. */
async function orgSlugFor(orgId: string | null): Promise<string | null> {
  if (!orgId || !auth) return null;
  // Official API first (the caller is a member of their active org), then the raw table.
  try {
    const org = (await auth.api.getFullOrganization({
      headers: await headers(),
      query: { organizationId: orgId },
    })) as { slug?: string } | null;
    if (org?.slug) return org.slug;
  } catch {
    /* fall through */
  }
  try {
    const ctx = await auth.$context;
    const org = (await ctx.adapter.findOne({ model: 'organization', where: [{ field: 'id', value: orgId }] })) as {
      slug?: string;
    } | null;
    return org?.slug ?? null;
  } catch {
    return null;
  }
}

/**
 * The org to scope data to for this request. In password mode there is NO org
 * boundary (single implicit tenant), so callers do not filter and the live
 * pilot is unchanged. In accounts mode the active org is returned; a null org
 * there means "no data" (deny-by-default).
 */
function isDemoEmail(email?: string): boolean {
  if (!email) return false;
  const allow = (process.env.PYTHIA_DEMO_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allow.includes(email.toLowerCase());
}

export async function getScopeContext(): Promise<ScopeContext> {
  if (!authEnabled) return { accountsMode: false, orgId: null, demoViewer: false };
  const ctx = await getSessionContext();
  return {
    accountsMode: true,
    orgId: ctx?.orgId ?? null,
    orgSlug: await orgSlugFor(ctx?.orgId ?? null),
    demoViewer: isDemoEmail(ctx?.email),
  };
}
