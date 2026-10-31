import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { URL } from 'node:url';
import { buildAnimations, FRAME_COUNT, loadSources, NAMES, rgba } from './buildExerciseLottie.mjs';

function visit(value, callback, path = '') {
  if (!value || typeof value !== 'object') return;
  callback(value, path);
  for (const [key, child] of Object.entries(value)) visit(child, callback, `${path}/${key}`);
}

test('las cinco guías son reproducibles, pequeñas, articuladas y cierran el bucle', async () => {
  const first = await buildAnimations();
  const second = await buildAnimations();
  const { tokens } = await loadSources();
  const palette = Object.values(tokens).filter((c) => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c)).map(rgba);
  assert.deepEqual(Object.keys(first), NAMES);
  assert.deepEqual(first, second, 'dos ejecuciones independientes deben ser idénticas');
  for (const name of NAMES) {
    const file = await readFile(new URL(`../../assets/lottie/exercises/${name}.json`, import.meta.url), 'utf8');
    assert.equal(file, `${JSON.stringify(first[name])}\n`, `${name}: asset desactualizado`);
    assert.ok(Buffer.byteLength(file) < 150 * 1024, `${name}: presupuesto 150 KB`);
    const animation = JSON.parse(file);
    assert.match(animation.v, /^5\./);
    assert.equal(animation.fr, 30);
    assert.equal(animation.ip, 0);
    assert.equal(animation.op, FRAME_COUNT);
    assert.equal(animation.w, 360);
    assert.equal(animation.h, 360);
    assert.ok(animation.op / animation.fr >= 2 && animation.op / animation.fr <= 3);
    assert.deepEqual(animation.assets, []);
    assert.equal(animation.layers.length, 14);
    const ids = new Set(animation.layers.map((l) => l.ind));
    assert.equal(ids.size, animation.layers.length);
    for (const layer of animation.layers) {
      assert.equal(layer.ty, 4);
      if (layer.parent) assert.ok(ids.has(layer.parent));
      const ancestors = new Set([layer.ind]);
      let parent = layer.parent;
      while (parent) {
        assert.ok(!ancestors.has(parent), 'jerarquía sin ciclos');
        ancestors.add(parent);
        parent = animation.layers.find((l) => l.ind === parent).parent;
      }
    }
    let animated = 0;
    visit(animation, (value, path) => {
      if (value.ty === 'fl') assert.ok(palette.some((c) => JSON.stringify(c) === JSON.stringify(value.c.k)), `${name}: color fuera de tokens`);
      assert.ok(!['gf', 'gs', 'sh'].includes(value.ty), 'solo formas simples, sin degradados ni paths animados');
      if (value.a !== 1) return;
      animated++;
      assert.ok(/\/(ks\/(p|r|s|o)|it\/2\/s)$/.test(path), `solo transformaciones: ${path}`);
      assert.deepEqual(value.k[0].s, value.k.at(-1).s, `${name}${path}: cierre`);
      assert.equal(value.k[0].t, 0);
      assert.equal(value.k.at(-1).t, FRAME_COUNT - 1);
      for (let t = 72; t < FRAME_COUNT; t++) {
        const current = value.k.findLast((k) => k.t <= t);
        assert.deepEqual(current.s, value.k[0].s, `${name}: pausa arriba`);
      }
      for (const [i, key] of value.k.entries()) {
        assert.ok(key.s.every(Number.isFinite));
        assert.equal(key.h, 1);
        if (i) assert.ok(key.t > value.k[i - 1].t);
      }
    });
    assert.ok(animated > 5, `${name}: debe moverse`);
  }
});
