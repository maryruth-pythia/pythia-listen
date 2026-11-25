/**
 * Lightweight rate limiter backed by the app's existing DB-backed cache
 * (Postgres in prod / JSON locally), so it works across serverless instances
 * with no new dependency. Fails OPEN on any store error — a cache hiccup must
 * never lock legitimate users out.
 */
import { getCache, setCache, clearCache } from './db';

type Bucket = { count: number; firstAt: number };

export type RateResult = { ok: boolean; remaining: number; retryAfterSec: number };

async function read(key: string, windowMs: number): Promise<Bucket> {
  const now = Date.now();
  try {
    const hit = await getCache(`ratelimit:${key}`);
    const v = hit?.value as Bucket | undefined;
    if (v && typeof v.firstAt === 'number' && now - v.firstAt < windowMs) {
      return { count: v.count ?? 0, firstAt: v.firstAt };
    }
  } catch {
    /* fail open */
  }
  return { count: 0, firstAt: now };
}

/** Check the limit WITHOUT recording an attempt. */
export async function rateLimit(
  key: string,
  opts: { max: number; windowMs: number }
): Promise<RateResult> {
  const b = await read(key, opts.windowMs);
  const retryAfterSec = Math.max(
    1,
    Math.ceil((b.firstAt + opts.windowMs - Date.now()) / 1000)
  );
  if (b.count >= opts.max) return { ok: false, remaining: 0, retryAfterSec };
  return { ok: true, remaining: opts.max - b.count, retryAfterSec };
}

/** Record one attempt against the key's current window. */
export async function rateLimitHit(key: string, windowMs: number): Promise<void> {
  const b = await read(key, windowMs);
  try {
    await setCache(`ratelimit:${key}`, { count: b.count + 1, firstAt: b.firstAt });
  } catch {
    /* fail open */
  }
}

/** Clear a key's counter (e.g. after a successful login). */
export async function rateLimitReset(key: string): Promise<void> {
  try {
    await clearCache(`ratelimit:${key}`);
  } catch {
    /* non-fatal */
  }
}
