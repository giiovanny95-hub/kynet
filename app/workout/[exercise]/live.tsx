import { File, Paths } from 'expo-file-system';
import { useKeepAwake } from 'expo-keep-awake';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Camera } from 'react-native-vision-camera';

import { useFeedbackCues } from '@/audio/useFeedbackCues';
import { useVoice } from '@/audio/useVoice';
import { pickUtterance } from '@/audio/voicePolicy';
import { cachedPrefs } from '@/features/profile/prefsStore';
import { getProfile } from '@/features/workout/calibrationStore';
import { effectiveView } from '@/features/workout/exerciseView';
import { guideFor } from '@/features/workout/guides';
import { createHelp, helpStep } from '@/features/workout/techniqueHelp';
import { createToneState, toneAt, toneStep } from '@/features/workout/formTone';
import { currentPlan, isExercise } from '@/features/workout/plans';
import { useWorkoutSession } from '@/features/workout/useWorkoutSession';
import type { EngineEvent, EngineExercise } from '@/kinematics/engine';
import type { FeedbackCode } from '@/kinematics/feedback/codes';
import { CameraGate } from '@/ui/CameraGate';
import { GuideCard } from '@/ui/GuideCard';
import { Button } from '@/ui/kit';
import { Skeleton } from '@/ui/Skeleton';
import { toneBadge, toneColor } from '@/ui/toneColor';
import { fonts, tokens } from '@/ui/tokens';
import { takeArmedRecording } from '@/vision/fixtureRecorder';
import { useWorkoutPipeline } from '@/vision/useWorkoutPipeline';

const MESSAGE_MS = 3000;
const HUD_POLL_MS = 250;
const MIRROR_PREVIEW = true;
/** El contador ocupa el 20 % del alto de la pantalla: legible a 3 m (benchmark 2026-10-29). */
const COUNT_HEIGHT_RATIO = 0.2;
const TONE_BORDER = 8;
/** Sin esto la cámara frontal del Pixel 7 Pro entrega 24 FPS con luz de interior (medido el 2026-10-29). */
const CAMERA_CONSTRAINTS = [{ fps: 30 }];

/** Tiempo mínimo de la ayuda en pantalla (plan diseño v2, H4). */
const HELP_MIN_MS = 3000;

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
  const [view] = useState(() => effectiveView(exercise, cachedPrefs()));
  const { session, dispatch } = useWorkoutSession();
  const [message, setMessage] = useState<FeedbackCode | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [now, setNow] = useState(Date.now());
  const [pauseCode, setPauseCode] = useState<FeedbackCode | null>(null);
  // Ayuda tras 3 correcciones seguidas (plan diseño v2, H4): la única animación sobre la cámara, con la sesión en pausa.
  const [guide] = useState(() => guideFor(exercise, view));
  const help = useRef(createHelp());
  const [helpCode, setHelpCode] = useState<FeedbackCode | null | undefined>(undefined);
  const [hudNow, setHudNow] = useState(Date.now());
  const tone = useRef(createToneState());
  const { height: windowHeight } = useWindowDimensions();
  const phaseRef = useRef(session.phase);
  phaseRef.current = session.phase;
  const setRef = useRef({ repsInSet: session.repsInSet, repsPerSet: session.repsPerSet });
  setRef.current = { repsInSet: session.repsInSet, repsPerSet: session.repsPerSet };
  const voice = useVoice();
  const { onEvents: cues } = useFeedbackCues();
  // La pantalla no debe apagarse durante el entrenamiento: apagarla manda la app a segundo plano y pausa la sesión.
  useKeepAwake();

  useEffect(() => {
    const plan = currentPlan()[exercise];
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
      for (const e of events) {
        tone.current = toneStep(tone.current, e, nowMs);
        if (e.type === 'FEEDBACK') setMessage(e.code);
        // Solo desarrollo: la causa de cada pausa en el registro de Metro (C1 de B3, F0.3).
        if (__DEV__ && e.type === 'PAUSE') console.log(`[kynet] PAUSE ${e.cause ?? '?'} t=${Math.round(e.tMs)}`);
      }
      const prefs = cachedPrefs();
      for (const e of events) {
        const r = helpStep(help.current, e, nowMs, { enabled: prefs?.techniqueHelp ?? true, hasGuide: guide !== null });
        help.current = r.s;
        if (r.show) {
          dispatch({ type: 'pause', nowMs });
          setHelpCode(r.code);
          if (__DEV__) console.log(`[kynet] HELP ${r.code ?? '?'}`);
        }
      }
      cues(events);
      // El reductor aún no ha contado este lote: se suman aquí sus repeticiones válidas.
      const valid = events.filter((e) => e.type === 'REP' && e.outcome === 'valid').length;
      const u = pickUtterance(events, { repsInSet: setRef.current.repsInSet + valid, repsPerSet: setRef.current.repsPerSet });
      if (u !== null) voice.say(u);
    },
    [cues, dispatch, voice, guide],
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
  const closeHelp = useCallback(() => {
    setHelpCode(undefined);
    dispatch({ type: 'resume', nowMs: Date.now() });
  }, [dispatch]);
  // Se cierra sola tras una vuelta de la animación (mínimo 3 s) y reanuda.
  const helpOpen = helpCode !== undefined;
  useEffect(() => {
    if (!helpOpen || guide === null) return;
    const id = setTimeout(closeHelp, Math.max(guide.loopMs, HELP_MIN_MS));
    return () => clearTimeout(id);
  }, [helpOpen, guide, closeHelp]);
  const pipeline = useWorkoutPipeline({ exercise, profile, calibrating: false, view, onEvent, onRecording: __DEV__ ? onRecording : undefined });
  const [recording, setRecording] = useState(false);
  const toggleRecording = () => {
    pipeline.recording.value = !recording;
    setRecording(!recording);
  };
  // Solo desarrollo: si la colocación armó la grabación, empieza con el primer cuadro (antes de la primera repetición).
  useEffect(() => {
    if (__DEV__ && takeArmedRecording()) {
      pipeline.recording.value = true;
      setRecording(true);
    }
  }, [pipeline.recording]);
  const cameraOn = session.phase === 'active' || session.phase === 'rest' || session.phase === 'fatigue';
  const critical = pipeline.stats.targetFps === 0;

  // Térmica CRITICAL (arquitectura §7): se pausa la sesión y se sugiere descansar.
  useEffect(() => {
    if (critical && session.phase === 'active') dispatch({ type: 'pause', nowMs: Date.now() });
  }, [critical, session.phase, dispatch]);

  // La causa de la pausa del motor se muestra mientras dura (el HUD del worklet solo cambia cuando cambia algo).
  const { hud } = pipeline;
  useEffect(() => {
    const id = setInterval(() => {
      setPauseCode(hud.value.pauseCode);
      setHudNow(Date.now());
    }, HUD_POLL_MS);
    return () => clearInterval(id);
  }, [hud]);
  const last = session.reps[session.reps.length - 1];
  const warning = session.warnings[session.warnings.length - 1];
  const formTone = toneAt(tone.current, hudNow, session.phase);
  const formColor = toneColor(formTone);
  const badge = toneBadge(formTone);

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
        <Skeleton
          landmarks={pipeline.landmarks}
          frameAspect={pipeline.frameAspect}
          width={size.width}
          height={size.height}
          mirror={MIRROR_PREVIEW}
          color={formColor === 'transparent' ? tokens.accent : formColor}
        />
        <View pointerEvents="none" style={[styles.toneBorder, { borderColor: formColor }]} />

        <View style={styles.top}>
          <Pressable style={styles.chip} onPress={() => dispatch({ type: 'pause', nowMs: Date.now() })}>
            <Text style={styles.chipText}>{t('workout.pause')}</Text>
          </Pressable>
          <Pressable style={styles.chip} onPress={() => voice.setEnabled(!voice.enabled)}>
            <Text style={styles.chipText}>{voice.enabled ? t('voice.on') : t('voice.off')}</Text>
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
          {badge !== null ? (
            <Text style={[styles.badge, { borderColor: formColor, color: formColor }]}>{`${badge.glyph}  ${t(badge.labelKey)}`}</Text>
          ) : null}
          {pauseCode !== null && session.phase === 'active' ? (
            <Text style={styles.message}>{t(`feedback.${pauseCode}`)}</Text>
          ) : message !== null ? (
            <Text style={styles.message}>{t(`feedback.${message}`)}</Text>
          ) : null}
          <Text
            style={[styles.count, { fontSize: Math.round(COUNT_HEIGHT_RATIO * windowHeight), lineHeight: Math.round(COUNT_HEIGHT_RATIO * windowHeight * 1.1) }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {t('workout.reps', { reps: session.repsInSet, target: session.repsPerSet })}
          </Text>
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

        {session.phase === 'paused' && helpCode !== undefined && guide !== null ? (
          <View style={styles.cover}>
            <GuideCard exercise={exercise} guide={guide} compact note={helpCode !== null ? t(`feedback.${helpCode}`) : undefined}>
              <Button label={t('guide.continue')} onPress={closeHelp} />
            </GuideCard>
          </View>
        ) : session.phase === 'paused' ? (
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
  topText: { fontFamily: fonts.strong, color: tokens.text, fontSize: 15, fontVariant: ['tabular-nums'] },
  chip: { backgroundColor: tokens.overlay, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  chipText: { fontFamily: fonts.strong, color: tokens.text },
  // A la izquierda: a la derecha lo tapa el menú flotante de desarrollo de Expo.
  rec: { position: 'absolute', top: 88, left: 12 },
  banner: { fontFamily: fonts.strong, alignSelf: 'center', marginTop: 96, color: tokens.onAccent, backgroundColor: tokens.warn, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, overflow: 'hidden' },
  bottom: { position: 'absolute', left: 16, right: 16, bottom: 32, gap: 8, alignItems: 'center' },
  message: { fontFamily: fonts.strong, color: tokens.onAccent, backgroundColor: tokens.warn, fontSize: 18, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12, overflow: 'hidden' },
  count: { fontFamily: fonts.display, color: tokens.text, fontVariant: ['tabular-nums'], alignSelf: 'stretch', textAlign: 'center' },
  toneBorder: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderWidth: TONE_BORDER },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'stretch' },
  badge: { fontFamily: fonts.strong, fontSize: 16, borderWidth: 2, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: tokens.overlay, overflow: 'hidden' },
  small: { fontFamily: fonts.body, color: tokens.text, fontSize: 15 },
  bar: { flex: 1, height: 10, backgroundColor: tokens.overlay, borderRadius: 5, overflow: 'hidden' },
  barFill: { height: 10, backgroundColor: tokens.accent },
  cover: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: tokens.overlay, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 },
  coverTitle: { fontFamily: fonts.title, color: tokens.text, fontSize: 26, textAlign: 'center' },
  button: { backgroundColor: tokens.accent, paddingHorizontal: 24, paddingVertical: 12, borderRadius: tokens.radiusButton, minWidth: 220, alignItems: 'center' },
  buttonText: { fontFamily: fonts.strong, color: tokens.onAccent, fontSize: 16 },
  link: { fontFamily: fonts.body, color: tokens.muted, fontSize: 16, padding: 8 },
});
