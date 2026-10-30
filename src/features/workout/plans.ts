import type { FitnessLevel } from '@/features/profile/prefs';
import type { EngineExercise } from '@/kinematics/engine';

/** Series y repeticiones por defecto del MVP (sin selector todavía). */
export const DEFAULT_PLAN: Readonly<Record<EngineExercise, { readonly sets: number; readonly reps: number }>> = {
  squat: { sets: 3, reps: 10 },
  jumpingJack: { sets: 3, reps: 20 },
  pushUp: { sets: 3, reps: 8 },
};

type Plan = Readonly<Record<EngineExercise, { readonly sets: number; readonly reps: number }>>;

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

export const EXERCISES: readonly EngineExercise[] = ['squat', 'jumpingJack', 'pushUp'];

export function isExercise(x: unknown): x is EngineExercise {
  return typeof x === 'string' && (EXERCISES as readonly string[]).includes(x);
}
