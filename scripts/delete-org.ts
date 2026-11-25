/**
 * Delete a test/throwaway organization and its identity rows.
 *
 * Companion to seed-org.ts. Removes an organization created in accounts mode
 * (the Alpha/Beta isolation-test orgs, say) so it stops appearing in org lists
 * and can no longer be signed into.
 *
 * SAFE BY DEFAULT:
 *   - No slug, or --list  -> prints all organizations, deletes nothing.
 *   - <slug> (no --yes)   -> DRY RUN: shows exactly what would be deleted.
 *   - <slug> --yes        -> deletes, inside a single transaction.
 *
 * It removes the identity rows only: the `organization` row plus its `member`
 * and `invitation` rows (resolved by introspecting the live schema, so it works
 * regardless of Better Auth's column casing). Campaigns the org created live in
 * the KV cache keyed by orgId; those become unreachable once the org is gone.
 * The script REPORTS how many cached campaigns reference the org but does not
 * mutate the cache blob (harmless orphans; kept simple on purpose).
 *
 * Usage (from repo root, accounts env vars present in .env.local):
 *   AUTH_MODE=accounts npx tsx scripts/delete-org.ts --list
 *   AUTH_MODE=accounts npx tsx scripts/delete-org.ts <org-slug>
 *   AUTH_MODE=accounts npx tsx scripts/delete-org.ts <org-slug> --yes
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

import { Pool } from 'pg';

async function tableExists(pool: Pool, name: string): Promise<boolean> {
  const { rows } = await pool.query(
    `select 1 from information_schema.tables
      where table_schema = 'public' and table_name = $1 limit 1`,
    [name]
  );
  return rows.length > 0;
}

// Find the actual column on `table` whose name matches /organization/i
// (Better Auth may store it as "organizationId"); falls back to null.
async function orgColumn(pool: Pool, table: string): Promise<string | null> {
  const { rows } = await pool.query(
    `select column_name from information_schema.columns
      where table_schema = 'public' and table_name = $1`,
    [table]
  );
  const cols = rows.map((r) => r.column_name as string);
  return (
    cols.find((c) => /^organization[_]?id$/i.test(c)) ??
    cols.find((c) => /organization/i.test(c) && /id/i.test(c)) ??
    null
  );
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const doDelete = args.includes('--yes');
  const list = args.includes('--list');
  const slug = args.find((a) => !a.startsWith('--'));

  const connectionString =
    process.env.POSTGRES_URL ?? process.env.DATABASE_URL ?? '';
  if (!connectionString) {
    console.error('No POSTGRES_URL / DATABASE_URL found in env.');
    process.exit(1);
  }
  const pool = new Pool({ connectionString });

  try {
    if (!(await tableExists(pool, 'organization'))) {
      console.error(
        'No "organization" table found — is this the accounts-mode database?'
      );
      process.exit(1);
    }

    // --list or no slug: show everything, delete nothing.
    if (list || !slug) {
      const { rows } = await pool.query(
        'select id, name, slug from "organization" order by name'
      );
      if (rows.length === 0) {
        console.log('No organizations exist.');
      } else {
        console.log(`Organizations (${rows.length}):`);
        for (const r of rows) {
          console.log(`  ${r.slug}\t${r.name}\t(${r.id})`);
        }
      }
      console.log(
        '\nTo delete one:  npx tsx scripts/delete-org.ts <slug>        (dry run)\n' +
          '                npx tsx scripts/delete-org.ts <slug> --yes  (delete)'
      );
      return;
    }

    // Resolve the org by slug.
    const { rows: orgRows } = await pool.query(
      'select id, name, slug from "organization" where slug = $1 limit 1',
      [slug]
    );
    if (orgRows.length === 0) {
      console.error(`No organization with slug "${slug}". Run --list to see them.`);
      process.exit(1);
    }
    const org = orgRows[0] as { id: string; name: string; slug: string };

    // Count dependent identity rows.
    const counts: Record<string, number> = {};
    for (const table of ['member', 'invitation']) {
      if (!(await tableExists(pool, table))) continue;
      const col = await orgColumn(pool, table);
      if (!col) continue;
      const { rows } = await pool.query(
        `select count(*)::int as n from "${table}" where "${col}" = $1`,
        [org.id]
      );
      counts[table] = rows[0].n as number;
    }

    // Best-effort: how many cached campaigns reference this orgId?
    let campaignNote = '';
    if (await tableExists(pool, 'analysis_cache')) {
      try {
        const { rows } = await pool.query(
          `select count(*)::int as n from analysis_cache
            where value::text like '%' || $1 || '%'`,
          [org.id]
        );
        if ((rows[0].n as number) > 0) {
          campaignNote =
            `  ~${rows[0].n} cache row(s) mention this org id (campaigns it created) ` +
            `— they become unreachable once the org is gone; not deleted here.`;
        }
      } catch {
        /* cache table shape differs — skip the note */
      }
    }

    console.log(`Organization: ${org.name} (slug: ${org.slug}, id: ${org.id})`);
    console.log(`Would delete:`);
    console.log(`  1 organization row`);
    for (const [t, n] of Object.entries(counts)) {
      console.log(`  ${n} ${t} row(s)`);
    }
    if (campaignNote) console.log(campaignNote);

    if (!doDelete) {
      console.log('\nDRY RUN — nothing deleted. Re-run with --yes to delete.');
      return;
    }

    // Delete in FK-safe order, in one transaction.
    const client = await pool.connect();
    try {
      await client.query('begin');
      for (const table of ['invitation', 'member']) {
        if (counts[table] === undefined) continue;
        const col = await orgColumn(pool, table);
        if (!col) continue;
        await client.query(
          `delete from "${table}" where "${col}" = $1`,
          [org.id]
        );
      }
      await client.query('delete from "organization" where id = $1', [org.id]);
      await client.query('commit');
      console.log(`\nDeleted organization "${org.name}" (${org.slug}) and its member/invitation rows.`);
    } catch (e) {
      await client.query('rollback');
      throw e;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
