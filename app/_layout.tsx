import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Montserrat_600SemiBold } from '@expo-google-fonts/montserrat/600SemiBold';
import { Montserrat_700Bold } from '@expo-google-fonts/montserrat/700Bold';
import { Montserrat_800ExtraBold } from '@expo-google-fonts/montserrat/800ExtraBold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useSyncTriggers } from '@/sync/useSyncTriggers';
import { tokens } from '@/ui/tokens';

// Importar cada peso por su ruta: el índice del paquete metería en el bundle las 18 variantes.
const FONTS = {
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
};

export default function RootLayout() {
  const [loaded, error] = useFonts(FONTS);
  useSyncTriggers();
  // Si las fuentes fallan, la app sigue con las del sistema en lugar de quedarse en blanco.
  if (!loaded && error === null) return null;
  return (
    // Raíz de gestos para `PressableScale` y el resto de componentes con gesture-handler (diseño E0.1).
    <GestureHandlerRootView style={styles.root}>
      {/* Edge-to-edge: la barra es transparente y toma el fondo de la pantalla. */}
      <StatusBar barStyle="light-content" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: tokens.bg } }} />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: tokens.bg },
});
