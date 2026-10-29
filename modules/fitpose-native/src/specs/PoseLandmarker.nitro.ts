import type { HybridObject } from 'react-native-nitro-modules';
import type { Frame } from 'react-native-vision-camera';

/**
 * MediaPipe PoseLandmarker sobre un cuadro de VisionCamera.
 * `detect` es síncrono y se llama desde el worklet de cámara.
 */
export interface PoseLandmarker extends HybridObject<{ android: 'kotlin' }> {
  /**
   * Devuelve 33 × (x, y, z, visibilidad) como Float32 (528 bytes),
   * en coordenadas normalizadas del cuadro, o `undefined` si no hay persona.
   */
  detect(frame: Frame): ArrayBuffer | undefined;
  /** `PowerManager.getCurrentThermalStatus()` (0 = NONE … 6 = SHUTDOWN); -1 si Android < 10 (API 29). */
  readonly thermalStatus: number;
}
