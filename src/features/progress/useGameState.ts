import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { deviceTimeZone, LOCAL_USER, USER_ID_KEY } from '@/data/account';
import { getStore } from '@/data/storeProvider';
import { loadPrefs } from '@/features/profile/prefsStore';
import type { Prefs } from '@/features/profile/prefs';
import { localDate } from '@/gamification/localDate';
import { provisionalState, type ProvisionalState } from '@/gamification/provisional';
import { parseServerState } from '@/sync/serverState';
import { SERVER_STATE_KEY } from '@/sync/syncWorker';
import type { SessionSummary } from '@/gamification/types';

export interface GameData {
  readonly prefs: Prefs;
  readonly sessions: readonly SessionSummary[];
  readonly game: ProvisionalState;
  readonly userId: string | null;
  readonly today: string;
  /** `true` si las cifras vienen del servidor (todo subido); `false` si son la copia provisional del teléfono. */
  readonly confirmed: boolean;
  readonly pending: number;
}

/** Estado provisional para Hoy, Progreso, Misiones y el resumen. Se recalcula al enfocar la pantalla. */
export function useGameState(): { data: GameData | null; refresh: () => Promise<void> } {
  const [data, setData] = useState<GameData | null>(null);
  const refresh = useCallback(async () => {
    const store = getStore();
    const [prefs, sessions, userId, serverJson] = await Promise.all([
      loadPrefs(store),
      store.listSessions(),
      store.getKv(USER_ID_KEY),
      store.getKv(SERVER_STATE_KEY),
    ]);
    const today = localDate(Date.now(), deviceTimeZone());
    const local = provisionalState(sessions, { userId: userId ?? LOCAL_USER, today, weeklyGoalDays: prefs.weeklyGoalDays });
    const pending = userId === null ? 0 : await store.pendingCount(userId);
    const server = userId === null ? null : parseServerState(serverJson);
    // Con todo subido, el servidor manda (XP, nivel y rachas); con cola pendiente se muestra la copia provisional.
    const confirmed = server !== null && pending === 0;
    const game: ProvisionalState = confirmed
      ? {
          ...local,
          totalXp: server.totalXp,
          level: server.level,
          streak: { ...local.streak, current: server.currentStreak, longest: server.longestStreak },
        }
      : local;
    setData({ prefs, sessions, game, userId, today, confirmed, pending });
  }, []);
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );
  return { data, refresh };
}
