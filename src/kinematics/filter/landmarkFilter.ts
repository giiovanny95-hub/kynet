import type { JointId, Landmark, Pose } from '../types';
import { filterStep, type OneEuroParams, type OneEuroState } from './oneEuro';

/** Estado del filtro por articulación y canal (`lKnee.x`, `lKnee.y`, `lKnee.z`). */
export type FilterBank = Readonly<Record<string, OneEuroState>>;

export function createFilterBank(): FilterBank {
  'worklet';
  return {};
}

/**
 * Filtra x, y (y z) de cada articulación con su propio canal One-Euro.
 * Las articulaciones con `v < vMin` no alimentan el filtro y pasan sin cambios.
 */
export function filterPose(bank: FilterBank, pose: Pose, p: OneEuroParams, vMin: number): { bank: FilterBank; pose: Pose } {
  'worklet';
  const tSec = pose.tMs / 1000;
  const next: Record<string, OneEuroState> = { ...bank };
  const joints: Partial<Record<JointId, Landmark>> = {};
  for (const id of Object.keys(pose.joints) as JointId[]) {
    const lm = pose.joints[id];
    if (!lm) continue;
    if (lm.v < vMin) {
      joints[id] = lm;
      continue;
    }
    const fx = filterStep(bank[`${id}.x`] ?? null, tSec, lm.x, p);
    const fy = filterStep(bank[`${id}.y`] ?? null, tSec, lm.y, p);
    const fz = filterStep(bank[`${id}.z`] ?? null, tSec, lm.z, p);
    next[`${id}.x`] = fx;
    next[`${id}.y`] = fy;
    next[`${id}.z`] = fz;
    joints[id] = { x: fx.xHat, y: fy.xHat, z: fz.xHat, v: lm.v };
  }
  return { bank: next, pose: { ...pose, joints } };
}
