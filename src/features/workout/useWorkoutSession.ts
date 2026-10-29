import { useEffect, useReducer } from 'react';
import { AppState } from 'react-native';

import { createSession, sessionReducer, type SessionAction, type SessionState } from './sessionModel';

const TICK_MS = 500;

let lastSession: SessionState | null = null;

/** Última sesión terminada, para la pantalla de resumen (solo en memoria). */
export function getLastSession(): SessionState | null {
  return lastSession;
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

  useEffect(() => {
    if (session.phase === 'done') lastSession = session;
  }, [session]);

  return { session, dispatch };
}
