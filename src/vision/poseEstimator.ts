import { emptyPoseFrame, fromFlat } from '@/kinematics/landmarks/adapter';
import { BLAZEPOSE33 } from '@/kinematics/landmarks/models/blazepose33';
import type { FrameMeta, PoseFrame } from '@/kinematics/types';

import { POSE_FLOATS } from './poseExtras';

/** Estimador de pose usado por la pantalla de entrenamiento. Corre dentro del worklet de cámara. */
export interface PoseEstimator {
  readonly model: 'blazepose33' | 'movenet17';
  estimate(frame: unknown, meta: FrameMeta): PoseFrame | null;
}

/**
 * Convierte la salida del módulo nativo (33 × x, y, z, visibilidad) en un `PoseFrame`.
 * `undefined` (no hay persona) produce un cuadro vacío, que el motor trata como visibilidad nula.
 * En modo `LIVE_STREAM` el módulo añade 2 valores tras los landmarks (ver `poseExtras.ts`); aquí se ignoran.
 */
export function toPoseFrame(flat: Float32Array | undefined, meta: FrameMeta): PoseFrame {
  'worklet';
  if (flat === undefined) return emptyPoseFrame(meta, BLAZEPOSE33);
  if (flat.length !== POSE_FLOATS && flat.length !== POSE_FLOATS + 2) {
    throw new RangeError(`El módulo nativo debe devolver 132 o 134 valores y devolvió ${flat.length}`);
  }
  return { meta, model: 'blazepose33', raw: fromFlat(Array.from(flat.subarray(0, POSE_FLOATS)), BLAZEPOSE33) };
}
