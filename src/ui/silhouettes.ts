import type { EngineExercise } from '@/kinematics/engine';

type Pt = readonly [index: number, x: number, y: number];

// Posturas de referencia en coordenadas normalizadas del cuadro vertical (índices BlazePose33).
const SQUAT_SIDE: readonly Pt[] = [
  [0, 0.53, 0.15], [11, 0.5, 0.25], [12, 0.49, 0.25], [13, 0.51, 0.39], [14, 0.5, 0.39], [15, 0.52, 0.51], [16, 0.51, 0.51],
  [23, 0.5, 0.52], [24, 0.49, 0.52], [25, 0.51, 0.7], [26, 0.5, 0.7], [27, 0.5, 0.88], [28, 0.49, 0.88], [31, 0.56, 0.9], [32, 0.55, 0.9],
];
const JJ_FRONT: readonly Pt[] = [
  [0, 0.5, 0.15], [11, 0.4, 0.25], [12, 0.6, 0.25], [13, 0.37, 0.38], [14, 0.63, 0.38], [15, 0.36, 0.5], [16, 0.64, 0.5],
  [23, 0.44, 0.52], [24, 0.56, 0.52], [25, 0.44, 0.7], [26, 0.56, 0.7], [27, 0.44, 0.88], [28, 0.56, 0.88], [31, 0.42, 0.9], [32, 0.58, 0.9],
];
const PUSHUP_SIDE: readonly Pt[] = [
  [0, 0.82, 0.6], [11, 0.75, 0.62], [12, 0.74, 0.62], [13, 0.75, 0.7], [14, 0.74, 0.7], [15, 0.75, 0.78], [16, 0.74, 0.78],
  [23, 0.45, 0.66], [24, 0.44, 0.66], [25, 0.3, 0.7], [26, 0.29, 0.7], [27, 0.15, 0.74], [28, 0.14, 0.74], [31, 0.13, 0.78], [32, 0.12, 0.78],
];

const POSES: Readonly<Record<EngineExercise, readonly Pt[]>> = { squat: SQUAT_SIDE, jumpingJack: JJ_FRONT, pushUp: PUSHUP_SIDE };

/** Silueta guía de la colocación, con el formato de landmarks del módulo nativo (33 × x, y, z, v). */
export function silhouetteFor(exercise: EngineExercise): Float32Array {
  const flat = new Float32Array(132);
  for (const [i, x, y] of POSES[exercise]) flat.set([x, y, 0, 1], i * 4);
  return flat;
}
