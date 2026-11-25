/**
 * Seed the first organization and make an existing user its owner.
 *
 * Invite-only: members cannot create their own orgs
 * (allowUserToCreateOrganization:false), so the very first org is created here,
 * server-side, with no session.
 *
 * PREREQUISITE — the target user must already exist. With magic-link-only login
 * there are no passwords to seed; a user row is created the first time they
 * sign in. So the order is:
 *   1. Deploy a preview with AUTH_MODE=accounts (+ POSTGRES_URL, BETTER_AUTH_SECRET).
 *   2. Open /signin, request a link for your email, click it once. That creates
 *      your user row.
 *   3. Run this script to create the org and make you its owner.
 *
 * Usage (from the repo root, accounts env vars present in .env.local):
 *   AUTH_MODE=accounts npx tsx scripts/seed-org.ts <email> "<Org Name>" <org-slug>
 *
 * NOTE on ordering: lib/auth.ts reads env at import time to decide whether
 * accounts are enabled, so dotenv must load BEFORE that module is evaluated.
 * Static ES imports are hoisted, so we load env first and then DYNAMICALLY
 * import lib/auth inside main().
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

import { Pool } from 'pg';

async function main(): Promise<void> {
  const [email, name, slug] = process.argv.slice(2);
  if (!email || !name || !slug) {
    console.error('Usage: npx tsx scripts/seed-org.ts <email> "<Org Name>" <org-slug>');
    process.exit(1);
  }

  const { auth, authEnabled } = await import('../lib/auth');
  if (!authEnabled || !auth) {
    console.error(
      'Accounts are not enabled. Set AUTH_MODE=accounts, a Postgres URL ' +
        '(POSTGRES_URL or DATABASE_URL), and BETTER_AUTH_SECRET, then re-run.'
    );
    process.exit(1);
  }

  const connectionString = process.env.POSTGRES_URL ?? process.env.DATABASE_URL ?? '';
  const pool = new Pool({ connectionString });
  try {
    const { rows } = await pool.query(
      'select id, email from "user" where lower(email) = lower($1) limit 1',
      [email]
    );
    if (rows.length === 0) {
      console.error(
        `No user found for ${email}. Sign in once at /signin to create the user row, then re-run.`
      );
      process.exit(1);
    }
    const userId = rows[0].id as string;

    // No session headers -> server-side creation for the specified userId, who
    // becomes the organization owner.
    const org = await auth.api.createOrganization({
      body: { name, slug, userId },
    });

    console.log('Created organization:');
    console.log(JSON.stringify(org, null, 2));
    console.log(`\nOwner: ${email} (${userId})`);
    console.log('Next: sign in at /signin and you should see this org listed.');
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
