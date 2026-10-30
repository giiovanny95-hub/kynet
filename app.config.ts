import type { ConfigContext, ExpoConfig } from 'expo/config';

import { getVariant } from './src/core/variant.ts';

export default ({ config }: ConfigContext): ExpoConfig => {
  const variant = getVariant(process.env.APP_VARIANT);
  return {
    ...config,
    name: variant.name,
    slug: 'kynet',
    owner: 'geovanniavs-team',
    extra: { ...config.extra, eas: { projectId: 'bcfd17cb-bf24-4c7d-aa34-44c51fe237f3' } },
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
