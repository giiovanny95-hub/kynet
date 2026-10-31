import type { HybridObject } from 'react-native-nitro-modules';
import type { Frame } from 'react-native-vision-camera';

/**
 * MediaPipe PoseLandmarker sobre un cuadro de VisionCamera, en modo `LIVE_STREAM`.
 * `detect` se llama desde el worklet de cámara: envía el cuadro y devuelve el siguiente resultado disponible.
 * Hay que llamar a `dispose()` al salir de la pantalla: libera MediaPipe y su memoria nativa y de GPU.
 */
export interface PoseLandmarker extends HybridObject<{ android: 'kotlin' }> {
  /**
   * Devuelve 33 × (x, y, z, v) + antigüedad (ms) + inferencia (ms) como Float32 (134 valores),
   * en coordenadas normalizadas del cuadro, o `undefined` si no hay persona. Ver docs/contrato-nativo-cinematica.md.
   */
  detect(frame: Frame): ArrayBuffer | undefined;
  /** `PowerManager.getCurrentThermalStatus()` (0 = NONE … 6 = SHUTDOWN); -1 si Android < 10 (API 29). */
  readonly thermalStatus: number;
}
