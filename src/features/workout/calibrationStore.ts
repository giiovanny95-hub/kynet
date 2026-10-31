import type { CalibrationProfile } from '@/kinematics/calibration/profile';
import type { EngineExercise } from '@/kinematics/engine';

/**
 * Perfiles de calibración en memoria mientras la app está abierta (la parte 5 los guardará en SQLite).
 * `null` = el usuario eligió los valores estándar.
 */
const profiles = new Map<EngineExercise, CalibrationProfile | null>();

export function getProfile(exercise: EngineExercise): CalibrationProfile | null | undefined {
  return profiles.get(exercise);
}

export function setProfile(exercise: EngineExercise, profile: CalibrationProfile | null): void {
  profiles.set(exercise, profile);
}
