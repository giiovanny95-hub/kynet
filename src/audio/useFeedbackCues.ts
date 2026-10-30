import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef } from 'react';

import type { EngineEvent } from '@/kinematics/engine';

import tonePerfect from '../../assets/audio/tone-perfect.wav';
import toneRep from '../../assets/audio/tone-rep.wav';
import toneWarn from '../../assets/audio/tone-warn.wav';

import { cueFor, type HapticCue } from './feedbackCues';
import type { ToneName } from './tones';

const SOURCES: Readonly<Record<ToneName, number>> = {
  rep: toneRep,
  perfect: tonePerfect,
  warn: toneWarn,
};

function vibrate(h: HapticCue): void {
  const p =
    h === 'warning' ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    : h === 'medium' ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  p.catch(() => undefined);
}

/** Tonos precargados al montar (para que no haya retardo) y vibración en paralelo. */
export function useFeedbackCues(): { onEvents: (events: readonly EngineEvent[]) => void; playTone: (name: ToneName) => void } {
  const players = useRef<Partial<Record<ToneName, AudioPlayer>>>({});

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers', shouldPlayInBackground: false, allowsRecording: false }).catch(() => undefined);
    const created: Partial<Record<ToneName, AudioPlayer>> = {};
    for (const name of Object.keys(SOURCES) as ToneName[]) created[name] = createAudioPlayer(SOURCES[name]);
    players.current = created;
    return () => {
      for (const p of Object.values(created)) p.remove();
      players.current = {};
    };
  }, []);

  const playTone = useCallback((name: ToneName) => {
    const p = players.current[name];
    if (!p) return;
    p.seekTo(0).catch(() => undefined);
    p.play();
  }, []);

  const onEvents = useCallback((events: readonly EngineEvent[]) => {
    // Un evento por lote: el de más prioridad (el árbitro ya limita los avisos).
    let sound: ToneName | null = null;
    let haptic: HapticCue | null = null;
    for (const e of events) {
      const c = cueFor(e);
      if (c.sound === 'warn' || (c.sound !== null && sound === null)) sound = c.sound;
      if (c.haptic !== null) haptic = haptic === 'warning' ? haptic : c.haptic;
    }
    if (sound !== null) playTone(sound);
    if (haptic !== null) vibrate(haptic);
  }, [playTone]);

  return { onEvents, playTone };
}
