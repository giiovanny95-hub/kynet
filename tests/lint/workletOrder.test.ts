import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { workletForwardReferences } from './workletOrderCheck';

describe('workletForwardReferences', () => {
  it('detecta un worklet que llama a una función declarada más abajo', () => {
    const src = "export function a(): number {\n  'worklet';\n  return b();\n}\nfunction b(): number {\n  'worklet';\n  return 1;\n}\n";
    expect(workletForwardReferences(src)).toEqual(['a → b']);
  });

  it('detecta una constante de módulo declarada más abajo', () => {
    const src = "export function a(): number {\n  'worklet';\n  return K;\n}\nconst K = 1;\n";
    expect(workletForwardReferences(src)).toEqual(['a → K']);
  });

  it('acepta lo declarado antes y no confunde propiedades ni funciones que no son worklet', () => {
    const src =
      "const K = 1;\nfunction b(): number {\n  'worklet';\n  return K;\n}\n" +
      "export function a(o: { c: number }): number {\n  'worklet';\n  return b() + o.c + { c: 1 }.c;\n}\n" +
      'export function sinDirectiva(): number {\n  return c();\n}\nfunction c(): number {\n  return 2;\n}\nconst cc = 3;\n';
    expect(workletForwardReferences(src)).toEqual([]);
  });
});

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : sourceFiles(path);
    return /\.tsx?$/.test(path) && !/\.test\.tsx?$/.test(path) ? [path] : [];
  });
}

describe('src', () => {
  it('ningún worklet usa funciones o constantes del mismo archivo declaradas más abajo', () => {
    // En el teléfono llegan como undefined: "undefined is not a function" al abrir la colocación (Pixel 7 Pro).
    const found = sourceFiles('src').flatMap((f) => workletForwardReferences(readFileSync(f, 'utf8')).map((r) => `${f}: ${r}`));
    expect(found).toEqual([]);
  });
});
