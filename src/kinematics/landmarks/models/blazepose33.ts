import type { ModelSpec } from '../../types';

export const BLAZEPOSE33: ModelSpec = {
  id: 'blazepose33',
  count: 33,
  hasZ: true,
  layout: 'xyzv',
  visThreshold: 0.65,
  capabilities: { heel: true, footIndex: true, z: true },
  index: {
    nose: 0, lEye: 2, rEye: 5, lEar: 7, rEar: 8,
    lShoulder: 11, rShoulder: 12, lElbow: 13, rElbow: 14, lWrist: 15, rWrist: 16,
    lHip: 23, rHip: 24, lKnee: 25, rKnee: 26, lAnkle: 27, rAnkle: 28,
    lHeel: 29, rHeel: 30, lFootIndex: 31, rFootIndex: 32,
  },
};
