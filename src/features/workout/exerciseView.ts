import type { EngineExercise } from '@/kinematics/engine';
import { DEFAULT_PREFS, type ExerciseView, type Prefs } from '@/features/profile/prefs';

/**
 * Vista con la que corre el motor (spec-vista-frontal §5). El jumping jack es siempre de frente. La flexión de frente
 * aún no está implementada (F3), así que sigue de lado aunque la preferencia diga frente.
 */
export function effectiveView(exercise: EngineExercise, prefs: Prefs | null): ExerciseView {
  if (exercise === 'jumpingJack') return 'frontal';
  if (exercise === 'pushUp') return 'lateral';
  return (prefs ?? DEFAULT_PREFS).exerciseView.squat;
}
