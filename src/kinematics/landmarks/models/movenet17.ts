import type { ModelSpec } from '../../types';

export const MOVENET17: ModelSpec = {
  id: 'movenet17',
  count: 17,
  hasZ: false,
  layout: 'yxs',
  visThreshold: 0.65,
  capabilities: { heel: false, footIndex: false, z: false },
  index: {
    nose: 0, lEye: 1, rEye: 2, lEar: 3, rEar: 4,
    lShoulder: 5, rShoulder: 6, lElbow: 7, rElbow: 8, lWrist: 9, rWrist: 10,
    lHip: 11, rHip: 12, lKnee: 13, rKnee: 14, lAnkle: 15, rAnkle: 16,
  },
};
