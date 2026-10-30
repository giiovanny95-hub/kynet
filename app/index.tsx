import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import '@/i18n';
import { fonts, tokens } from '@/ui/tokens';

export default function Home() {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <View style={styles.brand}>
        <Text style={styles.wordmark}>{t('common.appName')}</Text>
        <Text style={styles.descriptor}>{t('common.descriptor')}</Text>
      </View>
      <Link href="/exercises" style={styles.primary}>
        {t('home.train')}
      </Link>
      {__DEV__ ? (
        <Link href="/spike" style={styles.link}>
          {t('home.openSpike')}
        </Link>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 32, backgroundColor: tokens.bg },
  brand: { alignItems: 'center', gap: 6 },
  wordmark: { fontFamily: fonts.title, color: tokens.text, fontSize: 40, letterSpacing: 10 },
  descriptor: { fontFamily: fonts.label, color: tokens.accent, fontSize: 12, letterSpacing: 4 },
  primary: {
    fontFamily: fonts.strong,
    color: tokens.onAccent,
    backgroundColor: tokens.accent,
    fontSize: 17,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: tokens.radiusButton,
    overflow: 'hidden',
  },
  link: { fontFamily: fonts.body, color: tokens.muted, fontSize: 16, padding: 12 },
});
