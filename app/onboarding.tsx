import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import '@/i18n';
import { loginAvailable, signInWithGoogle } from '@/auth/accountService';
import { birthDateFrom, isAdult } from '@/auth/age';
import { signInMessageKey } from '@/auth/signInError';
import { AGE_BLOCKED_KEY, deviceTimeZone } from '@/data/account';
import { getStore } from '@/data/storeProvider';
import type { FitnessLevel } from '@/features/profile/prefs';
import { stepAfterLogin } from '@/features/profile/onboardingSteps';
import { loadPrefs, savePrefs } from '@/features/profile/prefsStore';
import { calendarDate } from '@/gamification/localDate';
import { Body, Button, Choice, H1, Screen } from '@/ui/kit';
import { RadarMark } from '@/ui/RadarMark';
import { fonts, tokens, type } from '@/ui/tokens';

type Step = 'welcome' | 'birth' | 'blocked' | 'level' | 'goal';
const LEVELS: readonly FitnessLevel[] = ['beginner', 'regular', 'advanced'];
const GOALS = [2, 3, 4, 5] as const;

/**
 * Onboarding (producto §2): bienvenida, fecha de nacimiento (solo 18+; el bloqueo se recuerda), nivel y días por
 * semana. La cámara se pide al primer entrenamiento y el aviso médico antes de él. El login llega tras la primera sesión.
 */
export default function OnboardingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [step, setStep] = useState<Step>('welcome');
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [level, setLevel] = useState<FitnessLevel>('beginner');
  const [goal, setGoal] = useState(3);
  const [signInBusy, setSignInBusy] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  // "Ya tengo cuenta": entra con Google y sigue donde toque; la edad se pide si no hay fecha local (H6).
  const signIn = async () => {
    setSignInBusy(true);
    setSignInError(null);
    const result = await signInWithGoogle();
    setSignInBusy(false);
    if (result !== 'ok') return setSignInError(signInMessageKey(result));
    const next = stepAfterLogin(await loadPrefs(getStore()));
    if (next === 'done') router.replace('/');
    else setStep(next);
  };

  useEffect(() => {
    void getStore()
      .getKv(AGE_BLOCKED_KEY)
      .then((v) => v !== null && setStep('blocked'));
  }, []);

  const submitBirth = async () => {
    const today = calendarDate(Date.now(), deviceTimeZone());
    const birth = birthDateFrom(day, month, year, today);
    if (birth === null) return setInvalid(true);
    if (!isAdult(birth, today)) {
      // No se guarda la fecha de un menor; solo que el acceso está bloqueado.
      await getStore().setKv(AGE_BLOCKED_KEY, '1');
      return setStep('blocked');
    }
    await savePrefs(getStore(), { birthDate: birth });
    setStep('level');
  };

  const finish = async () => {
    await savePrefs(getStore(), { fitnessLevel: level, weeklyGoalDays: goal, onboardedAt: new Date().toISOString() });
    router.replace('/');
  };

  if (step === 'welcome') {
    return (
      <View style={styles.welcome}>
        <View style={styles.brand}>
          <RadarMark />
          <Text style={styles.wordmark}>
            {t('common.appName')}
            <Text style={styles.wordmarkDot}>.</Text>
          </Text>
          <Text style={styles.tagline}>{t('onboarding.tagline').toUpperCase()}</Text>
        </View>
        <Text style={styles.welcomeTitle}>{t('onboarding.welcomeTitle')}</Text>
        <Body tone="muted">{t('onboarding.welcomeBody')}</Body>
        <View style={styles.actions}>
          <Button label={t('onboarding.start')} onPress={() => setStep('birth')} />
          {loginAvailable() ? <Button kind="secondary" disabled={signInBusy} label={t('onboarding.haveAccount')} onPress={() => void signIn()} /> : null}
          {signInError !== null ? <Body tone="warn">{t(signInError)}</Body> : null}
        </View>
      </View>
    );
  }
  if (step === 'blocked') {
    return (
      <Screen>
        <H1>{t('onboarding.blockedTitle')}</H1>
        <Body tone="muted">{t('onboarding.blockedBody')}</Body>
      </Screen>
    );
  }
  if (step === 'birth') {
    const field = (value: string, set: (v: string) => void, label: string, max: number) => (
      <View style={styles.field}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
          value={value}
          onChangeText={(v) => {
            setInvalid(false);
            set(v.replace(/\D/g, '').slice(0, max));
          }}
          keyboardType="number-pad"
          maxLength={max}
          accessibilityLabel={label}
          style={styles.input}
        />
      </View>
    );
    return (
      <Screen>
        <H1>{t('onboarding.birthTitle')}</H1>
        <View style={styles.row}>
          {field(day, setDay, t('onboarding.day'), 2)}
          {field(month, setMonth, t('onboarding.month'), 2)}
          {field(year, setYear, t('onboarding.year'), 4)}
        </View>
        {invalid ? <Body tone="warn">{t('onboarding.invalid')}</Body> : null}
        <Button label={t('onboarding.next')} disabled={year.length < 4} onPress={() => void submitBirth()} />
      </Screen>
    );
  }
  if (step === 'level') {
    return (
      <Screen>
        <H1>{t('onboarding.levelTitle')}</H1>
        {LEVELS.map((l) => (
          <Choice key={l} label={t(`fitnessLevel.${l}`)} selected={level === l} onPress={() => setLevel(l)} />
        ))}
        <Button label={t('onboarding.next')} onPress={() => setStep('goal')} />
      </Screen>
    );
  }
  return (
    <Screen>
      <H1>{t('onboarding.goalTitle')}</H1>
      <View style={styles.row}>
        {GOALS.map((g) => (
          <View key={g} style={styles.field}>
            <Choice label={String(g)} selected={goal === g} onPress={() => setGoal(g)} />
          </View>
        ))}
      </View>
      <Body tone="muted">{t('onboarding.goalHint')}</Body>
      <Button label={t('onboarding.finish')} onPress={() => void finish()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  welcome: { flex: 1, backgroundColor: tokens.bg, justifyContent: 'center', paddingHorizontal: 24, gap: 16 },
  brand: { alignItems: 'center', gap: 12, marginBottom: 16 },
  wordmark: { fontFamily: fonts.title, color: tokens.text, fontSize: 28, letterSpacing: 8 },
  wordmarkDot: { color: tokens.accent },
  tagline: { ...type.labelCaps, color: tokens.muted, letterSpacing: 2.4 },
  welcomeTitle: { ...type.displayMd, color: tokens.text, textAlign: 'center' },
  actions: { gap: 12, marginTop: 8 },
  row: { flexDirection: 'row', gap: 8 },
  field: { flex: 1, gap: 4 },
  label: { fontFamily: fonts.label, color: tokens.muted, fontSize: 13 },
  input: {
    fontFamily: fonts.strong,
    color: tokens.text,
    fontSize: 20,
    backgroundColor: tokens.card,
    borderWidth: 1,
    borderColor: tokens.border,
    borderRadius: tokens.radiusButton,
    padding: 12,
    textAlign: 'center',
  },
});
