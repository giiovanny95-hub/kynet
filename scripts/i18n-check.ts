import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

type Tree = { readonly [key: string]: unknown };

function leafKeys(tree: Tree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return value !== null && typeof value === 'object' ? leafKeys(value as Tree, path) : [path];
  });
}

/** Claves hoja de `base` que no existen en `other`. */
export function findMissingKeys(base: Tree, other: Tree): string[] {
  const present = new Set(leafKeys(other));
  return leafKeys(base).filter((key) => !present.has(key));
}

function main(): void {
  const load = (lang: string): Tree =>
    JSON.parse(readFileSync(new URL(`../src/i18n/locales/${lang}.json`, import.meta.url), 'utf8')) as Tree;
  const missing = findMissingKeys(load('es'), load('en'));
  if (missing.length > 0) {
    process.stderr.write(`Faltan en en.json: ${missing.join(', ')}\n`);
    process.exit(1);
  }
  process.stdout.write('i18n: claves completas\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
