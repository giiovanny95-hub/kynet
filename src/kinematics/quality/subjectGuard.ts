import { JOINT_MIN_V } from '../config/visibility';
import { dist, mid } from '../math/vec';
import type { Pose, Vec2 } from '../types';

export interface GuardState {
  readonly torso: number | null;
  readonly hip: Vec2 | null;
  readonly rejects: number;
}

const MAX_TORSO_CHANGE = 0.3;
const MAX_HIP_JUMP_TORSOS = 0.5;
const REJECTS_FOR_NEW_SUBJECT = 3;

export function createGuard(): GuardState {
  'worklet';
  return { torso: null, hip: null, rejects: 0 };
}


function hipCenter(pose: Pose): Vec2 | null {
  'worklet';
  const { lHip, rHip } = pose.joints;
  return lHip && rHip ? mid(lHip, rHip) : null;
}

function torsoVisible(pose: Pose): boolean {
  'worklet';
  const { lShoulder, rShoulder, lHip, rHip } = pose.joints;
  return [lShoulder, rShoulder, lHip, rHip].every((j) => j !== undefined && j.v >= JOINT_MIN_V);
}

/**
 * Rechaza cuadros donde el modelo saltó a otra persona (spec §2): torso que cambia más del 30 %
 * o cadera que salta más de 0,5 torsos. Tras 3 rechazos seguidos acepta al sujeto nuevo.
 */
export function guardStep(g: GuardState, pose: Pose): { g: GuardState; accept: boolean; event: 'SUBJECT_CHANGED' | null } {
  'worklet';
  // Con el torso poco visible (fuera de cuadro, pose fantasma) la guarda no decide: lo resuelve la visibilidad.
  // Un cuadro que no se puede comparar corta la racha de rechazos: "3 seguidos" significa 3 cuadros comparables.
  if (!torsoVisible(pose)) return { g: { ...g, rejects: 0 }, accept: true, event: null };
  const hip = hipCenter(pose);
  const torso = pose.torso;
  if (torso === null || hip === null) return { g: { ...g, rejects: 0 }, accept: true, event: null };
  const accepted: GuardState = { torso, hip, rejects: 0 };
  if (g.torso === null || g.hip === null) return { g: accepted, accept: true, event: null };

  const torsoJump = Math.abs(torso - g.torso) / g.torso > MAX_TORSO_CHANGE;
  const hipJump = dist(hip, g.hip) > MAX_HIP_JUMP_TORSOS * g.torso;
  if (!torsoJump && !hipJump) return { g: accepted, accept: true, event: null };

  const rejects = g.rejects + 1;
  if (rejects >= REJECTS_FOR_NEW_SUBJECT) return { g: accepted, accept: true, event: 'SUBJECT_CHANGED' };
  return { g: { ...g, rejects }, accept: false, event: null };
}
