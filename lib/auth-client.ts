/**
 * Better Auth browser client (magic-link + organization plugins).
 * Used by the sign-in page and any org-management UI.
 */

'use client';

import { createAuthClient } from 'better-auth/client';
import { magicLinkClient, organizationClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  plugins: [magicLinkClient(), organizationClient()],
});
