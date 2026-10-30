/** Preferencias del onboarding y del perfil, guardadas en el almacén local (clave `prefs`). */
export type FitnessLevel = 'beginner' | 'regular' | 'advanced';
export type ExerciseView = 'frontal' | 'lateral';
/** Vista elegida por ejercicio (spec-vista-frontal §5); el jumping jack es siempre de frente. */
export interface ExerciseViews {
  readonly squat: ExerciseView;
  readonly pushUp: ExerciseView;
}

export interface Prefs {
  readonly fitnessLevel: FitnessLevel;
  /** Meta orientativa de días por semana (2-5); alimenta la misión semanal de constancia. */
  readonly weeklyGoalDays: number;
  readonly voice: boolean;
  /** Vibración en la interfaz y en el entrenamiento (spec-diseno, E0.4). */
  readonly haptics: boolean;
  readonly birthDate: string | null;
  readonly onboardedAt: string | null;
  readonly medicalAcceptedAt: string | null;
  readonly exerciseView: ExerciseViews;
}

export const DEFAULT_PREFS: Prefs = {
  fitnessLevel: 'beginner',
  weeklyGoalDays: 3,
  voice: true,
  haptics: true,
  birthDate: null,
  onboardedAt: null,
  medicalAcceptedAt: null,
  exerciseView: { squat: 'frontal', pushUp: 'frontal' },
};

const LEVELS: readonly FitnessLevel[] = ['beginner', 'regular', 'advanced'];
const VIEWS: readonly ExerciseView[] = ['frontal', 'lateral'];

function parseViews(v: unknown): ExerciseViews {
  const o = v !== null && typeof v === 'object' ? (v as Record<string, unknown>) : {};
  const pick = (k: keyof ExerciseViews) => (VIEWS.includes(o[k] as ExerciseView) ? (o[k] as ExerciseView) : DEFAULT_PREFS.exerciseView[k]);
  return { squat: pick('squat'), pushUp: pick('pushUp') };
}

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
    haptics: typeof raw.haptics === 'boolean' ? raw.haptics : DEFAULT_PREFS.haptics,
    birthDate: str('birthDate'),
    onboardedAt: str('onboardedAt'),
    medicalAcceptedAt: str('medicalAcceptedAt'),
    exerciseView: parseViews(raw.exerciseView),
  };
}
