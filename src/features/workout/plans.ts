import type { EngineExercise } from '@/kinematics/engine';

/** Series y repeticiones por defecto del MVP (sin selector todavía). */
export const DEFAULT_PLAN: Readonly<Record<EngineExercise, { readonly sets: number; readonly reps: number }>> = {
  squat: { sets: 3, reps: 10 },
  jumpingJack: { sets: 3, reps: 20 },
  pushUp: { sets: 3, reps: 8 },
};

export const EXERCISES: readonly EngineExercise[] = ['squat', 'jumpingJack', 'pushUp'];

export function isExercise(x: unknown): x is EngineExercise {
  return typeof x === 'string' && (EXERCISES as readonly string[]).includes(x);
}
