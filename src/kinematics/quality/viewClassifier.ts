import { dist, mid } from '../math/vec';
import type { Pose } from '../types';

export type View = 'frontal' | 'lateral' | 'ambiguous';

/** `r = anchoHombros / longitudTorso` (frontal ≈ 0,8·cos(guiñada)): frontal si r >= 0,60, lateral si r <= 0,35. */
export function classifyView(pose: Pose): View | null {
  'worklet';
  const { lShoulder, rShoulder, lHip, rHip } = pose.joints;
  if (!lShoulder || !rShoulder || !lHip || !rHip) return null;
  const torso = dist(mid(lShoulder, rShoulder), mid(lHip, rHip));
  if (torso <= 0) return null;
  const r = dist(lShoulder, rShoulder) / torso;
  if (r >= 0.6) return 'frontal';
  if (r <= 0.35) return 'lateral';
  return 'ambiguous';
}
