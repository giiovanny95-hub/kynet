import { useTranslation } from 'react-i18next';

import { useGameState } from '@/features/progress/useGameState';
import { DAILY_ALL_BONUS } from '@/gamification/missions';
import type { AssignmentView } from '@/gamification/provisional';
import { Body, Card, H1, H2, MissionRow, Screen } from '@/ui/kit';
import { LoadingSkeleton } from '@/ui/LoadingSkeleton';

/** Misiones (producto §3.7): diarias y semanales con progreso y recompensa. */
export default function MissionsScreen() {
  const { t } = useTranslation();
  const { data } = useGameState();
  if (data === null) return <LoadingSkeleton />;
  const daily = data.game.assignments.filter((a) => a.scope === 'daily');
  const weekly = data.game.assignments.filter((a) => a.scope === 'weekly');
  const row = (a: AssignmentView) => (
    <MissionRow
      key={a.code}
      title={t(`missions.code.${a.code}`, { target: a.target })}
      value={a.progress}
      target={a.target}
      label={t('missions.progress', { cur: a.progress, target: a.target })}
      reward={t('missions.reward', { xp: a.xpReward })}
      done={a.completed}
    />
  );
  const allDaily = daily.length > 0 && daily.every((a) => a.completed);
  return (
    <Screen>
      <H1>{t('missions.title')}</H1>
      <Card>
        <H2>{t('missions.daily')}</H2>
        {daily.map(row)}
        <Body tone={allDaily ? 'accent' : 'muted'}>{allDaily ? t('missions.allDone', { xp: DAILY_ALL_BONUS }) : t('missions.bonusHint', { xp: DAILY_ALL_BONUS })}</Body>
      </Card>
      <Card>
        <H2>{t('missions.weekly')}</H2>
        {weekly.map(row)}
      </Card>
      {data.confirmed ? null : <Body tone="muted">{t('today.provisional')}</Body>}
    </Screen>
  );
}
