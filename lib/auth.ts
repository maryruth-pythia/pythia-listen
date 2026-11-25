/**
 * Better Auth server instance — per-org accounts (magic-link login +
 * organizations). Self-hosted: all identity data lives in YOUR Postgres,
 * nothing goes to a third party.
 *
 * Guarded + flagged. `auth` is only constructed when:
 *   - AUTH_MODE === 'accounts'  (default is the legacy shared-password gate)
 *   - a Postgres connection string is present
 *   - BETTER_AUTH_SECRET is set
 * Otherwise `auth` is null and `authEnabled` is false, so importing this file
 * is always safe (local JSON-dev, or a deploy that hasn't flipped the flag).
 *
 * Invite-only: users cannot self-create orgs. Pythia seeds each org server-side
 * and the org's admin invites teammates (sendInvitationEmail below).
 */

import { betterAuth } from 'better-auth';
import { magicLink, organization } from 'better-auth/plugins';
import { Pool } from 'pg';
import { sendMagicLinkEmail, sendOrgInvitationEmail } from './auth-email';

const connectionString = process.env.POSTGRES_URL ?? process.env.DATABASE_URL ?? '';

export const authEnabled: boolean =
  process.env.AUTH_MODE === 'accounts' &&
  !!connectionString &&
  !!process.env.BETTER_AUTH_SECRET;

const baseURL = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? undefined;

export const auth = authEnabled
  ? betterAuth({
      database: new Pool({ connectionString }),
      secret: process.env.BETTER_AUTH_SECRET,
      baseURL,
      // No password auth — magic link only, so there are no passwords to store.
      emailAndPassword: { enabled: false },
      plugins: [
        magicLink({
          // Store sign-in tokens hashed, not in plain text (Better Auth's default is plain), so a
          // database leak can't be replayed into a sign-in. Links still expire in 5 minutes, single use.
          storeToken: 'hashed',
          sendMagicLink: async ({ email, url }: { email: string; url: string }) => {
            await sendMagicLinkEmail(email, url);
          },
        }),
        organization({
          // Invite-only: Pythia seeds orgs; members cannot spin up their own.
          allowUserToCreateOrganization: false,
          invitationExpiresIn: 60 * 60 * 24 * 7, // 7 days
          sendInvitationEmail: async (data: {
            id: string;
            email: string;
            organization?: { name?: string };
            inviter?: { user?: { name?: string } };
          }) => {
            const inviteUrl = `${baseURL ?? ''}/accept-invitation/${data.id}`;
            await sendOrgInvitationEmail(
              data.email,
              inviteUrl,
              data.organization?.name,
              data.inviter?.user?.name
            );
          },
        }),
      ],
    })
  : null;
