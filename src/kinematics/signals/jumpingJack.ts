import { angle2D } from '../math/angle';
import type { Landmark, Pose } from '../types';

const MIN_V = 0.3;

function usable(lm: Landmark | undefined): lm is Landmark {
  'worklet';
  return lm !== undefined && lm.v >= MIN_V;
}

/**
 * Señales de jumping jack en vista frontal (spec §4.4): `alpha` = media de los ángulos cadera–hombro–muñeca
 * y `rhoF` = separación de tobillos / ancho de hombros.
 */
export function jjSignals(pose: Pose): { alpha: number | null; rhoF: number | null } {
  'worklet';
  const j = pose.joints;
  const left = usable(j.lHip) && usable(j.lShoulder) && usable(j.lWrist) ? angle2D(j.lHip, j.lShoulder, j.lWrist) : null;
  const right = usable(j.rHip) && usable(j.rShoulder) && usable(j.rWrist) ? angle2D(j.rHip, j.rShoulder, j.rWrist) : null;
  const alpha = left !== null && right !== null ? (left + right) / 2 : null;
  let rhoF: number | null = null;
  if (usable(j.lAnkle) && usable(j.rAnkle) && usable(j.lShoulder) && usable(j.rShoulder)) {
    const shoulders = Math.abs(j.lShoulder.x - j.rShoulder.x);
    rhoF = shoulders > 0 ? Math.abs(j.lAnkle.x - j.rAnkle.x) / shoulders : null;
  }
  return { alpha, rhoF };
}
