import { useEffect, useState } from 'react';
import { useSharedValue } from 'react-native-reanimated';
import { CommonResolutions, useFrameOutput } from 'react-native-vision-camera';

import { createMetrics, metricsDrop, metricsStep, type FrameMetrics } from './metrics';

const HUD_REFRESH_MS = 250;

/**
 * Salida de cuadros para la pantalla de prueba: mide FPS, descartes y p95
 * en el hilo de cámara y los expone a React 4 veces por segundo.
 */
export function useSpikeCamera() {
  const metrics = useSharedValue<FrameMetrics>(createMetrics());
  const [snapshot, setSnapshot] = useState<FrameMetrics>(createMetrics());

  const frameOutput = useFrameOutput({
    targetResolution: CommonResolutions.VGA_4_3,
    dropFramesWhileBusy: true,
    onFrame(frame) {
      'worklet';
      try {
        // En Android `timestamp` es `ImageInfo.timestamp` de CameraX (nanosegundos); se pasa a ms.
        metrics.value = metricsStep(metrics.value, frame.timestamp / 1e6, false);
      } finally {
        frame.dispose();
      }
    },
    onFrameDropped() {
      metrics.value = metricsDrop(metrics.value);
    },
  });

  useEffect(() => {
    const id = setInterval(() => setSnapshot(metrics.value), HUD_REFRESH_MS);
    return () => clearInterval(id);
  }, [metrics]);

  return { frameOutput, metrics: snapshot };
}
