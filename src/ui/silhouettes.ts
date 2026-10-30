import type { EngineExercise } from '@/kinematics/engine';

type Pt = readonly [index: number, x: number, y: number];

// Posturas de referencia en coordenadas normalizadas del cuadro vertical (índices BlazePose33), por encima del panel inferior.
const SQUAT_SIDE: readonly Pt[] = [
  [0, 0.53, 0.15], [11, 0.5, 0.2], [12, 0.49, 0.2], [13, 0.51, 0.31], [14, 0.5, 0.31], [15, 0.52, 0.4], [16, 0.51, 0.4],
  [23, 0.5, 0.41], [24, 0.49, 0.41], [25, 0.51, 0.55], [26, 0.5, 0.55], [27, 0.5, 0.68], [28, 0.49, 0.68], [31, 0.56, 0.7], [32, 0.55, 0.7],
];
const JJ_FRONT: readonly Pt[] = [
  [0, 0.5, 0.15], [11, 0.4, 0.2], [12, 0.6, 0.2], [13, 0.37, 0.3], [14, 0.63, 0.3], [15, 0.36, 0.39], [16, 0.64, 0.39],
  [23, 0.44, 0.41], [24, 0.56, 0.41], [25, 0.44, 0.55], [26, 0.56, 0.55], [27, 0.44, 0.68], [28, 0.56, 0.68], [31, 0.42, 0.7], [32, 0.58, 0.7],
];
const PUSHUP_SIDE: readonly Pt[] = [
  [0, 0.82, 0.45], [11, 0.75, 0.47], [12, 0.74, 0.47], [13, 0.75, 0.53], [14, 0.74, 0.53], [15, 0.75, 0.6], [16, 0.74, 0.6],
  [23, 0.45, 0.5], [24, 0.44, 0.5], [25, 0.3, 0.53], [26, 0.29, 0.53], [27, 0.15, 0.57], [28, 0.14, 0.57], [31, 0.13, 0.6], [32, 0.12, 0.6],
];

const POSES: Readonly<Record<EngineExercise, readonly Pt[]>> = { squat: SQUAT_SIDE, jumpingJack: JJ_FRONT, pushUp: PUSHUP_SIDE };

/** Silueta guía de la colocación, con el formato de landmarks del módulo nativo (33 × x, y, z, v). */
export function silhouetteFor(exercise: EngineExercise): Float32Array {
  const flat = new Float32Array(132);
  for (const [i, x, y] of POSES[exercise]) flat.set([x, y, 0, 1], i * 4);
  return flat;
}
