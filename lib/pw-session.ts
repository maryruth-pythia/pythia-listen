/**
 * Signed session token for the shared-password gate (legacy password mode).
 * Instead of storing the raw PYTHIA_PASSWORD in the auth cookie, we store an
 * HMAC-signed token: proof the holder logged in with the correct password,
 * WITHOUT the cookie containing the password itself. Uses Web Crypto so it runs
 * in Edge middleware and Node routes alike. The password doubles as the signing
 * key (no new env var needed).
 *
 * NOTE: distinct from lib/session.ts, which is the Better Auth session/org seam
 * used once per-org accounts are enabled.
 */
const MSG_PREFIX = 'pythia-session-v1:';
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // server-side token lifetime

async function hmacHex(secret: string, msg: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(msg));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Mint a signed cookie value for a freshly-authenticated session. */
export async function signSession(secret: string): Promise<string> {
  const iatStr = String(Date.now());
  const sig = await hmacHex(secret, MSG_PREFIX + iatStr);
  return `${iatStr}.${sig}`;
}

/** Verify a cookie value. Returns false for any tampering or expiry. */
export async function verifySession(
  token: string | undefined,
  secret: string
): Promise<boolean> {
  if (!token) return false;
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return false;
  const iatStr = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const iat = Number(iatStr);
  if (!Number.isFinite(iat) || Date.now() - iat > MAX_AGE_MS) return false;
  const expected = await hmacHex(secret, MSG_PREFIX + iatStr);
  if (sig.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
