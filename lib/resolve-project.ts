/**
 * Unified project read (unification Step 2). Resolves a Project from the
 * original project store, and FALLS BACK to a Project (what the code still
 * calls a "campaign") adapted into the Project shape. This bridges the two
 * stores at the read layer with NO data migration — every project works
 * everywhere a Project was expected, carrying its background publicComments.
 */
import { getProject } from './db';
import { getCampaignById, type Campaign } from './campaigns';
import type { Project, Language } from './types';

const LANGS: readonly string[] = ['en', 'es', 'tl'];

export function campaignToProject(c: Campaign): Project {
  const languages = (c.languages ?? []).filter((l): l is Language => LANGS.includes(l));
  return {
    id: c.id,
    name: c.name,
    location: c.jurisdiction ?? '',
    briefMarkdown:
      c.briefMarkdown?.trim() ||
      [c.meta, c.blurb].filter(Boolean).join('\n\n') ||
      c.routing ||
      '',
    publicComments: c.publicComments ?? [],
    languages: languages.length ? languages : ['en'],
    createdAt: new Date(0).toISOString(),
  };
}

export async function resolveProject(id: string): Promise<Project | null> {
  const p = await getProject(id);
  if (p) return p;
  const c = await getCampaignById(id);
  return c ? campaignToProject(c) : null;
}
