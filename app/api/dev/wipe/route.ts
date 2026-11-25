import { NextResponse } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export const dynamic = 'force-dynamic';

/**
 * POST /api/dev/wipe
 *
 * Dev convenience. Removes all runtime data (sessions, messages, synthesis,
 * reports) but preserves projects so you don't have to re-seed.
 *
 * Disabled in production via the NODE_ENV guard.
 */
export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Disabled in production.' },
      { status: 403 }
    );
  }

  const dir = process.env.PYTHIA_DATA_DIR
    ? path.resolve(process.env.PYTHIA_DATA_DIR)
    : path.resolve(process.cwd(), 'data', 'runtime');

  // Wipe everything except projects.json.
  const filesToWipe = ['sessions.json', 'messages.json', 'synthesis_runs.json', 'reports.json'];
  for (const f of filesToWipe) {
    try {
      await fs.unlink(path.join(dir, f));
    } catch {
      /* missing is fine */
    }
  }

  return NextResponse.json({ ok: true, wiped: filesToWipe });
}
