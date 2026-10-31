import { JOINT_MIN_V } from '../config/visibility';
import type { Landmark, Pose } from '../types';

/** Postura de plancha vista de frente (spec-vista-frontal §4.1), en múltiplos de `w` [H]. */
const PLANK_WRIST_BELOW_W = 0.5;
const PLANK_WRISTS_MIN_W = 0.8;
const PLANK_WRISTS_MAX_W = 2.5;
const PLANK_TORSO_MAX_W = 0.7;
const PLANK_HIP_V_MAX = 0.5;

function usable(lm: Landmark | undefined): lm is Landmark {
  'worklet';
  return lm !== undefined && lm.v >= JOINT_MIN_V;
}

/**
 * Señales crudas de la flexión de frente (spec-vista-frontal §4), en unidades de alto de cuadro.
 * - `w`: ancho de hombros 2D; también es la escala del cuerpo (`scale`, §4.4).
 * - `delta`: `(yMuñecaMedia − yHombroMedio) / w`, sin dividir por la referencia de arriba (la escala la FSM).
 * - `flare`: `(|xCodoI − xHombroI| + |xCodoD − xHombroD|) / (2·w)`.
 * - `headDrop`: `(yNariz − yHombroMedio) / w`; crece cuando la cabeza cae.
 * - `plankOk`: postura de plancha de §4.1 (`false` si faltan articulaciones requeridas).
 */
export interface PushUpFrontalSignals {
  readonly w: number | null;
  readonly delta: number | null;
  readonly flare: number | null;
  readonly headDrop: number | null;
  readonly plankOk: boolean;
  readonly scale: number | null;
}

export function pushUpFrontalSignals(pose: Pose): PushUpFrontalSignals {
  'worklet';
  const j = pose.joints;
  const ls = j.lShoulder;
  const rs = j.rShoulder;
  if (!usable(ls) || !usable(rs)) return { w: null, delta: null, flare: null, headDrop: null, plankOk: false, scale: null };
  const w = Math.abs(ls.x - rs.x);
  if (w < 1e-6) return { w: null, delta: null, flare: null, headDrop: null, plankOk: false, scale: null };
  const shY = (ls.y + rs.y) / 2;
  const lw = j.lWrist;
  const rw = j.rWrist;
  const wrists = usable(lw) && usable(rw);
  const wristY = wrists && lw && rw ? (lw.y + rw.y) / 2 : null;
  const delta = wristY !== null ? (wristY - shY) / w : null;
  const le = j.lElbow;
  const re = j.rElbow;
  const flare = usable(le) && usable(re) ? (Math.abs(le.x - ls.x) + Math.abs(re.x - rs.x)) / (2 * w) : null;
  const nose = j.nose;
  const headDrop = usable(nose) ? (nose.y - shY) / w : null;

  let plankOk = false;
  if (wristY !== null && lw && rw && usable(nose)) {
    const spread = Math.abs(lw.x - rw.x);
    const lh = j.lHip;
    const rh = j.rHip;
    const hipsVisible = lh !== undefined && rh !== undefined && Math.min(lh.v, rh.v) >= PLANK_HIP_V_MAX;
    const torsoShort = !hipsVisible || (lh !== undefined && rh !== undefined && (lh.y + rh.y) / 2 - shY < PLANK_TORSO_MAX_W * w);
    plankOk =
      wristY - shY > PLANK_WRIST_BELOW_W * w &&
      spread >= PLANK_WRISTS_MIN_W * w &&
      spread <= PLANK_WRISTS_MAX_W * w &&
      torsoShort &&
      nose.y < wristY;
  }
  return { w, delta, flare, headDrop, plankOk, scale: w };
}
