import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import type { GuideEntry } from '@/features/workout/guides';
import type { EngineExercise } from '@/kinematics/engine';

import { GUIDE_SOURCES } from './guideAssets';
import { tokens, type } from './tokens';
import { useMotion } from './useMotion';

/** Proporción del recuadro recortado de las guías del usuario (H1: 720×620 y 436×372). */
const GUIDE_ASPECT = 1.16;
const TIPS = ['tip1', 'tip2', 'tip3'] as const;

/**
 * "Así se hace" (plan diseño v2, H3-H4): la animación del usuario en bucle, con título y consejos por i18n.
 * Con "reducir movimiento", el primer cuadro fijo. `compact` es la tarjeta emergente sobre la sesión en pausa: sin
 * consejos y con `note` (la corrección) en su lugar.
 */
export function GuideCard({ exercise, guide, compact = false, note, children }: {
  readonly exercise: EngineExercise;
  readonly guide: GuideEntry;
  readonly compact?: boolean;
  readonly note?: string;
  readonly children?: ReactNode;
}) {
  const { t } = useTranslation();
  const { reduced } = useMotion();
  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>{t('guide.title').toUpperCase()}</Text>
      <Text style={styles.title}>{t(`exercise.${exercise}`)}</Text>
      <Image
        source={GUIDE_SOURCES[guide.key]}
        autoplay={!reduced}
        contentFit="contain"
        style={styles.animation}
        accessibilityLabel={t('guide.title')}
        onError={(e) => { if (__DEV__) console.warn(`[kynet] guía ${guide.key}: ${e.error}`); }}
      />
      {note !== undefined ? <Text style={styles.note}>{note}</Text> : null}
      {compact ? null : (
        <View style={styles.tips}>
          {TIPS.map((k) => (
            <View key={k} style={styles.tip}>
              <Text style={styles.tipTitle}>{t(`guide.${exercise}.${k}.title`)}</Text>
              <Text style={styles.tipText}>{t(`guide.${exercise}.${k}.text`)}</Text>
            </View>
          ))}
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: tokens.card, borderColor: tokens.border, borderWidth: 1, borderRadius: tokens.radius, padding: 16, gap: 12 },
  kicker: { ...type.labelCaps, color: tokens.accent },
  title: { ...type.headlineLg, color: tokens.text },
  animation: { width: '100%', aspectRatio: GUIDE_ASPECT, borderRadius: tokens.radiusButton, backgroundColor: tokens.bg },
  note: { ...type.titleSm, color: tokens.warn },
  tips: { gap: 10 },
  tip: { borderTopColor: tokens.border, borderTopWidth: 1, paddingTop: 10, gap: 2 },
  tipTitle: { ...type.titleSm, color: tokens.text },
  tipText: { ...type.bodySm, color: tokens.muted },
});
