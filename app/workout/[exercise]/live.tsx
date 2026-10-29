import { File, Paths } from 'expo-file-system';
import { useKeepAwake } from 'expo-keep-awake';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Camera } from 'react-native-vision-camera';

import { useFeedbackCues } from '@/audio/useFeedbackCues';
import { getProfile } from '@/features/workout/calibrationStore';
import { DEFAULT_PLAN, isExercise } from '@/features/workout/plans';
import { useWorkoutSession } from '@/features/workout/useWorkoutSession';
import type { EngineEvent, EngineExercise } from '@/kinematics/engine';
import type { FeedbackCode } from '@/kinematics/feedback/codes';
import { CameraGate } from '@/ui/CameraGate';
import { Skeleton } from '@/ui/Skeleton';
import { tokens } from '@/ui/tokens';
import { useWorkoutPipeline } from '@/vision/useWorkoutPipeline';

const MESSAGE_MS = 3000;
const HUD_POLL_MS = 250;
const MIRROR_PREVIEW = true;
/** Sin esto la cámara frontal del Pixel 7 Pro entrega 24 FPS con luz de interior (medido el 2026-10-29). */
const CAMERA_CONSTRAINTS = [{ fps: 30 }];

function clock(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Entrenamiento (producto §3.4): cámara, esqueleto, HUD, descanso, avisos y fatiga. */
export default function LiveScreen() {
  const { exercise } = useLocalSearchParams<{ exercise: string }>();
  if (!isExercise(exercise)) return <Redirect href="/exercises" />;
  return <Live exercise={exercise} />;
}

function Live({ exercise }: { readonly exercise: EngineExercise }) {
  const { t } = useTranslation();
  const router = useRouter();
  const [profile] = useState(() => getProfile(exercise) ?? null);
  const { session, dispatch } = useWorkoutSession();
  const [message, setMessage] = useState<FeedbackCode | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [now, setNow] = useState(Date.now());
  const [pauseCode, setPauseCode] = useState<FeedbackCode | null>(null);
  const phaseRef = useRef(session.phase);
  phaseRef.current = session.phase;
  const cues = useFeedbackCues();
  // La pantalla no debe apagarse durante el entrenamiento: apagarla manda la app a segundo plano y pausa la sesión.
  useKeepAwake();

  useEffect(() => {
    const plan = DEFAULT_PLAN[exercise];
    dispatch({ type: 'start', exercise, sets: plan.sets, repsPerSet: plan.reps, nowMs: Date.now() });
  }, [dispatch, exercise]);

  useEffect(() => {
    if (message === null) return;
    const id = setTimeout(() => setMessage(null), MESSAGE_MS);
    return () => clearTimeout(id);
  }, [message]);

  useEffect(() => {
    if (session.phase !== 'rest') return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [session.phase]);

  useEffect(() => {
    if (session.phase === 'done') router.replace('/workout/summary');
  }, [session.phase, router]);

  const onEvent = useCallback(
    (events: EngineEvent[]) => {
      // El modelo de sesión decide qué cuenta en cada fase (PAUSE/RESUME siempre, repeticiones solo en 'active');
      // sonido y avisos solo en 'active', sin señales fantasma en pausa o descanso.
      const nowMs = Date.now();
      for (const e of events) dispatch({ type: 'engine', event: e, nowMs });
      if (phaseRef.current !== 'active') return;
      for (const e of events) if (e.type === 'FEEDBACK') setMessage(e.code);
      cues(events);
    },
    [cues, dispatch],
  );

  // Solo desarrollo: el JSON se guarda en los documentos de la app y se saca con adb (ver docs/fixtures.md); nunca se sube.
  const onRecording = useCallback(
    (json: string) => {
      const file = new File(Paths.document, `fixture-${exercise}-${Date.now()}.json`);
      try {
        file.create();
        file
          .write(json)
          .then(() => Alert.alert(t('workout.dev.saved', { name: file.name, kb: Math.round(json.length / 1024) })))
          .catch((e: unknown) => Alert.alert(t('workout.dev.saveFailed', { error: String(e) })));
      } catch (e) {
        Alert.alert(t('workout.dev.saveFailed', { error: String(e) }));
      }
    },
    [exercise, t],
  );
  const pipeline = useWorkoutPipeline({ exercise, profile, calibrating: false, onEvent, onRecording: __DEV__ ? onRecording : undefined });
  const [recording, setRecording] = useState(false);
  const toggleRecording = () => {
    pipeline.recording.value = !recording;
    setRecording(!recording);
  };
  const cameraOn = session.phase === 'active' || session.phase === 'rest' || session.phase === 'fatigue';
  const critical = pipeline.stats.targetFps === 0;

  // Térmica CRITICAL (arquitectura §7): se pausa la sesión y se sugiere descansar.
  useEffect(() => {
    if (critical && session.phase === 'active') dispatch({ type: 'pause', nowMs: Date.now() });
  }, [critical, session.phase, dispatch]);

  // La causa de la pausa del motor se muestra mientras dura (el HUD del worklet solo cambia cuando cambia algo).
  const { hud } = pipeline;
  useEffect(() => {
    const id = setInterval(() => setPauseCode(hud.value.pauseCode), HUD_POLL_MS);
    return () => clearInterval(id);
  }, [hud]);
  const last = session.reps[session.reps.length - 1];
  const warning = session.warnings[session.warnings.length - 1];

  return (
    <CameraGate onBack={() => router.back()}>
      <View style={styles.fill} onLayout={(e) => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
        <Camera
          style={styles.fill}
          device="front"
          isActive={cameraOn}
          outputs={[pipeline.frameOutput]}
          constraints={CAMERA_CONSTRAINTS}
          onError={() => dispatch({ type: 'cameraError', reason: 'busy' })}
        />
        <Skeleton landmarks={pipeline.landmarks} frameAspect={pipeline.frameAspect} width={size.width} height={size.height} mirror={MIRROR_PREVIEW} />

        <View style={styles.top}>
          <Pressable style={styles.chip} onPress={() => dispatch({ type: 'pause', nowMs: Date.now() })}>
            <Text style={styles.chipText}>{t('workout.pause')}</Text>
          </Pressable>
          <Text style={styles.topText}>{t(`exercise.${exercise}`)}</Text>
          <Text style={styles.topText}>{t('workout.set', { set: session.set, sets: session.sets })}</Text>
          <Text style={styles.topText}>{clock(session.activeMs)}</Text>
        </View>
        {__DEV__ ? (
          <Pressable style={[styles.chip, styles.rec]} onPress={toggleRecording}>
            <Text style={styles.chipText}>{recording ? t('workout.dev.stopRecording') : t('workout.dev.record')}</Text>
          </Pressable>
        ) : null}

        {pipeline.stats.targetFps < 30 ? <Text style={styles.banner}>{t('workout.hot')}</Text> : null}
        {warning ? <Text style={styles.banner}>{t(warning === '15min' ? 'workout.warn15' : 'workout.warn25')}</Text> : null}

        <View style={styles.bottom}>
          {pauseCode !== null && session.phase === 'active' ? (
            <Text style={styles.message}>{t(`feedback.${pauseCode}`)}</Text>
          ) : message !== null ? (
            <Text style={styles.message}>{t(`feedback.${message}`)}</Text>
          ) : null}
          <Text style={styles.count}>{t('workout.reps', { reps: session.repsInSet, target: session.repsPerSet })}</Text>
          <View style={styles.row}>
            <Text style={styles.small}>{t('workout.form')}</Text>
            <View style={styles.bar}>
              <View style={[styles.barFill, { width: `${last?.formScore ?? 0}%` }]} />
            </View>
            <Text style={styles.small}>{t('workout.clean', { n: session.cleanReps })}</Text>
          </View>
        </View>

        {session.phase === 'rest' ? (
          <View style={styles.cover}>
            <Text style={styles.coverTitle}>{t('workout.rest', { s: Math.max(0, Math.ceil(((session.restEndsAtMs ?? now) - now) / 1000)) })}</Text>
            <Text style={styles.small}>{t('workout.restTip')}</Text>
            <Pressable style={styles.button} onPress={() => dispatch({ type: 'skipRest' })}>
              <Text style={styles.buttonText}>{t('workout.skipRest')}</Text>
            </Pressable>
          </View>
        ) : null}

        {session.phase === 'fatigue' ? (
          <View style={styles.cover}>
            <Text style={styles.coverTitle}>{t('workout.fatigue.title')}</Text>
            <Text style={styles.small}>{t('workout.fatigue.body')}</Text>
            {(['rest', 'endSet', 'continue'] as const).map((choice) => (
              <Pressable key={choice} style={styles.button} onPress={() => dispatch({ type: 'fatigueChoice', choice, nowMs: Date.now() })}>
                <Text style={styles.buttonText}>{t(`workout.fatigue.${choice}`)}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {session.phase === 'paused' ? (
          <View style={styles.cover}>
            <Text style={styles.coverTitle}>{critical ? t('workout.critical') : t('workout.paused')}</Text>
            <Pressable style={styles.button} disabled={critical} onPress={() => dispatch({ type: 'resume', nowMs: Date.now() })}>
              <Text style={styles.buttonText}>{t('workout.resume')}</Text>
            </Pressable>
            <Pressable onPress={() => dispatch({ type: 'finish', nowMs: Date.now() })}>
              <Text style={styles.link}>{t('workout.finish')}</Text>
            </Pressable>
          </View>
        ) : null}

        {session.phase === 'error' ? (
          <View style={styles.cover}>
            <Text style={styles.coverTitle}>{t('camera.busy')}</Text>
            <Pressable style={styles.button} onPress={() => dispatch({ type: 'retryCamera', nowMs: Date.now() })}>
              <Text style={styles.buttonText}>{t('setup.retry')}</Text>
            </Pressable>
            <Pressable onPress={() => dispatch({ type: 'finish', nowMs: Date.now() })}>
              <Text style={styles.link}>{t('workout.finish')}</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </CameraGate>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: tokens.bg },
  top: { position: 'absolute', top: 44, left: 12, right: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  topText: { color: tokens.text, fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] },
  chip: { backgroundColor: tokens.overlay, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  chipText: { color: tokens.text, fontWeight: '700' },
  rec: { position: 'absolute', top: 88, right: 12 },
  banner: { alignSelf: 'center', marginTop: 96, color: tokens.onAccent, backgroundColor: tokens.warn, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, overflow: 'hidden' },
  bottom: { position: 'absolute', left: 16, right: 16, bottom: 32, gap: 8, alignItems: 'center' },
  message: { color: tokens.onAccent, backgroundColor: tokens.warn, fontSize: 18, fontWeight: '700', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12, overflow: 'hidden' },
  count: { color: tokens.text, fontSize: 64, fontWeight: '800', fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'stretch' },
  small: { color: tokens.text, fontSize: 15 },
  bar: { flex: 1, height: 10, backgroundColor: tokens.overlay, borderRadius: 5, overflow: 'hidden' },
  barFill: { height: 10, backgroundColor: tokens.accent },
  cover: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: tokens.overlay, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 },
  coverTitle: { color: tokens.text, fontSize: 26, fontWeight: '700', textAlign: 'center' },
  button: { backgroundColor: tokens.accent, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, minWidth: 220, alignItems: 'center' },
  buttonText: { color: tokens.onAccent, fontWeight: '700', fontSize: 16 },
  link: { color: tokens.muted, fontSize: 16, padding: 8 },
});
