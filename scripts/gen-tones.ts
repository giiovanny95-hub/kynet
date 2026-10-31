// Genera los tonos de assets/audio a partir de src/audio/tones.ts: node scripts/gen-tones.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { TONES, toneWav, type ToneName } from '../src/audio/tones.ts';

mkdirSync('assets/audio', { recursive: true });
for (const name of Object.keys(TONES) as ToneName[]) {
  const bytes = toneWav(TONES[name]);
  writeFileSync(`assets/audio/tone-${name}.wav`, bytes);
  process.stdout.write(`assets/audio/tone-${name}.wav ${bytes.length} B\n`);
}
