import { JOINT_MIN_V } from '../config/visibility';
import { angle2D } from '../math/angle';
import type { Landmark, Pose } from '../types';

/** Visibilidad mínima de talón y tobillo para evaluar SQ_HEELS_LIFT (spec §7). */
const HEEL_V_MIN = 0.8;

function usable(lm: Landmark | undefined): lm is Landmark {
  'worklet';
  return lm !== undefined && lm.v >= JOINT_MIN_V;
}

/** Altura del talón respecto al tobillo (`ankle.y − heel.y`, crece al subir el talón) y la visibilidad menor. */
export interface HeelSample {
  readonly h: number;
  readonly v: number;
}

function heelSample(heel: Landmark | undefined, ankle: Landmark | undefined): HeelSample | null {
  'worklet';
  if (heel === undefined || ankle === undefined) return null;
  const v = Math.min(heel.v, ankle.v);
  return v >= HEEL_V_MIN ? { h: ankle.y - heel.y, v } : null;
}

/**
 * Señales de sentadilla en vista lateral (spec §4.3): `thetaK` = ángulo cadera–rodilla–tobillo
 * y `tau` = inclinación del tronco respecto a la vertical (0° erguido). `null` si falta una articulación.
 * `heelL`/`heelR`: talón de cada lado, `null` sin talones (MoveNet) o con visibilidad < 0,8.
 */
export function squatSignals(
  pose: Pose,
  side: 'l' | 'r',
): { thetaK: number | null; tau: number | null; heelL: HeelSample | null; heelR: HeelSample | null } {
  'worklet';
  const j = pose.joints;
  const hip = side === 'l' ? j.lHip : j.rHip;
  const knee = side === 'l' ? j.lKnee : j.rKnee;
  const ankle = side === 'l' ? j.lAnkle : j.rAnkle;
  const shoulder = side === 'l' ? j.lShoulder : j.rShoulder;
  const thetaK = usable(hip) && usable(knee) && usable(ankle) ? angle2D(hip, knee, ankle) : null;
  const tau = usable(hip) && usable(shoulder)
    ? Math.atan2(Math.abs(shoulder.x - hip.x), hip.y - shoulder.y) * (180 / Math.PI)
    : null;
  return { thetaK, tau, heelL: heelSample(j.lHeel, j.lAnkle), heelR: heelSample(j.rHeel, j.rAnkle) };
}
