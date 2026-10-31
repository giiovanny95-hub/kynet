import type { EngineExercise } from '@/kinematics/engine';
import { DEFAULT_PREFS, type ExerciseView, type Prefs } from '@/features/profile/prefs';

/** Nombre del archivo en `assets/guides/` (sin extensión); el `require` vive en `src/ui/guideAssets.ts`. */
export type GuideKey = 'jumping-jack' | 'squat' | 'push-up';
export interface GuideEntry {
  readonly key: GuideKey;
  /** Duración del bucle, sumando los retardos de los cuadros (H1). */
  readonly loopMs: number;
}
/** Por ejercicio: una guía común (`any`) o una por vista; la de la vista gana. */
export type GuideManifest = Record<EngineExercise, Partial<Record<ExerciseView | 'any', GuideEntry>>>;

/** Guías del usuario (plan diseño v2, H1). Una sola animación por ejercicio sirve para las dos vistas. */
export const GUIDE_MANIFEST: GuideManifest = {
  jumpingJack: { any: { key: 'jumping-jack', loopMs: 4800 } },
  squat: { any: { key: 'squat', loopMs: 4800 } },
  pushUp: { any: { key: 'push-up', loopMs: 4800 } },
};

export function guideFor(exercise: EngineExercise, view: ExerciseView, manifest: GuideManifest = GUIDE_MANIFEST): GuideEntry | null {
  const m = manifest[exercise];
  return m[view] ?? m.any ?? null;
}

/** "Así se hace" antes de la colocación, cada vez que se empieza el ejercicio, con ayudas activas y si hay guía (decisión del usuario, 2026-10-31). */
export function shouldShowFirstGuide(prefs: Prefs | null, exercise: EngineExercise, view: ExerciseView, manifest: GuideManifest = GUIDE_MANIFEST): boolean {
  const p = prefs ?? DEFAULT_PREFS;
  return p.techniqueHelp && guideFor(exercise, view, manifest) !== null;
}
