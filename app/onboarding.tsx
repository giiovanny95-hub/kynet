import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import '@/i18n';
import { birthDateFrom, isAdult } from '@/auth/age';
import { AGE_BLOCKED_KEY, deviceTimeZone } from '@/data/account';
import { getStore } from '@/data/storeProvider';
import type { FitnessLevel } from '@/features/profile/prefs';
import { savePrefs } from '@/features/profile/prefsStore';
import { calendarDate } from '@/gamification/localDate';
import { Body, Button, Choice, H1, Screen } from '@/ui/kit';
import { fonts, tokens } from '@/ui/tokens';

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
      <Screen>
        <Text style={styles.wordmark}>{t('common.appName')}</Text>
        <H1>{t('onboarding.welcomeTitle')}</H1>
        <Body tone="muted">{t('onboarding.welcomeBody')}</Body>
        <Button label={t('onboarding.start')} onPress={() => setStep('birth')} />
      </Screen>
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
  wordmark: { fontFamily: fonts.title, color: tokens.text, fontSize: 32, letterSpacing: 8, marginBottom: 24 },
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
