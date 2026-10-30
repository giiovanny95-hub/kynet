import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { getStore } from '@/data/storeProvider';
import { useGameState } from '@/features/progress/useGameState';
import type { FitnessLevel, Prefs } from '@/features/profile/prefs';
import { savePrefs } from '@/features/profile/prefsStore';
import { levelProgress } from '@/gamification/xp';
import { Body, Button, Card, Choice, H1, H2, ProgressBar, Screen } from '@/ui/kit';

const LEVELS: readonly FitnessLevel[] = ['beginner', 'regular', 'advanced'];
const GOALS = [2, 3, 4, 5] as const;

/** Perfil (producto §3.8), versión sin login: nivel, ajustes de entrenamiento, privacidad y aviso médico. */
export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data, refresh } = useGameState();
  if (data === null) return <Screen />;
  const lp = levelProgress(data.game.totalXp);
  const set = (patch: Partial<Prefs>) => void savePrefs(getStore(), patch).then(refresh);
  return (
    <Screen>
      <H1>{t('profile.title')}</H1>
      <Card>
        <H2>{t('level.label', { n: lp.level })}</H2>
        <ProgressBar value={lp.current} max={lp.span} />
        <Body tone="muted">{t('level.xp', { cur: lp.current, next: lp.span })}</Body>
      </Card>
      <Card>
        <H2>{t('profile.account')}</H2>
        <Body>{t('profile.saveProgress')}</Body>
        <Body tone="muted">{t('profile.soon')}</Body>
      </Card>
      <Card>
        <H2>{t('profile.fitnessLevel')}</H2>
        {LEVELS.map((l) => (
          <Choice key={l} label={t(`fitnessLevel.${l}`)} selected={data.prefs.fitnessLevel === l} onPress={() => set({ fitnessLevel: l })} />
        ))}
      </Card>
      <Card>
        <H2>{t('profile.weeklyGoal')}</H2>
        <View style={styles.row}>
          {GOALS.map((g) => (
            <View key={g} style={styles.cell}>
              <Choice label={String(g)} selected={data.prefs.weeklyGoalDays === g} onPress={() => set({ weeklyGoalDays: g })} />
            </View>
          ))}
        </View>
      </Card>
      <Card>
        <H2>{t('profile.voice')}</H2>
        <View style={styles.row}>
          <View style={styles.cell}>
            <Choice label={t('profile.on')} selected={data.prefs.voice} onPress={() => set({ voice: true })} />
          </View>
          <View style={styles.cell}>
            <Choice label={t('profile.off')} selected={!data.prefs.voice} onPress={() => set({ voice: false })} />
          </View>
        </View>
      </Card>
      <Card>
        <Body tone="muted">{t('profile.privacy')}</Body>
      </Card>
      <Button kind="ghost" label={t('profile.medical')} onPress={() => router.push('/medical')} />
      {__DEV__ ? <Button kind="ghost" label={t('profile.devSpike')} onPress={() => router.push('/spike')} /> : null}
      <Body tone="muted">{t('profile.version', { v: Constants.expoConfig?.version ?? '' })}</Body>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  cell: { flex: 1 },
});
