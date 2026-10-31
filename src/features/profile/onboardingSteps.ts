import type { Prefs } from './prefs';

/**
 * Paso del onboarding tras entrar con "Ya tengo cuenta" (plan diseño v2, H6). La edad nunca se salta: sin fecha de
 * nacimiento local se pide aunque haya sesión.
 */
export function stepAfterLogin(prefs: Prefs): 'birth' | 'level' | 'done' {
  if (prefs.birthDate === null) return 'birth';
  return prefs.onboardedAt === null ? 'level' : 'done';
}
