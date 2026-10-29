import { createPoseLandmarker } from 'fitpose-native';
import { useEffect, useMemo, useState } from 'react';
import { NitroModules } from 'react-native-nitro-modules';
import { useSharedValue } from 'react-native-reanimated';
import { CommonResolutions, useFrameOutput } from 'react-native-vision-camera';

import { createMetrics, metricsInference, metricsStep, summarizeMetrics, type FrameMetrics, type MetricsSummary } from './metrics';
import { readPoseExtras } from './poseExtras';

const HUD_REFRESH_MS = 250;

export interface SpikeStats extends MetricsSummary {
  readonly thermalStatus: number;
}

/** Estado de las métricas en el runtime del worklet de la cámara: nunca cruza a otro hilo. */
interface CameraThreadState {
  readonly session: number;
  metrics: FrameMetrics;
  lastPublishMs: number;
  /** Marca de tiempo del último resultado procesado: con `LIVE_STREAM` uno puede repetirse varios cuadros. */
  lastResultTMs: number;
  frames: number;
  framesWithPerson: number;
}

const EMPTY_SUMMARY: MetricsSummary = summarizeMetrics(createMetrics());

/**
 * Salida de cuadros para la pantalla de prueba de la parte 1: corre MediaPipe PoseLandmarker en el hilo de
 * cámara, mide FPS, descartes, p95 y tiempo de inferencia, y deja los landmarks en un SharedValue para Skia.
 *
 * Las métricas se acumulan en el runtime de la cámara y solo se publica un resumen cada `HUD_REFRESH_MS`:
 * escribir el estado completo en un SharedValue en cada cuadro costaba ~7 FPS (medido en el S26 Ultra).
 */
export function useSpikeCamera() {
  const landmarker = useMemo(() => createPoseLandmarker(), []);
  const boxed = useMemo(() => NitroModules.box(landmarker), [landmarker]);
  // Identifica esta pantalla para no heredar el estado de una visita anterior que siga en el runtime.
  const session = useMemo(() => Math.random(), []);
  const landmarks = useSharedValue<Float32Array | undefined>(undefined);
  // Ancho / alto del cuadro ya en vertical (la app está fijada en vertical: el lado corto es el ancho).
  const frameAspect = useSharedValue(3 / 4);
  const summary = useSharedValue<MetricsSummary>(EMPTY_SUMMARY);
  // Solo iOS: en Android VisionCamera nunca llama a onFrameDropped y los descartes se deducen de los huecos.
  const explicitDrops = useSharedValue(0);
  const [stats, setStats] = useState<SpikeStats>({ ...EMPTY_SUMMARY, thermalStatus: -1 });

  const frameOutput = useFrameOutput({
    targetResolution: CommonResolutions.VGA_4_3,
    // 'native' (PRIVATE, GPU) no sirve: el S26 Ultra rechaza PRIVATE a 640x480 en ImageAnalysis y,
    // además, ImageProxy.toBitmap() en HybridPoseLandmarker solo acepta YUV_420_888 o RGBA_8888.
    pixelFormat: 'yuv',
    dropFramesWhileBusy: true,
    onFrame(frame) {
      'worklet';
      try {
        const g = globalThis as unknown as { __fitposeSpike?: CameraThreadState };
        let st = g.__fitposeSpike;
        if (st === undefined || st.session !== session) {
          st = { session, metrics: createMetrics(), lastPublishMs: 0, lastResultTMs: Number.NEGATIVE_INFINITY, frames: 0, framesWithPerson: 0 };
          g.__fitposeSpike = st;
        }
        const aspect = Math.min(frame.width, frame.height) / Math.max(frame.width, frame.height);
        if (aspect !== frameAspect.value) frameAspect.value = aspect;

        // En Android `timestamp` es `ImageInfo.timestamp` de CameraX (nanosegundos); se pasa a ms.
        const frameTMs = frame.timestamp / 1e6;
        const buffer = boxed.unbox().detect(frame);
        st.frames += 1;
        if (buffer === undefined) {
          if (landmarks.value !== undefined) landmarks.value = undefined;
        } else {
          st.framesWithPerson += 1;
          const flat = new Float32Array(buffer);
          const extras = readPoseExtras(flat, frameTMs);
          // Las métricas siguen a los resultados, no a los cuadros: FPS = poses por segundo y los descartes son
          // los cuadros de cámara que se quedaron sin resultado.
          if (extras.resultTMs > st.lastResultTMs) {
            st.lastResultTMs = extras.resultTMs;
            st.metrics = metricsStep(st.metrics, extras.resultTMs, false);
            if (extras.inferMs !== null) st.metrics = metricsInference(st.metrics, extras.inferMs, true);
            landmarks.value = flat;
          }
        }

        const now = performance.now();
        if (now - st.lastPublishMs >= HUD_REFRESH_MS) {
          st.lastPublishMs = now;
          summary.value = { ...summarizeMetrics(st.metrics), detectionRate: st.frames > 0 ? st.framesWithPerson / st.frames : 0 };
        }
      } finally {
        frame.dispose();
      }
    },
    onFrameDropped() {
      explicitDrops.value += 1;
    },
  });

  useEffect(() => {
    const id = setInterval(() => {
      const s = summary.value;
      setStats({ ...s, dropped: Math.max(s.dropped, explicitDrops.value), thermalStatus: landmarker.thermalStatus });
    }, HUD_REFRESH_MS);
    return () => clearInterval(id);
  }, [summary, explicitDrops, landmarker]);

  return { frameOutput, stats, landmarks, frameAspect };
}
