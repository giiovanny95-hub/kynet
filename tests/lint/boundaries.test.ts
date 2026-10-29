import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const eslint = new ESLint({ cwd: process.cwd() });

async function ruleIds(code: string, filePath: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath });
  return (result?.messages ?? []).map((m) => m.ruleId ?? 'fatal');
}

describe('límites del módulo de cinemática', () => {
  const file = 'src/kinematics/x.ts';

  it('prohíbe importar react-native', async () => {
    expect(await ruleIds("import { View } from 'react-native';\nexport const v = View;\n", file)).toContain('no-restricted-imports');
  });

  it('prohíbe importar paquetes expo', async () => {
    expect(await ruleIds("import * as C from 'expo-camera';\nexport const c = C;\n", file)).toContain('no-restricted-imports');
  });

  it('permite importar desde core', async () => {
    expect(await ruleIds("import { a } from '../core/types';\nexport const b = a;\n", file)).toEqual([]);
  });

  it('prohíbe Date.now', async () => {
    expect(await ruleIds('export const n = Date.now();\n', file)).toContain('no-restricted-properties');
  });

  it('prohíbe any', async () => {
    expect(await ruleIds('export let x: any = 1;\n', file)).toContain('@typescript-eslint/no-explicit-any');
  });

  it('prohíbe importar otras capas desde subcarpetas', async () => {
    expect(await ruleIds("import { a } from '../../vision/camera';\nexport const b = a;\n", 'src/kinematics/fsm/x.ts')).toContain('no-restricted-imports');
  });

  it('no aplica la regla de límites fuera de kinematics', async () => {
    expect(await ruleIds("import { View } from 'react-native';\nexport const v = View;\n", 'src/ui/x.ts')).not.toContain('no-restricted-imports');
  });
});
