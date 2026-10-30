import type { PropsWithChildren, ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PressableScale } from './PressableScale';
import { ProgressBar } from './ProgressBar';
import { fonts, radius, space, tokens, type } from './tokens';

/** Piezas comunes de las pantallas fuera del entrenamiento. Colores y fuentes solo desde `tokens`. */

export function Screen({ children }: PropsWithChildren) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {children}
    </ScrollView>
  );
}

export function Card({ children }: PropsWithChildren) {
  return <View style={styles.card}>{children}</View>;
}

export function H1({ children }: { children: ReactNode }) {
  return <Text style={styles.h1}>{children}</Text>;
}

export function H2({ children }: { children: ReactNode }) {
  return <Text style={styles.h2}>{children}</Text>;
}

export function Body({ children, tone = 'text' }: { children: ReactNode; tone?: 'text' | 'muted' | 'accent' | 'warn' }) {
  const color = tone === 'muted' ? tokens.muted : tone === 'accent' ? tokens.accent : tone === 'warn' ? tokens.warn : tokens.text;
  return <Text style={[styles.body, { color }]}>{children}</Text>;
}

/**
 * Botones de tema.md: primario (teal, 52 dp), secundario (Slate con borde, 48 dp) y fantasma (sin borde, texto
 * gris). Todos escalan al pulsar; el primario además vibra.
 */
export function Button({ label, onPress, disabled = false, kind = 'primary' }: { label: string; onPress: () => void; disabled?: boolean; kind?: 'primary' | 'secondary' | 'ghost' }) {
  const color = kind === 'primary' ? tokens.onAccent : kind === 'secondary' ? tokens.text : tokens.muted;
  return (
    <PressableScale
      disabled={disabled}
      haptic={kind === 'primary'}
      onPress={onPress}
      style={[styles.button, kind === 'primary' ? styles.buttonPrimary : kind === 'secondary' ? styles.buttonSecondary : styles.buttonGhost, disabled && styles.disabled]}
    >
      <Text style={[styles.buttonText, { color }]}>{label}</Text>
    </PressableScale>
  );
}

/** Opción seleccionable (onboarding y perfil). */
export function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ selected }} onPress={onPress} style={[styles.choice, selected && styles.choiceOn]}>
      <Text style={[styles.body, { color: selected ? tokens.accent : tokens.text }]}>{label}</Text>
    </Pressable>
  );
}

// Componentes animados del diseño (E1), reexportados para que las pantallas importen todo desde `kit`.
export { AnimatedNumber } from './AnimatedNumber';
export { PressableScale } from './PressableScale';
export { ProgressBar };
export { ProgressRing } from './ProgressRing';
export { StaggerIn } from './StaggerIn';
export { StreakFlame } from './StreakFlame';
export { XpToast } from './XpToast';
export { Confetti } from './Confetti';
export { Segmented } from './Segmented';

/** Fila de misión: título, progreso y recompensa. */
export function MissionRow({ title, value, target, label, reward, done }: { title: string; value: number; target: number; label: string; reward: string; done: boolean }) {
  return (
    <View style={styles.mission}>
      <Text style={[styles.dot, { color: done ? tokens.success : tokens.muted }]}>{done ? '●' : '○'}</Text>
      <View style={styles.missionBody}>
        <Text style={styles.body}>{title}</Text>
        <Text style={styles.small}>{label}</Text>
        <ProgressBar value={value} max={target} />
      </View>
      <Text style={styles.reward}>{reward}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.bg },
  content: { padding: 16, paddingTop: 56, paddingBottom: 32, gap: 12 },
  card: { backgroundColor: tokens.card, borderRadius: radius.card, borderWidth: 1, borderColor: tokens.border, padding: space.lg, gap: space.sm },
  h1: { fontFamily: fonts.title, color: tokens.text, fontSize: 26 },
  h2: { fontFamily: fonts.heading, color: tokens.text, fontSize: 18 },
  body: { fontFamily: fonts.body, color: tokens.text, fontSize: 16 },
  small: { fontFamily: fonts.body, color: tokens.muted, fontSize: 13 },
  button: { minHeight: 48, paddingHorizontal: space.lg, borderRadius: radius.control, alignItems: 'center', justifyContent: 'center' },
  buttonPrimary: { minHeight: 52, backgroundColor: tokens.accent },
  buttonSecondary: { backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border },
  buttonGhost: { backgroundColor: 'transparent' },
  buttonText: { ...type.titleSm, fontFamily: fonts.strong },
  disabled: { opacity: 0.4 },
  choice: { padding: 16, borderRadius: tokens.radiusButton, borderWidth: 1, borderColor: tokens.border, backgroundColor: tokens.card },
  choiceOn: { borderColor: tokens.accent },
  mission: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dot: { fontSize: 18 },
  missionBody: { flex: 1, gap: 4 },
  reward: { fontFamily: fonts.strong, color: tokens.accent, fontSize: 14 },
});
