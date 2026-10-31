import { Link, Redirect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { cachedPrefs } from '@/features/profile/prefsStore';
import { currentPlan, EXERCISES } from '@/features/workout/plans';
import { fonts, tokens } from '@/ui/tokens';

/** Elegir ejercicio (producto §3.2): tres tarjetas con la posición del móvil. */
export default function ExercisesScreen() {
  const { t } = useTranslation();
  const plan = currentPlan();
  // El aviso médico se acepta una vez, antes del primer entrenamiento (producto §2 y §5.4).
  if (cachedPrefs()?.medicalAcceptedAt == null) return <Redirect href={{ pathname: '/medical', params: { next: 'exercises' } }} />;
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
            <Text style={styles.muted}>{t('exercise.plan', { sets: plan[ex].sets, reps: plan[ex].reps })}</Text>
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
  title: { fontFamily: fonts.title, color: tokens.text, fontSize: 26, marginBottom: 8 },
  card: { backgroundColor: tokens.card, borderRadius: tokens.radius, borderWidth: 1, borderColor: tokens.border, padding: 16 },
  cardBody: { gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontFamily: fonts.title, color: tokens.text, fontSize: 20 },
  tag: { fontFamily: fonts.strong, color: tokens.onAccent, backgroundColor: tokens.accent, borderRadius: 8, paddingHorizontal: 8, overflow: 'hidden' },
  muted: { fontFamily: fonts.body, color: tokens.muted, fontSize: 15 },
  warn: { fontFamily: fonts.body, color: tokens.warn, fontSize: 14 },
});
