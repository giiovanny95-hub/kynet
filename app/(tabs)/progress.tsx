import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { EXERCISES } from '@/features/workout/plans';
import { useGameState } from '@/features/progress/useGameState';
import { addDays } from '@/gamification/localDate';
import { aggregateDays, isQualified } from '@/gamification/streak';
import { Body, Card, H1, H2, Screen } from '@/ui/kit';
import { LoadingSkeleton } from '@/ui/LoadingSkeleton';
import { fonts, tokens } from '@/ui/tokens';

/** Progreso (producto §3.6), versión MVP: rachas, totales, últimos 7 días y forma media por ejercicio. */
export default function ProgressScreen() {
  const { t } = useTranslation();
  const { data } = useGameState();
  if (data === null) return <LoadingSkeleton />;
  const { game, sessions, today } = data;
  const byDay = new Map(aggregateDays(sessions).map((d) => [d.date, d]));
  const last7 = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const totalReps = sessions.reduce((n, s) => n + s.repsValid, 0);
  const formOf = (ex: string) => {
    const list = sessions.filter((s) => s.exercise === ex && s.repsValid > 0);
    return list.length === 0 ? null : Math.round(list.reduce((n, s) => n + s.avgFormScore, 0) / list.length);
  };
  return (
    <Screen>
      <H1>{t('progress.title')}</H1>
      {sessions.length === 0 ? <Body tone="muted">{t('progress.empty')}</Body> : null}
      <Card>
        <Stat label={t('progress.current')} value={t('progress.days', { count: game.streak.current })} />
        <Stat label={t('progress.longest')} value={t('progress.days', { count: game.streak.longest })} />
        <Stat label={t('progress.totalXp')} value={String(game.totalXp)} />
        <Stat label={t('progress.totalReps')} value={String(totalReps)} />
        <Stat label={t('progress.sessions')} value={String(sessions.length)} />
      </Card>
      <Card>
        <H2>{t('progress.last7')}</H2>
        <View style={styles.week}>
          {last7.map((d) => {
            const a = byDay.get(d);
            const on = a !== undefined && isQualified(a);
            return (
              <View key={d} style={[styles.day, on && styles.dayOn, a !== undefined && !on && styles.dayPartial]}>
                <Text style={[styles.dayText, on && styles.dayTextOn]}>{d.slice(8)}</Text>
              </View>
            );
          })}
        </View>
      </Card>
      <Card>
        <H2>{t('progress.byExercise')}</H2>
        {EXERCISES.map((ex) => {
          const f = formOf(ex);
          return <Stat key={ex} label={t(`exercise.${ex}`)} value={f === null ? t('progress.noData') : `${f} %`} />;
        })}
      </Card>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Body tone="muted">{label}</Body>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stat: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  value: { fontFamily: fonts.title, color: tokens.text, fontSize: 18 },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.surface },
  dayOn: { backgroundColor: tokens.accent },
  dayPartial: { borderWidth: 1, borderColor: tokens.accent },
  dayText: { fontFamily: fonts.label, color: tokens.muted, fontSize: 13 },
  dayTextOn: { color: tokens.onAccent },
});
