import { NitroModules } from 'react-native-nitro-modules';

import type { PoseLandmarker } from './specs/PoseLandmarker.nitro';

export type { PoseLandmarker };

export function createPoseLandmarker(): PoseLandmarker {
  return NitroModules.createHybridObject<PoseLandmarker>('PoseLandmarker');
}
