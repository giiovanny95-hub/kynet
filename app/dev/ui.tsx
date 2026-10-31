import { Redirect } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import '@/i18n';
import { AnimatedNumber, Button, Card, Confetti, ProgressBar, ProgressRing, Segmented, SkeletonBlock, StaggerIn, StreakFlame, XpToast } from '@/ui/kit';
import { space, tokens, type } from '@/ui/tokens';

type Period = 'week' | 'month' | 'quarter';

/**
 * Muestrario de componentes del diseño (E1.8), solo en desarrollo: capturas y medición de cuadros lentos con
 * `adb shell dumpsys gfxinfo com.kynet.app.dev` mientras se recorre y se pulsan los botones.
 */
export default function UiKitScreen() {
  const { t } = useTranslation();
  const [n, setN] = useState(0);
  const [period, setPeriod] = useState<Period>('week');
  const [confetti, setConfetti] = useState(0);
  if (!__DEV__) return <Redirect href="/" />;
  const progress = (n % 5) / 4;
  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t('devUi.title')}</Text>
        <Card>
          <Text style={styles.h}>{t('devUi.numbers')}</Text>
          <View style={styles.row}>
            <AnimatedNumber value={n * 37} style={styles.metric} />
            <StreakFlame alive />
            <StreakFlame alive atRisk />
            <StreakFlame alive={false} />
          </View>
          <XpToast label={t('devUi.xp', { xp: 20 })} trigger={n} />
          <Button label={t('devUi.next')} onPress={() => setN((v) => v + 1)} />
        </Card>
        <Card>
          <Text style={styles.h}>{t('devUi.progress')}</Text>
          <ProgressBar value={progress} max={1} />
          <View style={styles.row}>
            <ProgressRing progress={progress}>
              <AnimatedNumber value={Math.round(progress * 100)} style={styles.small} format={(v) => `${v} %`} />
            </ProgressRing>
          </View>
        </Card>
        <Card>
          <Text style={styles.h}>{t('devUi.controls')}</Text>
          <Segmented<Period>
            options={[
              { key: 'week', label: t('devUi.week') },
              { key: 'month', label: t('devUi.month') },
              { key: 'quarter', label: t('devUi.quarter') },
            ]}
            value={period}
            onChange={setPeriod}
          />
          <Button kind="secondary" label={t('devUi.confetti')} onPress={() => setConfetti((v) => v + 1)} />
          <Button kind="ghost" label={t('devUi.ghost')} onPress={() => setN(0)} />
        </Card>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <StaggerIn key={`${period}-${i}`} index={i}>
            <Card>
              <Text style={styles.small}>{t('devUi.item', { n: i + 1 })}</Text>
            </Card>
          </StaggerIn>
        ))}
        <Card>
          <Text style={styles.h}>{t('devUi.loading')}</Text>
          <SkeletonBlock height={24} width="60%" />
          <SkeletonBlock height={64} />
        </Card>
      </ScrollView>
      {confetti > 0 ? <Confetti key={confetti} seed={confetti} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: tokens.bg },
  title: { ...type.displayMd, color: tokens.text },
  content: { padding: space.lg, paddingTop: 56, gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  h: { ...type.titleSm, color: tokens.text },
  metric: { ...type.metricMd, color: tokens.text },
  small: { ...type.bodySm, color: tokens.text },
});
