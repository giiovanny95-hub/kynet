import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import '@/i18n';

export default function Home() {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <Text>{t('common.appName')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
