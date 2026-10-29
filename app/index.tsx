import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import '@/i18n';

export default function Home() {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <Text>{t('common.appName')}</Text>
      <Link href="/exercises" style={styles.link}>
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
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24 },
  link: { color: '#0a66c2', fontSize: 18, fontWeight: '600', padding: 12 },
});
