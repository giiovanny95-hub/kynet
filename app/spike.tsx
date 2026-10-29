import { Redirect } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Camera, useCameraPermission } from 'react-native-vision-camera';

import { useSpikeCamera } from '@/vision/useSpikeCamera';

/** Pantalla de prueba de la parte 1 (solo desarrollo): cámara y métricas de cuadros. */
export default function SpikeScreen() {
  const { hasPermission, canRequestPermission, requestPermission } = useCameraPermission();
  const { frameOutput, metrics } = useSpikeCamera();

  if (!__DEV__) return <Redirect href="/" />;

  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <Text>Se necesita la cámara para la prueba.</Text>
        {canRequestPermission ? (
          <Pressable onPress={() => void requestPermission()}>
            <Text style={styles.link}>Dar permiso</Text>
          </Pressable>
        ) : (
          <Text>Actívala en Ajustes.</Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.fill}>
      <Camera style={styles.fill} device="front" isActive outputs={[frameOutput]} />
      <View style={styles.hud}>
        <Text style={styles.hudText}>FPS {metrics.fps.toFixed(1)}</Text>
        <Text style={styles.hudText}>Descartes {metrics.dropped}</Text>
        <Text style={styles.hudText}>p95 {metrics.p95IntervalMs.toFixed(1)} ms</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  link: { color: '#0a66c2', fontWeight: '600' },
  hud: { position: 'absolute', top: 48, left: 16, backgroundColor: '#000a', padding: 8, borderRadius: 8 },
  hudText: { color: '#fff', fontVariant: ['tabular-nums'] },
});
