import { getCache, setCache } from '@/lib/db';

/**
 * The operator's organization profile — name, contact, and logo. Set once on
 * the onboarding page; pulled onto every Brief so recipients know who made it.
 *
 * Persisted through the KV cache store (getCache/setCache have no TTL of their
 * own — TTL is only applied by the cached() helper, which we don't use here),
 * so no new table is needed in either backend. When multi-tenant accounts land
 * this becomes per-org.
 */
export interface OrgProfile {
  name: string;
  website?: string;
  email?: string;
  /** Small logo stored inline as a data: URL. */
  logoDataUrl?: string;
}

const KEY = 'org:profile:v1';

export async function getOrgProfile(): Promise<OrgProfile | null> {
  const hit = await getCache(KEY);
  return hit && hit.value ? (hit.value as OrgProfile) : null;
}

export async function saveOrgProfile(p: OrgProfile): Promise<void> {
  await setCache(KEY, p);
}
