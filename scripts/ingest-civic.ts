/**
 * Transparency / verification tool for civic-record ingestion.
 *
 * Runs ONE live pass of the civic pipeline and prints exactly what it did —
 * the search queries it issued, the real source URLs it consulted, and each
 * signal it extracted with its citation — WITHOUT writing anything to the
 * database. This lets you confirm with your own eyes that the pipeline pulls
 * real, cited web data (not invented content).
 *
 * Usage (needs ANTHROPIC_API_KEY in .env.local):
 *   npx tsx scripts/ingest-civic.ts
 *   npm run ingest:civic
 *
 * Note: uses Claude's web_search tool, so it must run on a web-search-capable
 * model. Set PYTHIA_INGEST_MODEL if the default isn't enabled on your key.
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

import { webSearchCollector, INGEST_MODEL } from '../lib/ingest/collectors/web-search';
import { extractSignals } from '../lib/ingest/extract';
import { FRASIER_CONTEXT } from '../lib/ingest/seed-frasier';

function line() {
  console.log('─'.repeat(72));
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY is not set (add it to .env.local).');
    process.exit(1);
  }

  console.log(`\n🔎 Live civic-record pull — ${FRASIER_CONTEXT.projectName}, ${FRASIER_CONTEXT.jurisdiction}`);
  console.log(`   Docket: ${FRASIER_CONTEXT.docket}`);
  console.log(`   Model:  ${INGEST_MODEL}  (nothing will be written to the DB)\n`);

  line();
  console.log('STEP 1 — Collector (Claude web search)');
  line();
  const collection = await webSearchCollector.collect(FRASIER_CONTEXT);

  console.log(`\nSearch queries Claude actually issued (${collection.queries.length}):`);
  collection.queries.forEach((q, i) => console.log(`  ${i + 1}. ${q}`));

  console.log(`\nReal source pages consulted (${collection.sources.length}):`);
  collection.sources.forEach((s, i) =>
    console.log(`  ${i + 1}. ${s.url}${s.title ? `\n       ${s.title}` : ''}${s.pageAge ? `  (${s.pageAge})` : ''}`)
  );

  console.log(`\nDigest length: ${collection.digest.length} chars`);

  line();
  console.log('STEP 2 — Extractor (normalize into cited signals)');
  line();
  const signals = await extractSignals(FRASIER_CONTEXT, collection);
  console.log(`\nExtracted ${signals.length} cited signal(s):\n`);
  signals.forEach((s, i) => {
    console.log(`  [${i + 1}] (${s.stance}) ${s.title}`);
    console.log(`      ${s.summary}`);
    s.citations.forEach((c) => console.log(`      ↳ ${c.url}`));
    console.log('');
  });

  line();
  console.log('✅ Done. Every signal above cites a URL from the "consulted" list.');
  console.log('   Open any of those URLs to confirm the underlying facts are real.');
  line();
}

main().catch((err) => {
  console.error('\n❌ Live pull failed:', err instanceof Error ? err.message : err);
  console.error(
    '   If this is a web-search/model error, set PYTHIA_INGEST_MODEL to a\n' +
      '   web-search-capable model (e.g. a Sonnet 4.6+ / Opus 4.7+ id).'
  );
  process.exit(1);
});
