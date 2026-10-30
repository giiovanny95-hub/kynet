import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { deviceTimeZone, LOCAL_USER, USER_ID_KEY } from '@/data/account';
import { getStore } from '@/data/storeProvider';
import { loadPrefs } from '@/features/profile/prefsStore';
import type { Prefs } from '@/features/profile/prefs';
import { localDate } from '@/gamification/localDate';
import { provisionalState, type ProvisionalState } from '@/gamification/provisional';
import type { SessionSummary } from '@/gamification/types';

export interface GameData {
  readonly prefs: Prefs;
  readonly sessions: readonly SessionSummary[];
  readonly game: ProvisionalState;
  readonly userId: string | null;
  readonly today: string;
}

/** Estado provisional para Hoy, Progreso, Misiones y el resumen. Se recalcula al enfocar la pantalla. */
export function useGameState(): { data: GameData | null; refresh: () => Promise<void> } {
  const [data, setData] = useState<GameData | null>(null);
  const refresh = useCallback(async () => {
    const store = getStore();
    const [prefs, sessions, userId] = await Promise.all([loadPrefs(store), store.listSessions(), store.getKv(USER_ID_KEY)]);
    const today = localDate(Date.now(), deviceTimeZone());
    const game = provisionalState(sessions, { userId: userId ?? LOCAL_USER, today, weeklyGoalDays: prefs.weeklyGoalDays });
    setData({ prefs, sessions, game, userId, today });
  }, []);
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );
  return { data, refresh };
}
