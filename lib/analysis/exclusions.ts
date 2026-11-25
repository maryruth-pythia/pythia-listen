/**
 * Turn an operator's free-text "what to ignore" instruction into a clean list
 * of phrases the deterministic filters can match — using AI to understand plain
 * language, so no quotes or special punctuation are needed. e.g.
 *   "ignore anything about past bitterness or the job market"
 *     -> ["past bitterness", "job market"]
 *
 * Cached by the instruction text (KV), so it's one cheap model call per unique
 * instruction — not on every dashboard load. Falls back to a regex parse if the
 * model is unavailable.
 */
import { complete } from '@/lib/claude';
import { getCache, setCache } from '@/lib/db';
import { createHash } from 'crypto';

function fallbackParse(text: string): string[] {
  const t = text.toLowerCase();
  const quoted = Array.from(
    t.matchAll(/["'“”‘’]([^"'“”‘’]+)["'“”‘’]/g)
  ).map((m) => m[1].trim());
  const parts = quoted.length
    ? quoted
    : t
        .split(/[,;\n]+|\band\b|\bor\b/)
        .map((k) => k.replace(/^\s*(ignore|exclude|omit|drop|skip|anything about|about)\s+/g, '').trim());
  return parts.filter((k) => k.length >= 3).slice(0, 12);
}

function parseJsonArray(raw: string): unknown[] {
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  const a = s.indexOf('['), b = s.lastIndexOf(']');
  if (a !== -1 && b > a) {
    try { const v = JSON.parse(s.slice(a, b + 1)); if (Array.isArray(v)) return v; } catch { /* noop */ }
  }
  return [];
}

export async function parseExclusionPhrases(raw?: string): Promise<string[]> {
  const text = (raw || '').trim();
  if (!text) return [];
  const key = 'exclparse:' + createHash('sha1').update(text.toLowerCase()).digest('hex').slice(0, 16);
  const hit = await getCache(key);
  if (hit && Array.isArray(hit.value)) return hit.value as string[];

  const fallback = fallbackParse(text);
  try {
    const out = await complete({
      messages: [{
        role: 'user',
        content:
          `An operator wrote this instruction for what to EXCLUDE from an analysis of community signals:\n"${text}"\n\n` +
          `Extract the specific topics or phrases they want ignored. Return ONLY a JSON array of short lowercase phrases ` +
          `(2-4 words each) that would appear in the text of items to drop, e.g. ["past bitterness","job market"]. No commentary.`,
      }],
      maxTokens: 300,
      temperature: 0,
    });
    const arr = parseJsonArray(out)
      .map((x) => String(x).toLowerCase().trim())
      .filter((x) => x.length >= 3)
      .slice(0, 12);
    const result = arr.length ? arr : fallback;
    await setCache(key, result);
    return result;
  } catch {
    return fallback;
  }
}
