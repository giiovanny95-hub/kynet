// Reproduce un fixture de landmarks con el motor y lista sus eventos (F0.1, plan vista-frontal).
// Uso: npm run replay -- <fixture.json> [--profile <perfil.json>] [--view frontal|lateral]
import { readFileSync } from 'node:fs';
import process from 'node:process';
import { fileURLToPath, URL } from 'node:url';
import { createServer } from 'vite';

const args = process.argv.slice(2);
const file = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const view = opt('--view');
if (!file || (view && view !== 'frontal' && view !== 'lateral')) {
  process.stderr.write('Uso: npm run replay -- <fixture.json> [--profile <perfil.json>] [--view frontal|lateral]\n');
  process.exit(2);
}
const fixture = JSON.parse(readFileSync(file, 'utf8'));
const profilePath = opt('--profile');
const profile = profilePath ? JSON.parse(readFileSync(profilePath, 'utf8')) : undefined;

const root = fileURLToPath(new URL('..', import.meta.url));
const server = await createServer({ root, configFile: false, logLevel: 'error', server: { middlewareMode: true, hmr: false } });
try {
  const { replayFixture, formatEvent } = await server.ssrLoadModule('/src/kinematics/tools/replay.ts');
  const r = replayFixture(fixture, { view, profile });
  const t0 = fixture.frames[0]?.t ?? 0;
  for (const e of r.events) process.stdout.write(`${formatEvent(e, t0)}\n`);
  const real = fixture.labels?.realReps;
  process.stdout.write(
    `\n${fixture.exercise} (${view ?? fixture.view ?? 'por defecto'}): ${r.valid} válidas, ${r.incomplete} incompletas, ` +
      `${r.fault} con falta${typeof real === 'number' && real >= 0 ? `; reales ${real}` : ''}\n`,
  );
} finally {
  await server.close();
}
