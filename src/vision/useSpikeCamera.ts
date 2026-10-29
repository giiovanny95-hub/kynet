import { createPoseLandmarker } from 'fitpose-native';
import { useEffect, useMemo, useState } from 'react';
import { NitroModules } from 'react-native-nitro-modules';
import { useSharedValue } from 'react-native-reanimated';
import { CommonResolutions, useFrameOutput } from 'react-native-vision-camera';

import { createMetrics, metricsDrop, metricsStep, type FrameMetrics } from './metrics';

const HUD_REFRESH_MS = 250;

export interface SpikeStats {
  readonly metrics: FrameMetrics;
  /** Cuadros con persona detectada sobre el total procesado. */
  readonly detectionRate: number;
  /** Último tiempo de `detect()` en ms. */
  readonly inferMs: number;
  readonly thermalStatus: number;
}

/**
 * Salida de cuadros para la pantalla de prueba de la parte 1: corre MediaPipe PoseLandmarker en el hilo de
 * cámara, mide FPS, descartes, p95 y tiempo de inferencia, y deja los landmarks en un SharedValue para Skia.
 */
export function useSpikeCamera() {
  const landmarker = useMemo(() => createPoseLandmarker(), []);
  const boxed = useMemo(() => NitroModules.box(landmarker), [landmarker]);
  const metrics = useSharedValue<FrameMetrics>(createMetrics());
  const landmarks = useSharedValue<Float32Array | undefined>(undefined);
  // Ancho / alto del cuadro ya en vertical (la app está fijada en vertical: el lado corto es el ancho).
  const frameAspect = useSharedValue(3 / 4);
  const counts = useSharedValue({ processed: 0, detected: 0, inferMs: 0 });
  const [stats, setStats] = useState<SpikeStats>({ metrics: createMetrics(), detectionRate: 0, inferMs: 0, thermalStatus: -1 });

  const frameOutput = useFrameOutput({
    targetResolution: CommonResolutions.VGA_4_3,
    // 'native' (PRIVATE, GPU) no sirve: el S26 Ultra rechaza PRIVATE a 640x480 en ImageAnalysis y,
    // además, ImageProxy.toBitmap() en HybridPoseLandmarker solo acepta YUV_420_888 o RGBA_8888.
    pixelFormat: 'yuv',
    dropFramesWhileBusy: true,
    onFrame(frame) {
      'worklet';
      try {
        // En Android `timestamp` es `ImageInfo.timestamp` de CameraX (nanosegundos); se pasa a ms.
        metrics.value = metricsStep(metrics.value, frame.timestamp / 1e6, false);
        frameAspect.value = Math.min(frame.width, frame.height) / Math.max(frame.width, frame.height);
        const t0 = performance.now();
        const buffer = boxed.unbox().detect(frame);
        const inferMs = performance.now() - t0;
        landmarks.value = buffer === undefined ? undefined : new Float32Array(buffer);
        const c = counts.value;
        counts.value = { processed: c.processed + 1, detected: c.detected + (buffer === undefined ? 0 : 1), inferMs };
      } finally {
        frame.dispose();
      }
    },
    onFrameDropped() {
      metrics.value = metricsDrop(metrics.value);
    },
  });

  useEffect(() => {
    const id = setInterval(() => {
      const c = counts.value;
      setStats({
        metrics: metrics.value,
        detectionRate: c.processed > 0 ? c.detected / c.processed : 0,
        inferMs: c.inferMs,
        thermalStatus: landmarker.thermalStatus,
      });
    }, HUD_REFRESH_MS);
    return () => clearInterval(id);
  }, [metrics, counts, landmarker]);

  return { frameOutput, stats, landmarks, frameAspect };
}
