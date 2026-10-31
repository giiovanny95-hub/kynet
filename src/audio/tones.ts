/** Tonos propios del MVP (arte propio, sin licencias): seno con envolvente, PCM 16 bits mono a 48 kHz. */

export interface ToneSpec {
  /** Notas consecutivas: frecuencia en Hz y duración en ms. */
  readonly notes: readonly { readonly hz: number; readonly ms: number }[];
  readonly gain: number;
}

export const TONES = {
  rep: { notes: [{ hz: 880, ms: 70 }], gain: 0.5 },
  perfect: { notes: [{ hz: 880, ms: 55 }, { hz: 1320, ms: 75 }], gain: 0.5 },
  warn: { notes: [{ hz: 330, ms: 120 }], gain: 0.6 },
} as const satisfies Record<string, ToneSpec>;

export type ToneName = keyof typeof TONES;

const RATE = 48000;
const FADE_MS = 5;

export function toneWav(spec: ToneSpec): Uint8Array {
  const samples: number[] = [];
  for (const n of spec.notes) {
    const count = Math.round((n.ms / 1000) * RATE);
    const fade = Math.round((FADE_MS / 1000) * RATE);
    for (let i = 0; i < count; i++) {
      const env = Math.min(1, i / fade, (count - 1 - i) / fade);
      samples.push(Math.round(Math.sin((2 * Math.PI * n.hz * i) / RATE) * env * spec.gain * 32767));
    }
  }
  const data = samples.length * 2;
  const buf = new ArrayBuffer(44 + data);
  const v = new DataView(buf);
  const ascii = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i));
  };
  ascii(0, 'RIFF');
  v.setUint32(4, 36 + data, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, RATE, true);
  v.setUint32(28, RATE * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  ascii(36, 'data');
  v.setUint32(40, data, true);
  samples.forEach((s, i) => v.setInt16(44 + i * 2, s, true));
  return new Uint8Array(buf);
}

export function wavInfo(bytes: Uint8Array): { riff: boolean; sampleRate: number; bitsPerSample: number; channels: number; durationMs: number } {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (off: number) => String.fromCharCode(...bytes.slice(off, off + 4));
  const sampleRate = v.getUint32(24, true);
  const channels = v.getUint16(22, true);
  const bitsPerSample = v.getUint16(34, true);
  const data = v.getUint32(40, true);
  return {
    riff: tag(0) === 'RIFF' && tag(8) === 'WAVE',
    sampleRate, bitsPerSample, channels,
    durationMs: (data / (channels * (bitsPerSample / 8)) / sampleRate) * 1000,
  };
}
