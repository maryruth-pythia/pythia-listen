/**
 * Single source of truth for turning a language CODE into an English language
 * NAME the model understands. Explicit map wins (nicer labels like
 * "Tagalog (Filipino)"); otherwise Intl.DisplayNames resolves ANY language, so
 * the app is not limited to the handful wired into the picker today. Unknown
 * codes fall back to English.
 */
const EXPLICIT: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  tl: 'Tagalog (Filipino)',
  pt: 'Portuguese',
  hi: 'Hindi',
};

export function languageName(code?: string): string {
  const c = (code || 'en').trim();
  if (EXPLICIT[c]) return EXPLICIT[c];
  try {
    const n = new Intl.DisplayNames(['en'], { type: 'language' }).of(c);
    if (n && n.toLowerCase() !== c.toLowerCase()) return n;
  } catch {
    /* Intl may not know the code; fall through */
  }
  return c || 'English';
}
