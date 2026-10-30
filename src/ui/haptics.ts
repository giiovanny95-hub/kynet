import * as ExpoHaptics from 'expo-haptics';

import { cachedPrefs } from '@/features/profile/prefsStore';

import { makeHaptics } from './hapticsCore';

/** Vibraciones de la app (spec-diseno, E0.4); se apagan con la preferencia `haptics` del perfil. */
export const haptics = makeHaptics(
  {
    selection: () => ExpoHaptics.selectionAsync(),
    impactLight: () => ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Light),
    success: () => ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Success),
    warning: () => ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Warning),
  },
  () => cachedPrefs()?.haptics ?? true,
);
