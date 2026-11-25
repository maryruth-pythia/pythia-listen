/**
 * AI spend monitor. Accrues the USD cost of model calls into a per-day bucket
 * (in the shared DB cache) and emails ONE soft warning the first time the day's
 * total crosses a threshold. Soft only — nothing is ever blocked. Fully
 * fail-safe: a monitoring error must never break an AI call.
 *
 * Config (all optional; without an alert email it just tracks silently):
 *   COST_ALERT_DAILY_USD  — threshold in USD (default 5)
 *   COST_ALERT_EMAIL      — where to send the warning
 *   RESEND_API_KEY / EMAIL_FROM — the email rail (see lib/email/resend.ts)
 */
import { getCache, setCache } from './db';
import { sendEmail } from './email/resend';

const DAILY_LIMIT_USD = Number(process.env.COST_ALERT_DAILY_USD ?? '5');

function dayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

type Bucket = { total: number; byLabel: Record<string, number> };

/** Record the cost of one AI call and fire a one-per-day warning if over budget. */
export async function recordCost(costUsd: number | undefined, label = 'ai'): Promise<void> {
  if (!costUsd || !Number.isFinite(costUsd) || costUsd <= 0) return;
  try {
    const day = dayKey();
    const key = `costmon:${day}`;
    const prev = ((await getCache(key))?.value as Bucket | undefined) ?? { total: 0, byLabel: {} };
    const total = (prev.total ?? 0) + costUsd;
    const byLabel = { ...(prev.byLabel ?? {}) };
    byLabel[label] = (byLabel[label] ?? 0) + costUsd;
    await setCache(key, { total, byLabel });

    const alertEmail = process.env.COST_ALERT_EMAIL;
    if (total >= DAILY_LIMIT_USD && alertEmail) {
      const alertedKey = `costmon:alerted:${day}`;
      if (!(await getCache(alertedKey))) {
        await setCache(alertedKey, { at: Date.now() });
        const lines = Object.entries(byLabel)
          .sort((a, b) => b[1] - a[1])
          .map(([k, v]) => `  ${k}: $${v.toFixed(2)}`)
          .join('\n');
        await sendEmail({
          to: alertEmail,
          subject: `Pythia AI spend passed $${DAILY_LIMIT_USD} today ($${total.toFixed(2)})`,
          text:
            `Heads up — Pythia's AI usage crossed your daily alert threshold.\n\n` +
            `Today (${day}, UTC) so far: $${total.toFixed(2)} (threshold $${DAILY_LIMIT_USD.toFixed(2)}).\n\n` +
            `Breakdown:\n${lines}\n\n` +
            `This is a soft warning only — nothing was blocked. If this looks off, check for a runaway job.`,
        });
      }
    }
  } catch {
    /* monitoring must never break an AI call */
  }
}

/** Today's accrued AI spend (USD), for any future dashboard readout. */
export async function getTodayCost(): Promise<number> {
  try {
    const b = (await getCache(`costmon:${dayKey()}`))?.value as Bucket | undefined;
    return b?.total ?? 0;
  } catch {
    return 0;
  }
}
