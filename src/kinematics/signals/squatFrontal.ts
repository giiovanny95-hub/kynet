import { JOINT_MIN_V } from '../config/visibility';
import type { Landmark, Pose } from '../types';

function usable(lm: Landmark | undefined): lm is Landmark {
  'worklet';
  return lm !== undefined && lm.v >= JOINT_MIN_V;
}

/**
 * Señales crudas de la sentadilla de frente (spec-vista-frontal §3), en unidades de alto de cuadro y **sin dividir
 * por la referencia**: la FSM las escala a 0-100 con la referencia de pie congelada al armar (§2).
 * - `rho`: `yTobilloMedio − yCaderaMedia` (principal; baja al agacharse).
 * - `lambda`: `yRodillaMedia − yCaderaMedia` (acortamiento del muslo; solo para `Q_rom`).
 * - `kappa`: longitud 2D del torso (punto medio de hombros a punto medio de caderas).
 * - `kneeRatio`: `|xRodillaI − xRodillaD| / |xTobilloI − xTobilloD|`.
 * - `scale`: escala del cuerpo (§4.4) = longitud del torso.
 * `null` si falta una articulación de las que usa cada señal (ambos lados).
 */
export interface SquatFrontalSignals {
  readonly rho: number | null;
  readonly lambda: number | null;
  readonly kappa: number | null;
  readonly kneeRatio: number | null;
  readonly scale: number | null;
}

export function squatFrontalSignals(pose: Pose): SquatFrontalSignals {
  'worklet';
  const j = pose.joints;
  const hips = usable(j.lHip) && usable(j.rHip);
  const ankles = usable(j.lAnkle) && usable(j.rAnkle);
  const knees = usable(j.lKnee) && usable(j.rKnee);
  const shoulders = usable(j.lShoulder) && usable(j.rShoulder);
  const hipY = hips && j.lHip && j.rHip ? (j.lHip.y + j.rHip.y) / 2 : null;
  const rho = hipY !== null && ankles && j.lAnkle && j.rAnkle ? (j.lAnkle.y + j.rAnkle.y) / 2 - hipY : null;
  const lambda = hipY !== null && knees && j.lKnee && j.rKnee ? (j.lKnee.y + j.rKnee.y) / 2 - hipY : null;
  let kappa: number | null = null;
  if (hips && shoulders && j.lHip && j.rHip && j.lShoulder && j.rShoulder) {
    const dx = (j.lShoulder.x + j.rShoulder.x) / 2 - (j.lHip.x + j.rHip.x) / 2;
    const dy = (j.lShoulder.y + j.rShoulder.y) / 2 - (j.lHip.y + j.rHip.y) / 2;
    kappa = Math.hypot(dx, dy);
  }
  let kneeRatio: number | null = null;
  if (knees && ankles && j.lKnee && j.rKnee && j.lAnkle && j.rAnkle) {
    const ankleW = Math.abs(j.lAnkle.x - j.rAnkle.x);
    kneeRatio = ankleW > 1e-6 ? Math.abs(j.lKnee.x - j.rKnee.x) / ankleW : null;
  }
  return { rho, lambda, kappa, kneeRatio, scale: kappa };
}
