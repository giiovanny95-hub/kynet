import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath, URL } from 'node:url';

// La raíz por defecto pertenece a ESTE script, no a un checkout fijo ni al cwd del llamador.
const args = process.argv.slice(2);
if (args.length !== 0 && (args.length !== 2 || args[0] !== '--root')) {
  process.stderr.write('Uso: node scripts/verify.mjs [--root <checkout>]\n');
  process.exit(2);
}
const root = realpathSync(args.length === 2 ? resolve(args[1]) : fileURLToPath(new URL('..', import.meta.url)));
const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const checks = ['typecheck', 'lint', 'test', 'test:agents', 'i18n:check'];
if (manifest.name !== 'kynet' || checks.some((name) => typeof manifest.scripts?.[name] !== 'string')) {
  process.stderr.write(`No es un checkout de KYNET con todos los checks: ${root}\n`);
  process.exit(2);
}

// Invocar npm con Node evita npm.cmd/shell quoting en Windows. También admite ejecución directa.
const npmCli = [
  process.env.npm_execpath,
  join(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js'),
  resolve(dirname(process.execPath), '../lib/node_modules/npm/bin/npm-cli.js'),
].find((path) => path && existsSync(path));
if (!npmCli) {
  process.stderr.write('No se encontró npm. Ejecuta npm run verify desde el checkout.\n');
  process.exit(2);
}

const head = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', windowsHide: true });
process.stdout.write(`Verificando: ${root}\nHEAD: ${head.status === 0 ? head.stdout.trim() : 'no disponible'}\nNode: ${process.version}\n`);
for (const check of checks) {
  process.stdout.write(`\n== ${check}\n`);
  const result = spawnSync(process.execPath, [npmCli, 'run', check], {
    cwd: root,
    stdio: 'inherit',
    windowsHide: true,
  });
  if (result.error || result.status !== 0) {
    process.stderr.write(`FALLÓ ${check}${result.error ? `: ${result.error.message}` : ''}\n`);
    process.exit(result.status && result.status > 0 ? result.status : 1);
  }
}
process.stdout.write('\nVERIFICACIÓN OK\n');
