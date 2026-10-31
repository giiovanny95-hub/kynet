import { DEFAULT_PREFS, type FitnessLevel } from '@/features/profile/prefs';
import { cachedPrefs } from '@/features/profile/prefsStore';
import type { EngineExercise } from '@/kinematics/engine';

export type Plan = Readonly<Record<EngineExercise, { readonly sets: number; readonly reps: number }>>;

/** Repeticiones por serie según el nivel del onboarding (producto §4.6): sentadilla / jumping jack / flexión. */
const BY_LEVEL: Readonly<Record<FitnessLevel, readonly [number, number, number]>> = {
  beginner: [8, 12, 6],
  regular: [12, 20, 10],
  advanced: [15, 30, 15],
};
const SETS = 3;

export function planFor(level: FitnessLevel): Plan {
  const [squat, jj, pu] = BY_LEVEL[level];
  return { squat: { sets: SETS, reps: squat }, jumpingJack: { sets: SETS, reps: jj }, pushUp: { sets: SETS, reps: pu } };
}

/** Plan del nivel guardado en el perfil (o el de principiante si aún no se cargaron las preferencias). */
export function currentPlan(): Plan {
  return planFor(cachedPrefs()?.fitnessLevel ?? DEFAULT_PREFS.fitnessLevel);
}

export const EXERCISES: readonly EngineExercise[] = ['squat', 'jumpingJack', 'pushUp'];

export function isExercise(x: unknown): x is EngineExercise {
  return typeof x === 'string' && (EXERCISES as readonly string[]).includes(x);
}
