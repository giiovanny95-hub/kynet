import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Camera } from 'react-native-vision-camera';

import { useFeedbackCues } from '@/audio/useFeedbackCues';
import { getProfile, setProfile } from '@/features/workout/calibrationStore';
import { isExercise } from '@/features/workout/plans';
import { calibratorStep, createCalibrator, type CalibratorState } from '@/kinematics/calibration/calibrator';
import type { EngineEvent, EngineExercise } from '@/kinematics/engine';
import type { FeedbackCode } from '@/kinematics/feedback/codes';
import { CameraGate } from '@/ui/CameraGate';
import { Skeleton } from '@/ui/Skeleton';
import { tokens } from '@/ui/tokens';
import { useWorkoutPipeline } from '@/vision/useWorkoutPipeline';

const PLACED_AFTER_MS = 1000;
const POLL_MS = 200;
const MAX_FAILS = 2;
const MIRROR_PREVIEW = true;

type Stage = 'placing' | 'calibrating' | 'ready' | 'failed';

/** Colocación y calibración (producto §3.3). */
export default function SetupScreen() {
  const { exercise } = useLocalSearchParams<{ exercise: string }>();
  if (!isExercise(exercise)) return <Redirect href="/exercises" />;
  return <Setup exercise={exercise} />;
}

function Setup({ exercise }: { readonly exercise: EngineExercise }) {
  const { t } = useTranslation();
  const router = useRouter();
  const known = getProfile(exercise) !== undefined;
  const [stage, setStage] = useState<Stage>('placing');
  const [calReps, setCalReps] = useState(0);
  const [message, setMessage] = useState<FeedbackCode | null>(null);
  const [busy, setBusy] = useState(false);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const stageRef = useRef(stage);
  stageRef.current = stage;
  const cal = useRef<CalibratorState>(createCalibrator(exercise));
  const fails = useRef(0);
  const cues = useFeedbackCues();

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

  const pipeline = useWorkoutPipeline({ exercise, profile: null, calibrating: true, onEvent });

  // Colocación: el motor no está en pausa (visibilidad, vista, encuadre) y hay persona durante 1 s.
  useEffect(() => {
    if (stage !== 'placing') return;
    let since: number | null = null;
    const id = setInterval(() => {
      const ok = !pipeline.hud.value.paused && pipeline.landmarks.value !== undefined;
      since = ok ? (since ?? Date.now()) : null;
      if (since !== null && Date.now() - since >= PLACED_AFTER_MS) setStage(known ? 'ready' : 'calibrating');
    }, POLL_MS);
    return () => clearInterval(id);
  }, [stage, known, pipeline.hud, pipeline.landmarks]);

  const useStandard = () => {
    setProfile(exercise, null);
    goLive();
  };

  const headline =
    stage === 'placing' ? t('setup.placing')
    : stage === 'calibrating' ? t('setup.calibrate')
    : stage === 'ready' ? t('setup.placed')
    : t('setup.calibrationFailed');

  return (
    <CameraGate busy={busy} onBack={() => router.back()}>
      <View style={styles.fill} onLayout={(e) => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
        <Camera style={styles.fill} device="front" isActive outputs={[pipeline.frameOutput]} onError={() => setBusy(true)} />
        <Skeleton
          landmarks={pipeline.landmarks}
          frameAspect={pipeline.frameAspect}
          width={size.width}
          height={size.height}
          mirror={MIRROR_PREVIEW}
          color={stage === 'placing' ? tokens.warn : tokens.accent}
        />
        <View style={styles.panel}>
          <Text style={styles.title}>{t(`exercise.${exercise}`)}</Text>
          <Text style={styles.headline}>{headline}</Text>
          {message !== null && stage !== 'ready' ? <Text style={styles.message}>{t(`feedback.${message}`)}</Text> : null}
          {stage === 'calibrating' ? <Text style={styles.text}>{t('setup.calibrateRep', { n: Math.min(3, calReps + 1) })}</Text> : null}
          {stage === 'ready' ? (
            <Pressable style={styles.button} onPress={goLive}>
              <Text style={styles.buttonText}>{t('setup.start')}</Text>
            </Pressable>
          ) : null}
          {stage === 'failed' ? (
            <Pressable style={styles.button} onPress={useStandard}>
              <Text style={styles.buttonText}>{t('setup.useStandard')}</Text>
            </Pressable>
          ) : null}
          {stage !== 'ready' && stage !== 'failed' ? (
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
  panel: { position: 'absolute', left: 16, right: 16, bottom: 32, backgroundColor: tokens.overlay, borderRadius: tokens.radius, padding: 16, gap: 8 },
  title: { color: tokens.muted, fontSize: 15 },
  headline: { color: tokens.text, fontSize: 20, fontWeight: '700' },
  message: { color: tokens.warn, fontSize: 16 },
  text: { color: tokens.text, fontSize: 16 },
  button: { backgroundColor: tokens.accent, padding: 14, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: tokens.onAccent, fontWeight: '700', fontSize: 16 },
  link: { color: tokens.muted, fontSize: 15, padding: 6, textAlign: 'center' },
});
