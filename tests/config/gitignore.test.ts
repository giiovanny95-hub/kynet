import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

function isIgnored(path: string): boolean {
  try {
    execFileSync('git', ['check-ignore', '-q', path]);
    return true;
  } catch {
    return false;
  }
}

describe('.gitignore', () => {
  it('no ignora el código Android del módulo nativo', () => {
    expect(isIgnored('modules/kynet-native/android/build.gradle')).toBe(false);
    expect(isIgnored('modules/kynet-native/nitrogen/generated/android/KynetNativeOnLoad.cpp')).toBe(false);
  });

  it('sigue ignorando las carpetas nativas generadas de la app en la raíz', () => {
    expect(isIgnored('android/app/build.gradle')).toBe(true);
    expect(isIgnored('ios/Podfile')).toBe(true);
  });
});
