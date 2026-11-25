/**
 * Invite codes tied to ONE named org, for client pilots. The first person to use the code
 * creates the org (and owns it); everyone after joins it as a member, so a client's
 * colleagues all land in the same workspace. Boards are shared with the org by slug
 * (Campaign.orgSlug). The code itself lives in an env var, never in the repo.
 *
 * Generic codes (PYTHIA_INVITE_CODES) still create a brand-new org named by the user.
 */
export interface OrgInvite {
  slug: string;
  name: string;
  /** Env var holding this org's invite code (comma-separated for several). */
  codeEnv: string;
  /** Env var holding pre-approved member emails (comma-separated). They join on first sign-in,
   * with no code to type. Kept out of the repo. */
  membersEnv: string;
  /** Where members land after joining. */
  home: string;
}

export const ORG_INVITES: OrgInvite[] = [
  // Example:
  // {
  //   slug: 'example-org',
  //   name: 'Example Org',
  //   codeEnv: 'PYTHIA_ORG_CODE_EXAMPLE',
  //   membersEnv: 'PYTHIA_ORG_MEMBERS_EXAMPLE',
  //   home: '/operator/dashboard',
  // },
];

export function matchOrgInvite(code: string): OrgInvite | null {
  const c = code.trim().toLowerCase();
  if (!c) return null;
  return (
    ORG_INVITES.find((o) =>
      (process.env[o.codeEnv] ?? '')
        .split(',')
        .map((x) => x.trim().toLowerCase())
        .filter(Boolean)
        .includes(c)
    ) ?? null
  );
}

/** The client org that has pre-approved this email, if any. */
export function matchOrgByEmail(email: string | undefined): OrgInvite | null {
  const e = (email ?? '').trim().toLowerCase();
  if (!e) return null;
  return (
    ORG_INVITES.find((o) =>
      (process.env[o.membersEnv] ?? '')
        .split(',')
        .map((x) => x.trim().toLowerCase())
        .filter(Boolean)
        .includes(e)
    ) ?? null
  );
}
