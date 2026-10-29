import type { ConfigContext, ExpoConfig } from 'expo/config';

import { getVariant } from './src/core/variant.ts';

export default ({ config }: ConfigContext): ExpoConfig => {
  const variant = getVariant(process.env.APP_VARIANT);
  return {
    ...config,
    name: variant.name,
    slug: 'fitpose',
    owner: 'geovanniavs-team',
    extra: { ...config.extra, eas: { projectId: 'a8c82199-7010-4761-8c2b-912312b38027' } },
    version: '0.1.0',
    scheme: variant.scheme,
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    android: {
      package: variant.androidPackage,
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
      permissions: ['android.permission.CAMERA'],
    },
    plugins: ['expo-router', 'expo-localization'],
    experiments: { typedRoutes: true },
  };
};
