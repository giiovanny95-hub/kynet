import { useKeepAwake } from 'expo-keep-awake';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { Camera } from 'react-native-vision-camera';

import { useFeedbackCues } from '@/audio/useFeedbackCues';
import { useVoice } from '@/audio/useVoice';
import { cachedPrefs } from '@/features/profile/prefsStore';
import { getProfile, setProfile } from '@/features/workout/calibrationStore';
import { effectiveView } from '@/features/workout/exerciseView';
import { createPlacement, placementStep, type PlacementTick } from '@/features/workout/placement';
import { isExercise } from '@/features/workout/plans';
import { calibratorStep, createCalibrator, type CalibratorState } from '@/kinematics/calibration/calibrator';
import type { EngineEvent, EngineExercise } from '@/kinematics/engine';
import type { FeedbackCode } from '@/kinematics/feedback/codes';
import { CameraGate } from '@/ui/CameraGate';
import { silhouetteFor } from '@/ui/silhouettes';
import { Skeleton } from '@/ui/Skeleton';
import { fonts, tokens } from '@/ui/tokens';
import { armRecording } from '@/vision/fixtureRecorder';
import { useWorkoutPipeline } from '@/vision/useWorkoutPipeline';

// El modelo de colocación espera 1,5 s, más que el segundo que el motor tarda en pausar por vista incorrecta.
const POLL_MS = 100;
const COUNT_HEIGHT_RATIO = 0.2;
const MAX_FAILS = 2;
const MIRROR_PREVIEW = true;
/** Sin esto la cámara frontal del Pixel 7 Pro entrega 24 FPS con luz de interior (medido el 2026-10-29). */
const CAMERA_CONSTRAINTS = [{ fps: 30 }];

type Stage = 'placing' | 'countdown' | 'calibrating' | 'failed';

/** Colocación y calibración (producto §3.3). */
export default function SetupScreen() {
  const { exercise } = useLocalSearchParams<{ exercise: string }>();
  if (!isExercise(exercise)) return <Redirect href="/exercises" />;
  return <Setup exercise={exercise} />;
}

function Setup({ exercise }: { readonly exercise: EngineExercise }) {
  const { t } = useTranslation();
  const router = useRouter();
  const [view] = useState(() => effectiveView(exercise, cachedPrefs()));
  // Sentadilla de frente: aún sin calibración por vista (F4.2); se entra sin calibrar y sin tocar el perfil de lado.
  const frontalSquat = exercise === 'squat' && view === 'frontal';
  const known = frontalSquat || getProfile(exercise) !== undefined;
  const [stage, setStage] = useState<Stage>('placing');
  const [calReps, setCalReps] = useState(0);
  const [message, setMessage] = useState<FeedbackCode | null>(null);
  const [busy, setBusy] = useState(false);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const stageRef = useRef(stage);
  stageRef.current = stage;
  const cal = useRef<CalibratorState>(createCalibrator(exercise));
  const fails = useRef(0);
  const { onEvents: cues, playTone } = useFeedbackCues();
  const [tick, setTick] = useState<PlacementTick | null>(null);
  const [armed, setArmed] = useState(false);
  const toggleArmed = () => {
    armRecording(!armed);
    setArmed(!armed);
  };
  const { say } = useVoice();
  const { height: windowHeight } = useWindowDimensions();
  useKeepAwake();
  // Silueta guía fija (producto §3.3): se dibuja con el mismo componente que el esqueleto en vivo.
  const silhouette = useSharedValue<Float32Array | undefined>(silhouetteFor(exercise));

  const goLive = useCallback(() => router.replace({ pathname: '/workout/[exercise]/live', params: { exercise } }), [router, exercise]);

  const onEvent = useCallback(
    (events: EngineEvent[]) => {
      for (const e of events) {
        if (e.type === 'FEEDBACK') setMessage(e.code);
        if (e.type !== 'REP' || stageRef.current !== 'calibrating') continue;
        const r = calibratorStep(cal.current, e, e.top ?? e.extreme);
        cal.current = r.c;
        if (r.code) setMessage(r.code);
        if (r.status === 'done') {
          setProfile(exercise, r.profile);
          goLive();
        } else if (r.status === 'fail') {
          fails.current += 1;
          cal.current = createCalibrator(exercise);
          if (fails.current >= MAX_FAILS) setStage('failed');
        }
        setCalReps(Math.min(3, cal.current.samples.length));
      }
      if (stageRef.current === 'calibrating') cues(events);
    },
    [cues, exercise, goLive],
  );

  const pipeline = useWorkoutPipeline({ exercise, profile: null, calibrating: true, view, onEvent });

  // Colocación y cuenta atrás sin tocar: el motor no está en pausa (visibilidad, vista, encuadre) y hay persona.
  const { hud, landmarks } = pipeline;
  // El intervalo vive mientras se coloca o cuenta; pasar de colocación a cuenta atrás no debe reiniciarlo.
  const placingOrCounting = stage === 'placing' || stage === 'countdown';
  useEffect(() => {
    if (!placingOrCounting) return;
    let placement = createPlacement();
    const id = setInterval(() => {
      const r = placementStep(placement, !hud.value.paused && landmarks.value !== undefined, Date.now());
      placement = r.s;
      setStage(r.s.phase === 'countdown' ? 'countdown' : 'placing');
      if (r.tick === null) return;
      setTick(r.tick);
      playTone(r.tick === 'go' ? 'perfect' : 'rep');
      say(r.tick === 'go' ? { key: 'voice.go', priority: 2 } : { key: 'voice.tick', params: { n: r.tick }, priority: 2 });
      if (r.tick === 'go') {
        if (known) goLive();
        else setStage('calibrating');
      }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [placingOrCounting, known, hud, landmarks, playTone, say, goLive]);

  const useStandard = () => {
    if (!frontalSquat) setProfile(exercise, null);
    goLive();
  };

  const headline =
    stage === 'placing' ? t('setup.placing')
    : stage === 'countdown' ? t('setup.placed')
    : stage === 'calibrating' ? t('setup.calibrate')
    : t('setup.calibrationFailed');

  return (
    <CameraGate busy={busy} onBack={() => router.back()}>
      <View style={styles.fill} onLayout={(e) => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
        <Camera
          style={styles.fill}
          device="front"
          isActive
          outputs={[pipeline.frameOutput]}
          constraints={CAMERA_CONSTRAINTS}
          onError={() => setBusy(true)}
        />
        {stage === 'placing' ? (
          <View style={styles.silhouette} pointerEvents="none">
            <Skeleton landmarks={silhouette} frameAspect={pipeline.frameAspect} width={size.width} height={size.height} mirror={MIRROR_PREVIEW} color={tokens.muted} />
          </View>
        ) : null}
        <Skeleton
          landmarks={pipeline.landmarks}
          frameAspect={pipeline.frameAspect}
          width={size.width}
          height={size.height}
          mirror={MIRROR_PREVIEW}
          color={stage === 'placing' ? tokens.warn : tokens.accent}
        />
        {stage === 'countdown' && tick !== null && tick !== 'go' ? (
          <Text style={[styles.countdown, { fontSize: Math.round(COUNT_HEIGHT_RATIO * windowHeight) }]}>{tick}</Text>
        ) : null}
        <View style={styles.panel}>
          <Text style={styles.title}>{t(`exercise.${exercise}`)}</Text>
          <Text style={styles.headline}>{headline}</Text>
          {message !== null && stage !== 'countdown' ? <Text style={styles.message}>{t(`feedback.${message}`)}</Text> : null}
          {stage === 'calibrating' ? <Text style={styles.text}>{t('setup.calibrateRep', { n: Math.min(3, calReps + 1) })}</Text> : null}
          {stage === 'failed' ? (
            <Pressable style={styles.button} onPress={useStandard}>
              <Text style={styles.buttonText}>{t('setup.useStandard')}</Text>
            </Pressable>
          ) : null}
          {__DEV__ ? (
            <Pressable onPress={toggleArmed}>
              <Text style={styles.link}>{armed ? t('workout.dev.armed') : t('workout.dev.arm')}</Text>
            </Pressable>
          ) : null}
          {stage !== 'failed' ? (
            <Pressable onPress={useStandard}>
              <Text style={styles.link}>{t('setup.skip')}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </CameraGate>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: tokens.bg },
  countdown: { fontFamily: fonts.display, position: 'absolute', top: '30%', alignSelf: 'center', color: tokens.text, fontVariant: ['tabular-nums'] },
  silhouette: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.5 },
  panel: { position: 'absolute', left: 16, right: 16, bottom: 32, backgroundColor: tokens.overlay, borderRadius: tokens.radius, padding: 16, gap: 8 },
  title: { fontFamily: fonts.body, color: tokens.muted, fontSize: 15 },
  headline: { fontFamily: fonts.title, color: tokens.text, fontSize: 20 },
  message: { fontFamily: fonts.body, color: tokens.warn, fontSize: 16 },
  text: { fontFamily: fonts.body, color: tokens.text, fontSize: 16 },
  button: { backgroundColor: tokens.accent, padding: 14, borderRadius: tokens.radiusButton, alignItems: 'center' },
  buttonText: { fontFamily: fonts.strong, color: tokens.onAccent, fontSize: 16 },
  link: { fontFamily: fonts.body, color: tokens.muted, fontSize: 15, padding: 6, textAlign: 'center' },
});
