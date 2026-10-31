import type { FormTone } from '@/features/workout/formTone';

import { tokens } from './tokens';

/** Color del borde y del esqueleto según el tono de la forma (`neutral` = sin color). */
export function toneColor(t: FormTone): string {
  return t === 'good' ? tokens.accent : t === 'warn' ? tokens.warn : t === 'bad' ? tokens.danger : 'transparent';
}

/** El manual KYNET pide no comunicar solo con color: cada tono lleva icono y texto. */
export function toneBadge(t: FormTone): { glyph: string; labelKey: string } | null {
  if (t === 'neutral') return null;
  return { glyph: t === 'good' ? '✓' : t === 'warn' ? '!' : '✕', labelKey: `tone.${t}` };
}
