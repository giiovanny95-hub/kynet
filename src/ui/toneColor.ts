import type { FormTone } from '@/features/workout/formTone';

import { tokens } from './tokens';

/** Color del borde y del esqueleto según el tono de la forma (`neutral` = sin color). */
export function toneColor(t: FormTone): string {
  return t === 'good' ? tokens.accent : t === 'warn' ? tokens.warn : t === 'bad' ? tokens.danger : 'transparent';
}
