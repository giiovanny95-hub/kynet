import { Redirect, useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LOCAL_USER } from '@/data/account';
import { useGameState } from '@/features/progress/useGameState';
import { getLastSession } from '@/features/workout/useWorkoutSession';
import { provisionalState } from '@/gamification/provisional';
import { levelProgress } from '@/gamification/xp';
import { ProgressBar } from '@/ui/kit';
import { fonts, tokens } from '@/ui/tokens';

const SHORT_REPS = 20;

/** Resumen de la sesión (producto §3.5): repeticiones, forma, XP ganado (provisional), racha, nivel y misiones. */
export default function SummaryScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const last = getLastSession();
  const { data, refresh } = useGameState();
  useEffect(() => {
    // El guardado local es asíncrono: se recalcula cuando termina.
    void last?.saved.then(refresh);
  }, [last, refresh]);
  const gained = useMemo(() => {
    if (data === null || last?.savedId == null || !data.sessions.some((x) => x.id === last.savedId)) return null;
    const ctx = { userId: data.userId ?? LOCAL_USER, today: data.today, weeklyGoalDays: data.prefs.weeklyGoalDays };
    const before = provisionalState(
      data.sessions.filter((x) => x.id !== last.savedId),
      ctx,
    );
    const was = new Set(before.assignments.filter((a) => a.completed).map((a) => a.code));
    return { xp: data.game.totalXp - before.totalXp, missions: data.game.assignments.filter((a) => a.completed && !was.has(a.code)) };
  }, [data, last]);
  if (last === null) return <Redirect href="/" />;
  const s = last.state;
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
      {gained !== null && data !== null ? (
        <View style={styles.game}>
          <View style={styles.row}>
            <Text style={styles.xp}>{t('summaryGame.xp', { n: gained.xp })}</Text>
            <Text style={styles.streak}>{t('summaryGame.streak', { n: data.game.streak.current })}</Text>
          </View>
          {gained.missions.map((m) => (
            <Text key={m.code} style={styles.mission}>
              {t('summaryGame.missionDone', { title: t(`missions.code.${m.code}`, { target: m.target }) })}
            </Text>
          ))}
          <Text style={styles.muted}>{t('level.label', { n: levelProgress(data.game.totalXp).level })}</Text>
          <ProgressBar value={levelProgress(data.game.totalXp).current} max={levelProgress(data.game.totalXp).span} />
          <Text style={styles.muted}>{t('summaryGame.savedLocal')}</Text>
        </View>
      ) : null}
      <Pressable style={styles.button} onPress={() => router.replace('/')}>
        <Text style={styles.buttonText}>{t('summary.done')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.bg, padding: 24, paddingTop: 72, gap: 12 },
  title: { fontFamily: fonts.display, color: tokens.text, fontSize: 30, marginBottom: 8 },
  line: { fontFamily: fonts.body, color: tokens.text, fontSize: 20 },
  tip: { fontFamily: fonts.body, color: tokens.accent, fontSize: 18, marginTop: 8 },
  muted: { fontFamily: fonts.body, color: tokens.muted, fontSize: 15 },
  game: { backgroundColor: tokens.card, borderRadius: tokens.radius, borderWidth: 1, borderColor: tokens.border, padding: 16, gap: 8, marginTop: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  xp: { fontFamily: fonts.display, color: tokens.accent, fontSize: 28 },
  streak: { fontFamily: fonts.strong, color: tokens.warn, fontSize: 18 },
  mission: { fontFamily: fonts.body, color: tokens.success, fontSize: 16 },
  button: { backgroundColor: tokens.accent, padding: 16, borderRadius: tokens.radiusButton, alignItems: 'center', marginTop: 24 },
  buttonText: { fontFamily: fonts.strong, color: tokens.onAccent, fontSize: 17 },
});
