import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const verifier = resolve('scripts/verify.mjs');

function fixture(failingCheck?: string): string {
  const root = mkdtempSync(join(tmpdir(), 'kynet verify '));
  const scripts = Object.fromEntries(['typecheck', 'lint', 'test', 'test:agents', 'i18n:check'].map((name) => [name, `node check.cjs ${name}`]));
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'kynet', scripts }));
  writeFileSync(join(root, 'check.cjs'), `const fs = require('node:fs'); const name = process.argv[2]; fs.appendFileSync('checks.txt', name + '\\n'); process.exit(name === ${JSON.stringify(failingCheck ?? '')} ? 7 : 0);`);
  return root;
}

describe('verificación del checkout indicado', () => {
  it('ejecuta todos los checks dentro de la raíz explícita, incluso con espacios', () => {
    const root = fixture();
    try {
      const result = spawnSync(process.execPath, [verifier, '--root', root], { cwd: tmpdir(), encoding: 'utf8' });
      expect(result.status, result.stdout + result.stderr).toBe(0);
      expect(readFileSync(join(root, 'checks.txt'), 'utf8')).toBe('typecheck\nlint\ntest\ntest:agents\ni18n:check\n');
      expect(result.stdout).toContain(root);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 30000);

  it('propaga el fallo y no ejecuta checks posteriores', () => {
    const root = fixture('lint');
    try {
      const result = spawnSync(process.execPath, [verifier, '--root', root], { encoding: 'utf8' });
      expect(result.status).not.toBe(0);
      expect(readFileSync(join(root, 'checks.txt'), 'utf8')).toBe('typecheck\nlint\n');
      expect(result.stdout).not.toContain('VERIFICACIÓN OK');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 30000);
});
