import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { missingWorkletExports } from './workletCheck';

describe('missingWorkletExports', () => {
  it('detecta una función exportada sin la directiva', () => {
    expect(missingWorkletExports("export function a(x: number): number {\n  return x;\n}\n")).toEqual(['a']);
  });

  it('acepta la directiva como primera sentencia, con comillas simples o dobles', () => {
    expect(missingWorkletExports("export function a(): void {\n  'worklet';\n}\nexport function b(): void {\n  \"worklet\";\n}\n")).toEqual([]);
  });

  it('no confunde un tipo de retorno entre llaves con el cuerpo', () => {
    expect(missingWorkletExports("export function a(): { x: number } {\n  'worklet';\n  return { x: 1 };\n}\n")).toEqual([]);
  });

  it('cubre firmas en varias líneas', () => {
    expect(missingWorkletExports('export function a(\n  x: number,\n): number {\n  return x;\n}\n')).toEqual(['a']);
  });
});

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '__tests__' || name === 'tools' ? [] : sourceFiles(path);
    return path.endsWith('.ts') && !path.endsWith('.test.ts') ? [path] : [];
  });
}

describe('src/kinematics', () => {
  it("todas las funciones exportadas del motor llevan 'worklet' (spec-cinematica §0)", () => {
    const missing = sourceFiles('src/kinematics').flatMap((f) => missingWorkletExports(readFileSync(f, 'utf8')).map((n) => `${f}: ${n}`));
    expect(missing).toEqual([]);
  });
});
