/**
 * Seed Pythia's local data store with the composite Honua Solar project
 * and sampled Energy Equity Docket comments.
 *
 * Run with: npm run db:init
 *
 * Idempotent — re-running does not duplicate records.
 *
 * Loads .env.local explicitly so POSTGRES_URL routes to the right backend
 * (production Postgres if set; local JSON files if not).
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { upsertProject, listProjects, activeBackend } from './db';
import { Project, PublicComment } from './types';

interface CommentsFile {
  _meta: { source: string; note: string; lastUpdated: string };
  comments: PublicComment[];
}

async function main() {
  const seedDir = path.resolve(process.cwd(), 'data', 'seed');
  const briefMd = await fs.readFile(
    path.join(seedDir, 'project-context.md'),
    'utf-8'
  );
  const commentsRaw = await fs.readFile(
    path.join(seedDir, 'docket-2022-0250-comments.json'),
    'utf-8'
  );
  const comments = JSON.parse(commentsRaw) as CommentsFile;

  const project: Project = {
    id: 'honua-solar-storage-demo',
    name: 'Honua Solar & Storage (demo)',
    location: 'Hawai‘i Island, leeward side (composite site)',
    briefMarkdown: briefMd,
    publicComments: comments.comments,
    languages: ['en', 'es', 'tl'],
    researchQuestionIds: [
      'community_ask',
      'community_fears',
      'meaningful_engagement',
      'shared_interests',
      'design_changes',
      'language_culture',
      'governance_oversight',
    ],
    signifierIds: [
      'stance',
      'trust_developer',
      'engagement_respect',
      'community_impact',
      'project_framing',
      'who_decides',
    ],
    photovoiceEnabled: true,
    mappingEnabled: true,
    // Leeward Hawai'i Island composite — Kona-ish coordinates
    mapCenter: { lat: 19.6, lng: -155.97, zoom: 10 },
    createdAt: new Date().toISOString(),
  };

  await upsertProject(project);

  const all = await listProjects();
  console.log(`✅ Seeded ${project.name}`);
  console.log(`   Backend: ${activeBackend}`);
  console.log(`   Projects in store: ${all.length}`);
  console.log(`   Public comments seeded: ${project.publicComments.length}`);
  console.log(`   Source: ${comments._meta.source}`);
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
