import type { ExerciseSpec } from '../fsm/machine';
import type { ScoredExercise } from '../scoring/tempo';
import type { ModelSpec } from '../types';

/** Perfil de calibración versionado (spec §5.5). Lo guarda la app; aquí solo se aplica. */
export interface CalibrationProfile {
  readonly v: 1;
  readonly exercise: ScoredExercise;
  readonly view: 'lateral' | 'frontal';
  readonly modelId: ModelSpec['id'];
  readonly side: 'l' | 'r' | null;
  readonly extremeThr: number;
  readonly startThr: number;
  readonly exitThr: number;
  readonly tauCal: number | null;
  readonly dCalS: number;
  /** Jumping jack: umbrales del abierto. */
  readonly alphaU?: number;
  readonly rhoU?: number;
}

export function defaultView(exercise: ScoredExercise): 'lateral' | 'frontal' {
  'worklet';
  return exercise === 'jumpingJack' ? 'frontal' : 'lateral';
}

/** Umbrales personalizados sobre la tabla del ejercicio. */
export function applyProfile(spec: ExerciseSpec, p: CalibrationProfile): ExerciseSpec {
  'worklet';
  return { ...spec, extremeThr: p.extremeThr, startThr: p.startThr, exitThr: p.exitThr };
}

/** Un perfil deja de valer si cambia el modelo, el ejercicio o la vista (§5.5). */
export function isProfileValid(
  p: CalibrationProfile,
  cfg: { readonly exercise: ScoredExercise; readonly model: ModelSpec; readonly view?: 'lateral' | 'frontal' },
): boolean {
  'worklet';
  return p.v === 1 && p.modelId === cfg.model.id && p.exercise === cfg.exercise && p.view === (cfg.view ?? defaultView(cfg.exercise));
}
