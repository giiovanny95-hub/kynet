import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { EXERCISES, planFor } from '@/features/workout/plans';
import { useGameState } from '@/features/progress/useGameState';
import { DAILY_ALL_BONUS } from '@/gamification/missions';
import { aggregateDays, isQualified, QUALIFY_REPS, QUALIFY_SECONDS } from '@/gamification/streak';
import { levelProgress } from '@/gamification/xp';
import { Body, Button, Card, H2, MissionRow, ProgressBar, Screen } from '@/ui/kit';
import { fonts, tokens } from '@/ui/tokens';

/** Hoy (producto §3.1): racha, nivel, meta del día, entreno sugerido y misiones diarias. */
export default function TodayScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data } = useGameState();
  if (data === null) return <Screen />;
  const { game, prefs, sessions, today } = data;
  const lp = levelProgress(game.totalXp);
  const day = aggregateDays(sessions).find((d) => d.date === today) ?? { date: today, validReps: 0, activeSeconds: 0 };
  const done = isQualified(day);
  const plan = planFor(prefs.fitnessLevel);
  const daily = game.assignments.filter((a) => a.scope === 'daily');
  const streakLine =
    game.streak.current === 0 ? t('today.streakStart') : done ? t('today.dayDone') : game.streak.atRisk ? t('today.atRisk') : null;
  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.wordmark}>{t('common.appName')}</Text>
        <Text style={styles.streak}>{t('today.streak', { count: game.streak.current })}</Text>
      </View>
      {streakLine !== null ? <Body tone="muted">{streakLine}</Body> : null}
      <Card>
        <H2>{t('level.label', { n: lp.level })}</H2>
        <ProgressBar value={lp.current} max={lp.span} />
        <Body tone="muted">{t('level.xp', { cur: lp.current, next: lp.span })}</Body>
      </Card>
      <Card>
        <Body>{t('today.dayGoal', { reps: Math.min(day.validReps, QUALIFY_REPS), min: Math.floor(Math.min(day.activeSeconds, QUALIFY_SECONDS) / 60) })}</Body>
        <ProgressBar value={Math.max(day.validReps / QUALIFY_REPS, day.activeSeconds / QUALIFY_SECONDS)} max={1} />
      </Card>
      <Card>
        <H2>{t('today.planTitle')}</H2>
        {EXERCISES.map((ex) => (
          <Body key={ex}>{t('today.planLine', { sets: plan[ex].sets, reps: plan[ex].reps, exercise: t(`exercise.${ex}`) })}</Body>
        ))}
        <Button label={t('today.start')} onPress={() => router.push('/exercises')} />
      </Card>
      <Card>
        <H2>{t('today.missionsTitle', { done: daily.filter((a) => a.completed).length, total: daily.length })}</H2>
        {daily.map((a) => (
          <MissionRow
            key={a.code}
            title={t(`missions.code.${a.code}`, { target: a.target })}
            value={a.progress}
            target={a.target}
            label={t('missions.progress', { cur: a.progress, target: a.target })}
            reward={t('missions.reward', { xp: a.xpReward })}
            done={a.completed}
          />
        ))}
        <Body tone="muted">{t('missions.bonusHint', { xp: DAILY_ALL_BONUS })}</Body>
      </Card>
      {data.confirmed ? null : <Body tone="muted">{t('today.provisional')}</Body>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  wordmark: { fontFamily: fonts.title, color: tokens.text, fontSize: 22, letterSpacing: 6 },
  streak: { fontFamily: fonts.strong, color: tokens.warn, fontSize: 16 },
});
