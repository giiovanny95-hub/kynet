import { createPoseLandmarker } from 'fitpose-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { NitroModules } from 'react-native-nitro-modules';
import { useSharedValue } from 'react-native-reanimated';
import { CommonResolutions, useFrameOutput } from 'react-native-vision-camera';
import { scheduleOnRN } from 'react-native-worklets';

import type { CalibrationProfile } from '@/kinematics/calibration/profile';
import { createEngine, step, type EngineEvent, type EngineExercise, type EngineState, type Hud } from '@/kinematics/engine';
import { BLAZEPOSE33 } from '@/kinematics/landmarks/models/blazepose33';

import { appendFrame, createRecording, toFixtureJson, type Recording } from './fixtureRecorder';
import { modelSawMirroredPixels } from './frameContract';
import { createMetrics, metricsInference, metricsStep, summarizeMetrics, type FrameMetrics, type MetricsSummary } from './metrics';
import { toPoseFrame } from './poseEstimator';
import { readPoseExtras } from './poseExtras';
import { createThermal, frameGate, thermalStep, type TargetFps } from './thermalPolicy';

const STATS_REFRESH_MS = 1000;
const THERMAL_POLL_MS = 2000;

export interface WorkoutPipelineOptions {
  readonly exercise: EngineExercise;
  readonly profile: CalibrationProfile | null;
  readonly calibrating: boolean;
  /** Recibe en JS los eventos del motor (repeticiones, avisos, pausas). Nunca datos por cuadro. */
  readonly onEvent: (events: EngineEvent[]) => void;
  /** Solo desarrollo: recibe el JSON de la grabación de landmarks al detenerla (Task 11). */
  readonly onRecording?: (json: string) => void;
}

export interface WorkoutStats extends MetricsSummary {
  readonly thermalStatus: number;
  readonly targetFps: TargetFps;
}

/** Estado en el runtime de la cámara: nunca cruza a otro hilo (ver la regla de métricas de `useSpikeCamera`). */
interface CameraThreadState {
  readonly session: number;
  engine: EngineState;
  nextDueMs: number;
  metrics: FrameMetrics;
  lastPublishMs: number;
  lastHud: Hud | null;
  rec: Recording | null;
  /** Marca de tiempo del último resultado procesado: con `LIVE_STREAM` uno puede repetirse varios cuadros. */
  lastResultTMs: number;
}

const EMPTY_SUMMARY = summarizeMetrics(createMetrics());
const EMPTY_HUD: Hud = { phase: 'IDLE', value: null, reps: 0, paused: false, pauseCode: null };

function hudChanged(a: Hud | null, b: Hud): boolean {
  'worklet';
  return a === null || a.phase !== b.phase || a.reps !== b.reps || a.paused !== b.paused || a.pauseCode !== b.pauseCode;
}

/**
 * Tubería de entrenamiento: en `onFrame` (hilo de cámara) decide si procesar el cuadro según la política
 * térmica, corre MediaPipe, convierte al contrato de la cinemática y avanza el motor. Solo los eventos del
 * motor cruzan a JS (`scheduleOnRN`); el HUD se publica cuando cambia y las métricas cada segundo.
 * Un cambio de ejercicio, perfil o modo de calibración empieza un motor nuevo.
 */
export function useWorkoutPipeline(o: WorkoutPipelineOptions) {
  const landmarker = useMemo(() => createPoseLandmarker(), []);
  const boxed = useMemo(() => NitroModules.box(landmarker), [landmarker]);
  // El recolector de JS no sabe cuánta memoria nativa y de GPU retiene MediaPipe: sin esto cada visita dejaba ~80 MB.
  useEffect(() => () => landmarker.dispose(), [landmarker]);
  const { exercise, profile, calibrating } = o;
  // Identifica esta configuración en el runtime de la cámara para no heredar un motor anterior.
  const session = useMemo(() => Math.random(), [exercise, profile, calibrating]);
  const engineCfg = useMemo(() => ({ exercise, model: BLAZEPOSE33, profile, calibrating }), [exercise, profile, calibrating]);
  const onEventRef = useRef(o.onEvent);
  onEventRef.current = o.onEvent;
  const emit = useMemo(() => (events: EngineEvent[]) => onEventRef.current(events), []);
  const onRecordingRef = useRef(o.onRecording);
  onRecordingRef.current = o.onRecording;
  const emitRecording = useMemo(() => (json: string) => onRecordingRef.current?.(json), []);
  const recording = useSharedValue(false);

  const landmarks = useSharedValue<Float32Array | undefined>(undefined);
  const frameAspect = useSharedValue(3 / 4);
  const hud = useSharedValue<Hud>(EMPTY_HUD);
  const targetFps = useSharedValue<TargetFps>(30);
  const summary = useSharedValue<MetricsSummary>(EMPTY_SUMMARY);
  const [stats, setStats] = useState<WorkoutStats>({ ...EMPTY_SUMMARY, thermalStatus: -1, targetFps: 30 });

  const frameOutput = useFrameOutput({
    targetResolution: CommonResolutions.VGA_4_3,
    pixelFormat: 'yuv',
    dropFramesWhileBusy: true,
    onFrame(frame) {
      'worklet';
      try {
        const g = globalThis as unknown as { __fitposeWorkout?: CameraThreadState };
        let st = g.__fitposeWorkout;
        if (st === undefined || st.session !== session) {
          st = {
            session,
            engine: createEngine(engineCfg),
            nextDueMs: 0,
            metrics: createMetrics(),
            lastPublishMs: 0,
            lastHud: null,
            rec: null,
            lastResultTMs: Number.NEGATIVE_INFINITY,
          };
          g.__fitposeWorkout = st;
        }
        const tMs = frame.timestamp / 1e6;
        const gate = frameGate(st.nextDueMs, tMs, targetFps.value);
        st.nextDueMs = gate.nextDueMs;
        if (!gate.process) {
          // En pausa térmica no hay inferencia: el esqueleto no debe quedarse congelado en pantalla.
          if (targetFps.value === 0 && landmarks.value !== undefined) landmarks.value = undefined;
          return;
        }
        // Kotlin ya entrega los puntos en vertical (rotation = 0); la app está fijada en vertical.
        const width = Math.min(frame.width, frame.height);
        const height = Math.max(frame.width, frame.height);
        if (width / height !== frameAspect.value) frameAspect.value = width / height;

        // LIVE_STREAM: `detect` devuelve el último resultado disponible, que puede ser de un cuadro anterior y
        // repetirse. Cada resultado entra una sola vez al motor, con la marca de tiempo de su propio cuadro.
        const buffer = boxed.unbox().detect(frame);
        let flat: Float32Array | undefined;
        let poseTMs = tMs;
        if (buffer === undefined) {
          if (landmarks.value !== undefined) landmarks.value = undefined;
        } else {
          flat = new Float32Array(buffer);
          const extras = readPoseExtras(flat, tMs);
          if (extras.resultTMs <= st.lastResultTMs) return;
          st.lastResultTMs = extras.resultTMs;
          poseTMs = extras.resultTMs;
          st.metrics = metricsStep(st.metrics, poseTMs, false);
          if (extras.inferMs !== null) st.metrics = metricsInference(st.metrics, extras.inferMs, true);
          landmarks.value = flat;
        }
        const now = performance.now();

        const mirrored = modelSawMirroredPixels({ outputMirrored: false, frameIsMirrored: frame.isMirrored });
        // Sin persona se manda un cuadro vacío (nunca se salta): el motor lo trata como visibilidad nula.
        const poseFrame = toPoseFrame(flat, { tMs: poseTMs, width, height, rotation: 0, mirrored });
        if (recording.value) {
          st.rec = appendFrame(st.rec ?? createRecording(), poseFrame);
        } else if (st.rec !== null) {
          // El conteo real lo añade a mano quien graba (labels.realReps = -1 hasta entonces).
          scheduleOnRN(emitRecording, toFixtureJson(st.rec, { exercise, realReps: -1 }));
          st.rec = null;
        }
        const r = step(st.engine, poseFrame);
        st.engine = r.s;
        if (hudChanged(st.lastHud, r.hud)) {
          st.lastHud = r.hud;
          hud.value = r.hud;
        }
        if (r.events.length > 0) scheduleOnRN(emit, r.events);

        if (now - st.lastPublishMs >= STATS_REFRESH_MS) {
          st.lastPublishMs = now;
          summary.value = summarizeMetrics(st.metrics);
        }
      } finally {
        frame.dispose();
      }
    },
  });

  // Térmica en JS cada 2 s; al worklet solo llega el FPS objetivo.
  useEffect(() => {
    let thermal = createThermal();
    const id = setInterval(() => {
      const status = landmarker.thermalStatus;
      const r = thermalStep(thermal, status, performance.now());
      thermal = r.s;
      if (r.changed) targetFps.value = r.targetFps;
      setStats({ ...summary.value, thermalStatus: status, targetFps: r.targetFps });
    }, THERMAL_POLL_MS);
    return () => clearInterval(id);
  }, [landmarker, summary, targetFps]);

  return { frameOutput, landmarks, frameAspect, hud, stats, recording };
}
