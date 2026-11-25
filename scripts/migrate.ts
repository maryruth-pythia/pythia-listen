/**
 * Postgres migration. Creates Pythia's schema if it doesn't exist.
 *
 * Run once after provisioning Vercel/Neon Postgres:
 *   POSTGRES_URL=postgresql://... npm run db:migrate
 *
 * Idempotent — uses CREATE TABLE IF NOT EXISTS.
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

import { neon } from '@neondatabase/serverless';

async function main() {
  const url = process.env.POSTGRES_URL ?? process.env.DATABASE_URL ?? '';
  if (!url) {
    console.error(
      '❌ POSTGRES_URL is not set. Migration is only needed in production deployments.\n' +
        '   Local dev uses JSON file storage and does not need migration.'
    );
    process.exit(1);
  }

  const sql = neon(url);

  console.log('→ Creating Pythia schema in Postgres…');

  await sql`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      brief_markdown TEXT NOT NULL,
      public_comments JSONB NOT NULL,
      languages TEXT[] NOT NULL,
      research_question_ids JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  // Idempotent ALTERs for existing deployments
  await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS research_question_ids JSONB`;
  await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS signifier_ids JSONB`;
  await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS photovoice_enabled BOOLEAN DEFAULT FALSE`;
  await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS mapping_enabled BOOLEAN DEFAULT FALSE`;
  await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS map_center JSONB`;

  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      language TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      participation_consent_state TEXT,
      participation_consent_at TIMESTAMPTZ,
      demographics JSONB,
      identification TEXT,
      consent JSONB
    )
  `;
  // Idempotent ALTERs for existing deployments
  await sql`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS participation_consent_state TEXT`;
  await sql`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS participation_consent_at TIMESTAMPTZ`;
  await sql`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS demographics JSONB`;
  await sql`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS signifier_responses JSONB`;
  await sql`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS photovoice_entries JSONB`;
  await sql`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS map_pins JSONB`;
  await sql`CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status)`;

  await sql`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      stage TEXT
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id)`;

  await sql`
    CREATE TABLE IF NOT EXISTS synthesis_runs (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      included_session_ids JSONB NOT NULL,
      output_markdown TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_synthesis_project ON synthesis_runs(project_id)`;

  await sql`
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      session_id TEXT REFERENCES sessions(id) ON DELETE CASCADE,
      synthesis_run_id TEXT REFERENCES synthesis_runs(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      content_markdown TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_reports_session ON reports(session_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_reports_synthesis ON reports(synthesis_run_id)`;

  // Signals — normalized cross-source unit (civic / desk / pythia buckets).
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
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_signals_campaign ON signals(campaign_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_signals_source ON signals(source)`;

  // Ingestion runs — one row per ingestion pass, for the sync log.
  await sql`
    CREATE TABLE IF NOT EXISTS ingestion_runs (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      source TEXT NOT NULL,
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      finished_at TIMESTAMPTZ,
      status TEXT NOT NULL,
      model TEXT,
      collected INTEGER NOT NULL DEFAULT 0,
      created INTEGER NOT NULL DEFAULT 0,
      updated INTEGER NOT NULL DEFAULT 0,
      search_queries JSONB,
      error TEXT,
      notes TEXT
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_ingestion_campaign ON ingestion_runs(campaign_id)`;

  // Monitored sources — operator/agent-chosen websites for the civic bucket.
  await sql`
    CREATE TABLE IF NOT EXISTS monitored_sources (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      url TEXT NOT NULL,
      label TEXT,
      rationale TEXT,
      added_by TEXT NOT NULL DEFAULT 'manual',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_monitored_campaign ON monitored_sources(campaign_id)`;

  console.log('✅ Schema ready.');
  console.log('   Next: seed the demo project with `npm run db:init`');
}

main().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
