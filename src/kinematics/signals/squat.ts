import { JOINT_MIN_V } from '../config/visibility';
import { angle2D } from '../math/angle';
import type { Landmark, Pose } from '../types';


function usable(lm: Landmark | undefined): lm is Landmark {
  'worklet';
  return lm !== undefined && lm.v >= JOINT_MIN_V;
}

/**
 * Señales de sentadilla en vista lateral (spec §4.3): `thetaK` = ángulo cadera–rodilla–tobillo
 * y `tau` = inclinación del tronco respecto a la vertical (0° erguido). `null` si falta una articulación.
 */
export function squatSignals(pose: Pose, side: 'l' | 'r'): { thetaK: number | null; tau: number | null } {
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
  return { thetaK, tau };
}
