import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { DEFAULT_PLAN, EXERCISES } from '@/features/workout/plans';
import { tokens } from '@/ui/tokens';

/** Elegir ejercicio (producto §3.2): tres tarjetas con la posición del móvil. */
export default function ExercisesScreen() {
  const { t } = useTranslation();
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('exercise.choose')}</Text>
      {EXERCISES.map((ex) => (
        <Link key={ex} href={{ pathname: '/workout/[exercise]/setup', params: { exercise: ex } }} style={styles.card}>
          <View style={styles.cardBody}>
            <View style={styles.row}>
              <Text style={styles.name}>{t(`exercise.${ex}`)}</Text>
              {ex === 'pushUp' ? <Text style={styles.tag}>{t('exercise.sideTag')}</Text> : null}
            </View>
            <Text style={styles.muted}>{t(`exercise.position.${ex}`)}</Text>
            <Text style={styles.muted}>{t('exercise.plan', { sets: DEFAULT_PLAN[ex].sets, reps: DEFAULT_PLAN[ex].reps })}</Text>
            {ex === 'jumpingJack' ? <Text style={styles.warn}>{t('exercise.impact')}</Text> : null}
          </View>
        </Link>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.bg },
  content: { padding: 16, paddingTop: 56, gap: 12 },
  title: { color: tokens.text, fontSize: 26, fontWeight: '700', marginBottom: 8 },
  card: { backgroundColor: tokens.card, borderRadius: tokens.radius, padding: 16 },
  cardBody: { gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { color: tokens.text, fontSize: 20, fontWeight: '700' },
  tag: { color: tokens.onAccent, backgroundColor: tokens.accent, borderRadius: 8, paddingHorizontal: 8, overflow: 'hidden', fontWeight: '700' },
  muted: { color: tokens.muted, fontSize: 15 },
  warn: { color: tokens.warn, fontSize: 14 },
});
