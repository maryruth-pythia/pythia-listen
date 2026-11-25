import { en } from './en';
import { es } from './es';
import { tl } from './tl';
import { pt } from './pt';
import type { Language } from '../types';

export function copyFor(lang: Language) {
  if (lang === 'es') return es;
  if (lang === 'tl') return tl;
  if (lang === 'pt') return pt;
  return en;
}

export type Copy = ReturnType<typeof copyFor>;
