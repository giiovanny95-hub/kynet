import { useEffect, useReducer, useRef } from 'react';
import { AppState } from 'react-native';

import { uuidv4 } from '@/core/uuid';
import { deviceTimeZone, USER_ID_KEY } from '@/data/account';
import { getStore } from '@/data/storeProvider';
import { runSync } from '@/sync/syncService';

import { createSession, sessionReducer, type SessionAction, type SessionState } from './sessionModel';
import { shouldSave, toSessionSummary } from './sessionSummary';

const TICK_MS = 500;

export interface FinishedSession {
  readonly state: SessionState;
  /** Id de la sesión guardada, o `null` si no se guardó (vacía) o falló el guardado. */
  readonly savedId: string | null;
  /** Se resuelve cuando termina el guardado local. */
  readonly saved: Promise<void>;
}

let lastSession: FinishedSession | null = null;

/** Última sesión terminada, para la pantalla de resumen. */
export function getLastSession(): FinishedSession | null {
  return lastSession;
}

/** Guarda la sesión terminada en local con su elemento en la cola de salida (sin landmarks ni vídeo). */
function finish(state: SessionState): FinishedSession {
  if (!shouldSave(state)) return { state, savedId: null, saved: Promise.resolve() };
  const id = uuidv4();
  const summary = toSessionSummary(state, { id, tz: deviceTimeZone(), endedAtMs: Date.now() });
  const store = getStore();
  const saved = store
    .getKv(USER_ID_KEY)
    .then((userId) => store.saveSession(summary, userId, Date.now()))
    .then(() => {
      // Subida en segundo plano: el resumen no espera a la red.
      void runSync().catch(() => undefined);
    })
    .catch(() => undefined);
  return { state, savedId: id, saved };
}

/**
 * Sesión de entrenamiento en React: `sessionReducer` más un reloj de 500 ms y el estado de la app
 * (pasar a segundo plano pausa la sesión).
 */
export function useWorkoutSession(): { session: SessionState; dispatch: (a: SessionAction) => void } {
  const [session, dispatch] = useReducer(sessionReducer, undefined, createSession);

  useEffect(() => {
    const id = setInterval(() => dispatch({ type: 'tick', nowMs: Date.now() }), TICK_MS);
    const sub = AppState.addEventListener('change', (state) => dispatch({ type: 'appState', active: state === 'active', nowMs: Date.now() }));
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, []);

  // El reloj sigue creando estados nuevos tras terminar: se guarda una sola vez por sesión.
  const finished = useRef(false);
  useEffect(() => {
    if (session.phase !== 'done' || finished.current) return;
    finished.current = true;
    lastSession = finish(session);
  }, [session]);

  return { session, dispatch };
}
