import { Redirect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getLastSession } from '@/features/workout/useWorkoutSession';
import { tokens } from '@/ui/tokens';

const SHORT_REPS = 20;

/** Resumen de la sesión (producto §3.5), sin XP ni racha (parte 6). */
export default function SummaryScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const s = getLastSession();
  if (s === null) return <Redirect href="/" />;
  const pct = (n: number) => (s.validReps > 0 ? Math.round((100 * n) / s.validReps) : 0);
  const avgForm = s.reps.length > 0 ? Math.round(s.reps.reduce((a, r) => a + r.formScore, 0) / s.reps.length) : 0;
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{s.validReps > 0 ? t('summary.title') : t('summary.titleEmpty')}</Text>
      <Text style={styles.line}>{t('summary.reps', { n: s.validReps })}</Text>
      <Text style={styles.line}>{t('summary.clean', { n: s.cleanReps, pct: pct(s.cleanReps) })}</Text>
      <Text style={styles.line}>{t('summary.form', { pct: avgForm })}</Text>
      <Text style={styles.tip}>{s.topFault ? t('summary.tip', { tip: t(`feedback.${s.topFault}`) }) : t('summary.noTip')}</Text>
      {s.validReps < SHORT_REPS ? <Text style={styles.muted}>{t('summary.short')}</Text> : null}
      <Pressable style={styles.button} onPress={() => router.replace('/')}>
        <Text style={styles.buttonText}>{t('summary.done')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.bg, padding: 24, paddingTop: 72, gap: 12 },
  title: { color: tokens.text, fontSize: 30, fontWeight: '800', marginBottom: 8 },
  line: { color: tokens.text, fontSize: 20 },
  tip: { color: tokens.accent, fontSize: 18, marginTop: 8 },
  muted: { color: tokens.muted, fontSize: 15 },
  button: { backgroundColor: tokens.accent, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  buttonText: { color: tokens.onAccent, fontWeight: '700', fontSize: 17 },
});
