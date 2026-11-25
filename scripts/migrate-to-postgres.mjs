/**
 * One-off: copy local JSON signals → production Postgres (Neon).
 *
 * Usage (from the project root):
 *   POSTGRES_URL="postgresql://...your prod connection string..." node scripts/migrate-to-postgres.mjs
 *
 * Reads data/runtime/signals.json and upserts every signal into the same
 * `signals` table the app uses (idempotent — safe to re-run). Never prints the
 * connection string. Matches lib/db/postgres.ts exactly.
 */
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'node:fs';

const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!url) {
  console.error('Set POSTGRES_URL to your production connection string, e.g.\n  POSTGRES_URL="postgresql://..." node scripts/migrate-to-postgres.mjs');
  process.exit(1);
}
const sql = neon(url);

const signals = JSON.parse(readFileSync('data/runtime/signals.json', 'utf8'));
console.log(`Read ${signals.length} local signals. Connecting to production…`);

// Create the table + indexes if they don't exist (mirrors ensureExtSchema).
await sql`
  CREATE TABLE IF NOT EXISTS signals (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    source TEXT NOT NULL,
    source_type TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    stance TEXT NOT NULL,
    themes JSONB NOT NULL DEFAULT '[]'::jsonb,
    actor TEXT,
    citations JSONB NOT NULL DEFAULT '[]'::jsonb,
    salience INTEGER,
    confidence REAL,
    observed_at TIMESTAMPTZ,
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    dedupe_key TEXT,
    origin TEXT NOT NULL DEFAULT 'web_search'
  )`;
await sql`CREATE INDEX IF NOT EXISTS idx_signals_campaign ON signals(campaign_id)`;
await sql`CREATE INDEX IF NOT EXISTS idx_signals_source ON signals(source)`;

let done = 0;
for (const s of signals) {
  await sql`
    INSERT INTO signals (
      id, campaign_id, source, source_type, title, summary, stance,
      themes, actor, citations, salience, confidence, observed_at,
      ingested_at, dedupe_key, origin
    ) VALUES (
      ${s.id}, ${s.campaignId}, ${s.source}, ${s.sourceType}, ${s.title},
      ${s.summary}, ${s.stance},
      ${JSON.stringify(s.themes ?? [])}::jsonb,
      ${s.actor ?? null},
      ${JSON.stringify(s.citations ?? [])}::jsonb,
      ${s.salience ?? null}, ${s.confidence ?? null},
      ${s.observedAt ?? null}, ${s.ingestedAt ?? new Date().toISOString()},
      ${s.dedupeKey ?? null}, ${s.origin ?? 'channel'}
    )
    ON CONFLICT (id) DO UPDATE SET
      campaign_id = EXCLUDED.campaign_id,
      source_type = EXCLUDED.source_type,
      title = EXCLUDED.title,
      summary = EXCLUDED.summary,
      stance = EXCLUDED.stance,
      themes = EXCLUDED.themes,
      actor = EXCLUDED.actor,
      citations = EXCLUDED.citations,
      salience = EXCLUDED.salience,
      confidence = EXCLUDED.confidence,
      observed_at = EXCLUDED.observed_at,
      ingested_at = EXCLUDED.ingested_at,
      origin = EXCLUDED.origin`;
  done++;
  if (done % 100 === 0) console.log(`  …${done}/${signals.length}`);
}

const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM signals`;
const rows = await sql`SELECT campaign_id, COUNT(*)::int AS n FROM signals GROUP BY campaign_id ORDER BY n DESC`;
console.log(`\nDone. Upserted ${done} signals. Production now has ${count} total:`);
for (const r of rows) console.log(`  ${r.campaign_id}: ${r.n}`);
