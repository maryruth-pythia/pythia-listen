/**
 * Lightweight RELEASE flags — temporary gates, not permanent config.
 *
 * A flag hides a feature that's ready in the sandbox but not yet meant for the
 * live site. It reads an env var: FEATURE_<NAME>=on turns it on; anything else
 * (or unset) is off.
 *
 * Lifecycle (see claude/pythia-feature-flags.md for the live list + steps):
 *   1. Build the feature wrapped in featureOn('name').
 *   2. Vercel: set FEATURE_<NAME>=on scoped to Preview  -> live in the sandbox only.
 *   3. Promote: add the same var to Production, redeploy -> live for everyone.
 *   4. RETIRE: once it's live and stable, delete the featureOn() call(s) so the
 *      feature is just permanent code, remove the env var in Vercel, and drop the
 *      row from the registry doc. This keeps the flag list short.
 *
 * Server-side only (routes, server components). Next.js inlines only statically
 * referenced NEXT_PUBLIC_ vars into client code, so a dynamic lookup like this
 * can't run in the browser. For a UI feature, call featureOn() in the server
 * component and pass the boolean down as a prop.
 */
export function featureOn(name: string): boolean {
  const key = 'FEATURE_' + name.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
  return process.env[key] === 'on';
}
