import type { ConfigContext, ExpoConfig } from 'expo/config';

import { getVariant } from './src/core/variant.ts';

export default ({ config }: ConfigContext): ExpoConfig => {
  const variant = getVariant(process.env.APP_VARIANT);
  return {
    ...config,
    name: variant.name,
    // El slug identifica el proyecto EAS (projectId): cambiarlo exige renombrar el proyecto en expo.dev.
    slug: 'fitpose',
    owner: 'geovanniavs-team',
    extra: { ...config.extra, eas: { projectId: 'a8c82199-7010-4761-8c2b-912312b38027' } },
    version: '0.1.0',
    scheme: variant.scheme,
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'dark',
    android: {
      package: variant.androidPackage,
      adaptiveIcon: {
        backgroundColor: '#080F14',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
      permissions: ['android.permission.CAMERA'],
    },
    // Solo reproducción de tonos: sin permiso de micrófono ni servicio en segundo plano.
    plugins: ['expo-router', 'expo-localization', 'expo-font', ['expo-audio', { recordAudioAndroid: false, enableBackgroundPlayback: false }]],
    experiments: { typedRoutes: true },
  };
};
