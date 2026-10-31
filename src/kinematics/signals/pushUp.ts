import { JOINT_MIN_V } from '../config/visibility';
import { angle2D } from '../math/angle';
import type { Landmark, Pose } from '../types';

function usable(lm: Landmark | undefined): lm is Landmark {
  'worklet';
  return lm !== undefined && lm.v >= JOINT_MIN_V;
}

/**
 * Señales de flexión en vista lateral (spec §4.5), todas invariantes a la orientación del cuerpo:
 * `thetaE` = codo (hombro–codo–muñeca); `thetaB` = alineación hombro–cadera–tobillo;
 * `thetaBSigned` = `thetaB` con signo negativo si la cadera queda por debajo de la línea hombro–tobillo
 * (caída) y positivo si queda por encima (elevada); `iota` = inclinación hombro→tobillo respecto a la horizontal.
 */
export function pushUpSignals(
  pose: Pose,
  side: 'l' | 'r',
): { thetaE: number | null; thetaB: number | null; thetaBSigned: number | null; iota: number | null } {
  'worklet';
  const j = pose.joints;
  const shoulder = side === 'l' ? j.lShoulder : j.rShoulder;
  const elbow = side === 'l' ? j.lElbow : j.rElbow;
  const wrist = side === 'l' ? j.lWrist : j.rWrist;
  const hip = side === 'l' ? j.lHip : j.rHip;
  const ankle = side === 'l' ? j.lAnkle : j.rAnkle;
  const thetaE = usable(shoulder) && usable(elbow) && usable(wrist) ? angle2D(shoulder, elbow, wrist) : null;
  let thetaB: number | null = null;
  let thetaBSigned: number | null = null;
  let iota: number | null = null;
  if (usable(shoulder) && usable(ankle)) {
    const dx = ankle.x - shoulder.x;
    const dy = ankle.y - shoulder.y;
    iota = Math.atan2(Math.abs(dy), Math.abs(dx)) * (180 / Math.PI);
    if (usable(hip)) {
      thetaB = angle2D(shoulder, hip, ankle);
      // Lado de la línea hombro–tobillo en que cae la cadera; la y de la imagen crece hacia el suelo.
      const cross = dx * (hip.y - shoulder.y) - dy * (hip.x - shoulder.x);
      const below = dx < 0 ? cross < 0 : cross > 0;
      thetaBSigned = below ? -thetaB : thetaB;
    }
  }
  return { thetaE, thetaB, thetaBSigned, iota };
}
