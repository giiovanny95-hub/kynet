/** Preferencias del onboarding y del perfil, guardadas en el almacén local (clave `prefs`). */
export type FitnessLevel = 'beginner' | 'regular' | 'advanced';

export interface Prefs {
  readonly fitnessLevel: FitnessLevel;
  /** Meta orientativa de días por semana (2-5); alimenta la misión semanal de constancia. */
  readonly weeklyGoalDays: number;
  readonly voice: boolean;
  readonly birthDate: string | null;
  readonly onboardedAt: string | null;
  readonly medicalAcceptedAt: string | null;
}

export const DEFAULT_PREFS: Prefs = {
  fitnessLevel: 'beginner',
  weeklyGoalDays: 3,
  voice: true,
  birthDate: null,
  onboardedAt: null,
  medicalAcceptedAt: null,
};

const LEVELS: readonly FitnessLevel[] = ['beginner', 'regular', 'advanced'];

export function parsePrefs(json: string | null): Prefs {
  let raw: Record<string, unknown> = {};
  try {
    const v: unknown = json === null ? {} : JSON.parse(json);
    if (v !== null && typeof v === 'object') raw = v as Record<string, unknown>;
  } catch {
    return DEFAULT_PREFS;
  }
  const str = (k: string) => (typeof raw[k] === 'string' ? (raw[k] as string) : null);
  const goal = raw.weeklyGoalDays;
  return {
    fitnessLevel: LEVELS.includes(raw.fitnessLevel as FitnessLevel) ? (raw.fitnessLevel as FitnessLevel) : DEFAULT_PREFS.fitnessLevel,
    weeklyGoalDays: typeof goal === 'number' && Number.isInteger(goal) && goal >= 2 && goal <= 5 ? goal : DEFAULT_PREFS.weeklyGoalDays,
    voice: typeof raw.voice === 'boolean' ? raw.voice : DEFAULT_PREFS.voice,
    birthDate: str('birthDate'),
    onboardedAt: str('onboardedAt'),
    medicalAcceptedAt: str('medicalAcceptedAt'),
  };
}
