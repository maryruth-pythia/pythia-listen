/**
 * Minimal Resend transactional-email sender (zero-dep fetch). Env-gated:
 * needs RESEND_API_KEY + EMAIL_FROM. Returns false (never throws) when
 * unconfigured or on error. Reused for cost-monitor alerts and, later, the
 * Better Auth magic-link / invite emails.
 */
export function emailConfigured(): boolean {
  return !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return false;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from,
        to: opts.to,
        subject: opts.subject,
        text: opts.text,
        ...(opts.html ? { html: opts.html } : {}),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
