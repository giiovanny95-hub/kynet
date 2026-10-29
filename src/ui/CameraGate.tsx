import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useCameraPermission } from 'react-native-vision-camera';

import { tokens } from './tokens';

interface Props {
  readonly busy?: boolean;
  readonly onBack: () => void;
  readonly children: ReactNode;
}

/** Muestra la pantalla de permiso o de cámara ocupada; si todo está bien, el contenido. */
export function CameraGate({ busy = false, onBack, children }: Props) {
  const { t } = useTranslation();
  const { hasPermission, canRequestPermission, requestPermission } = useCameraPermission();
  if (hasPermission && !busy) return <>{children}</>;
  return (
    <View style={styles.center}>
      <Text style={styles.text}>{busy ? t('camera.busy') : t('camera.permissionNeeded')}</Text>
      {!busy && canRequestPermission ? (
        <Pressable style={styles.button} onPress={() => void requestPermission()}>
          <Text style={styles.buttonText}>{t('camera.grant')}</Text>
        </Pressable>
      ) : null}
      {!busy && !canRequestPermission ? (
        <Pressable style={styles.button} onPress={() => void Linking.openSettings()}>
          <Text style={styles.buttonText}>{t('camera.openSettings')}</Text>
        </Pressable>
      ) : null}
      <Pressable onPress={onBack}>
        <Text style={styles.link}>{t('camera.back')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, backgroundColor: tokens.bg },
  text: { color: tokens.text, fontSize: 17, textAlign: 'center' },
  button: { backgroundColor: tokens.accent, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  buttonText: { color: tokens.onAccent, fontWeight: '700', fontSize: 16 },
  link: { color: tokens.muted, fontSize: 16, padding: 8 },
});
