import * as Speech from 'expo-speech';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { shouldSpeak, type Utterance, type VoicePriority } from './voicePolicy';

/** Tope si el sistema no avisa del final de la frase. */
const MAX_UTTERANCE_MS = 3000;

/** Preferencia en memoria mientras la app está abierta (la parte 5 la guardará). */
let voiceEnabled = true;

/** Voz del sistema (`expo-speech`) en el idioma de la app. Si falla o no hay voz instalada, la app sigue con tonos. */
export function useVoice(): { say: (u: Utterance) => void; enabled: boolean; setEnabled: (v: boolean) => void } {
  const { t, i18n } = useTranslation();
  const [enabled, setEnabledState] = useState(voiceEnabled);
  const current = useRef<{ priority: VoicePriority; untilMs: number } | null>(null);
  const language = i18n.language.startsWith('es') ? 'es-MX' : 'en-US';

  useEffect(
    () => () => {
      Speech.stop().catch(() => undefined);
    },
    [],
  );

  const setEnabled = useCallback((v: boolean) => {
    voiceEnabled = v;
    setEnabledState(v);
    if (!v) Speech.stop().catch(() => undefined);
  }, []);

  const say = useCallback(
    (u: Utterance) => {
      const now = Date.now();
      if (!shouldSpeak(current.current, u, now, enabled)) return;
      const done = () => {
        current.current = null;
      };
      try {
        if (current.current !== null && now < current.current.untilMs) Speech.stop().catch(() => undefined);
        current.current = { priority: u.priority, untilMs: now + MAX_UTTERANCE_MS };
        Speech.speak(t(u.key, u.params), { language, rate: 1, onDone: done, onStopped: done, onError: done });
      } catch {
        current.current = null;
      }
    },
    [enabled, language, t],
  );

  return { say, enabled, setEnabled };
}
