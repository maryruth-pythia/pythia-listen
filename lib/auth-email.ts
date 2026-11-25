/**
 * Transactional email for the accounts system (magic-link login + org invites).
 *
 * Uses Resend's REST API directly (no SDK dependency). If RESEND_API_KEY is
 * unset — e.g. local dev — it falls back to logging the link to the server
 * console so you can still complete a sign-in/invite without a mail provider.
 *
 * No raw email addresses are logged in production paths; the dev fallback is
 * gated on NODE_ENV !== 'production'.
 */

const FROM = process.env.EMAIL_FROM ?? 'Pythia <login@pythia.local>';
const RESEND_KEY = process.env.RESEND_API_KEY;

async function send(to: string, subject: string, html: string): Promise<void> {
  if (!RESEND_KEY) {
    if (process.env.NODE_ENV !== 'production') {
      // Dev convenience: surface the link so you can click through without a mailer.
      console.log(`\n[auth-email:dev] To: ${to}\n[auth-email:dev] ${subject}\n[auth-email:dev] ${html}\n`);
      return;
    }
    throw new Error('RESEND_API_KEY is not set; cannot send auth email in production.');
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Resend send failed (${res.status}): ${detail}`);
  }
}

export async function sendMagicLinkEmail(email: string, url: string): Promise<void> {
  await send(
    email,
    'Your Pythia sign-in link',
    [
      '<p>Click to sign in to Pythia:</p>',
      `<p><a href="${url}">Sign in</a></p>`,
      '<p>This link expires shortly and can be used once. If you did not request it, ignore this email.</p>',
    ].join('')
  );
}

export async function sendOrgInvitationEmail(
  email: string,
  inviteUrl: string,
  orgName?: string,
  inviterName?: string
): Promise<void> {
  const who = inviterName ? `${inviterName} invited you` : 'You have been invited';
  const org = orgName ? ` to join ${orgName} on Pythia` : ' to join a team on Pythia';
  await send(
    email,
    `Invitation to join${orgName ? ` ${orgName}` : ''} on Pythia`,
    [
      `<p>${who}${org}.</p>`,
      `<p><a href="${inviteUrl}">Accept invitation</a></p>`,
      '<p>If you were not expecting this, you can ignore this email.</p>',
    ].join('')
  );
}
