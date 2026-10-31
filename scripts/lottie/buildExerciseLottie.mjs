// Arte propio KYNET. Solo poses sintéticas: nunca datos de cámara o de personas.
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL, URL } from 'node:url';
import process from 'node:process';
import { Buffer } from 'node:buffer';
import { createServer } from 'vite';

export const ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const FPS = 30;
export const MOVE_FRAMES = 72;
export const PAUSE_FRAMES = 9;
export const FRAME_COUNT = MOVE_FRAMES + PAUSE_FRAMES;
export const NAMES = ['squat-front', 'squat-side', 'pushup-front', 'pushup-side', 'jj-front'];
const round = (x) => Math.round(x * 1000) / 1000;
const fixed = (k) => ({ a: 0, k });
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Muestreo a 30 fps: claves hold evitan interpolar ángulos a través de ±180°.
// Solo transformaciones; geometría, relleno y trazo permanecen constantes.
export function track(values) {
  const rounded = values.map((v) => Array.isArray(v) ? v.map(round) : round(v));
  if (rounded.every((v) => equal(v, rounded[0]))) return fixed(rounded[0]);
  return { a: 1, k: rounded.flatMap((v, t) =>
    t === 0 || t === rounded.length - 1 || !equal(v, rounded[t - 1])
      ? [{ t, s: Array.isArray(v) ? v : [v], h: 1 }] : []) };
}

export const rgba = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).concat(1);
const midpoint = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
const angle = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI - 90;
const distance = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const local = (p, origin, degrees) => {
  const r = -degrees * Math.PI / 180;
  const x = p[0] - origin[0], y = p[1] - origin[1];
  return [x * Math.cos(r) - y * Math.sin(r), x * Math.sin(r) + y * Math.cos(r), 0];
};

export async function loadSources() {
  const server = await createServer({ root: ROOT, configFile: false, logLevel: 'error',
    server: { middlewareMode: true, hmr: false }, cacheDir: `${ROOT}/node_modules/.vite-lottie` });
  try {
    const [sq, pu, jj, ui] = await Promise.all([
      server.ssrLoadModule('/src/kinematics/tools/gen/squat.ts'),
      server.ssrLoadModule('/src/kinematics/tools/gen/pushUp.ts'),
      server.ssrLoadModule('/src/kinematics/tools/gen/jumpingJack.ts'),
      server.ssrLoadModule('/src/ui/tokens.ts'),
    ]);
    return { genSquat: sq.genSquat, genPushUp: pu.genPushUp, genJumpingJack: jj.genJumpingJack, tokens: ui.tokens };
  } finally { await server.close(); }
}

export function exercisePoses(name, sources) {
  const common = { reps: 1, periodS: MOVE_FRAMES / FPS, sigma: 0, seed: 1, fps: FPS, standS: 1, bottomsDeg: 90 };
  let generated;
  if (name.startsWith('squat')) {
    generated = sources.genSquat({ ...common,
      ...(name.endsWith('front') ? { camera: { heightM: 0.9, distanceM: 2.5, yawDeg: 0 } } : {}) });
  } else if (name.startsWith('pushup')) {
    // Cuando genPushUp lo soporte, shoulderForwardM entraría aquí, junto a camera.
    generated = sources.genPushUp({ ...common,
      ...(name.endsWith('front') ? { camera: { heightM: 0.15, distanceM: 2, yawDeg: 0 }, elbowFlareDeg: 25 } : {}) });
  } else if (name === 'jj-front') generated = sources.genJumpingJack(common);
  else throw new Error(`Guía desconocida: ${name}`);
  // Elimina el segundo de calibración y conserva 0,3 s arriba al cerrar el bucle.
  const cycle = generated.slice(FPS, FPS + MOVE_FRAMES);
  const frames = [...cycle, ...Array.from({ length: PAUSE_FRAMES }, () => cycle[0])];
  const ids = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28, 31, 32];
  const poses = frames.map((frame) => Object.fromEntries(ids.map((id) => {
    const p = frame.raw[id];
    return [id, [p.x * frame.meta.width / frame.meta.height, p.y]];
  })));
  const points = poses.flatMap((pose) => Object.values(pose));
  const minX = Math.min(...points.map((p) => p[0])), maxX = Math.max(...points.map((p) => p[0]));
  const minY = Math.min(...points.map((p) => p[1])), maxY = Math.max(...points.map((p) => p[1]));
  // Una única escala por clip: no recentrar ni hacer zoom durante la repetición.
  const scale = 260 / Math.max(maxX - minX, maxY - minY);
  return poses.map((pose) => Object.fromEntries(Object.entries(pose).map(([id, p]) =>
    [id, [180 + (p[0] - (minX + maxX) / 2) * scale, 180 + (p[1] - (minY + maxY) / 2) * scale]])));
}

function illustration(name, poses, tokens) {
  const front = name.endsWith('front');
  const definitions = [
    { id: 'torso', from: (p) => midpoint(p[23], p[24]), to: (p) => midpoint(p[11], p[12]), width: front ? distance(poses[0][11], poses[0][12]) + 12 : 31, color: tokens.text },
    { id: 'pelvis', parent: 'torso', from: (p) => midpoint(p[23], p[24]), width: front ? distance(poses[0][23], poses[0][24]) + 23 : 34, height: 27, color: tokens.muted },
    { id: 'neck', parent: 'torso', from: (p) => midpoint(p[11], p[12]), to: (p) => p[0], width: 13, color: tokens.text },
  ];
  for (const [side, offset] of [['far', 1], ['near', 0]]) {
    const color = side === 'near' ? tokens.accent : tokens.muted;
    definitions.push(
      { id: `${side}-thigh`, parent: 'torso', from: (p) => p[23 + offset], to: (p) => p[25 + offset], width: 23, color },
      { id: `${side}-shin`, parent: `${side}-thigh`, from: (p) => p[25 + offset], to: (p) => p[27 + offset], width: 18, color },
      { id: `${side}-foot`, parent: `${side}-shin`, from: (p) => p[27 + offset], to: (p) => p[31 + offset], width: 15, color },
      { id: `${side}-arm`, parent: 'torso', from: (p) => p[11 + offset], to: (p) => p[13 + offset], width: 16, color },
      { id: `${side}-forearm`, parent: `${side}-arm`, from: (p) => p[13 + offset], to: (p) => p[15 + offset], width: 13, color },
    );
  }
  definitions.push({ id: 'head', parent: 'torso', from: (p) => p[0], width: 35, height: 35, circle: true, color: tokens.text });
  const geometry = new Map(definitions.map((d) => [d.id, poses.map((p) => ({
    origin: d.from(p), rotation: d.to ? angle(d.from(p), d.to(p)) : 0,
    length: d.to ? distance(d.from(p), d.to(p)) : d.height,
  }))]));
  const layers = definitions.map((d, index) => {
    const samples = geometry.get(d.id);
    const parent = d.parent ? geometry.get(d.parent) : undefined;
    const length = samples[0].length;
    const ks = {
      a: fixed([0, 0, 0]), o: fixed(100), s: fixed([100, 100, 100]),
      p: track(samples.map((s, i) => parent ? local(s.origin, parent[i].origin, parent[i].rotation) : [...s.origin, 0])),
      r: track(samples.map((s, i) => s.rotation - (parent ? parent[i].rotation : 0))),
    };
    const shape = d.to
      ? { ty: 'rc', d: 1, p: fixed([0, length / 2]),
        s: fixed([d.width, length + (d.id === 'torso' ? 12 : d.width / 2)]),
        r: fixed(d.id === 'torso' ? 16 : d.width / 2) }
      : { ty: d.circle ? 'el' : 'rc', d: 1, p: fixed([0, 0]), s: fixed([d.width, d.height]), ...(d.circle ? {} : { r: fixed(12) }) };
    return { ddd: 0, ind: index + 1, ty: 4, nm: d.id, sr: 1,
      ...(d.parent ? { parent: definitions.findIndex((p) => p.id === d.parent) + 1 } : {}),
      ks, ao: 0, ip: 0, op: FRAME_COUNT, st: 0, bm: 0,
      shapes: [{ ty: 'gr', nm: d.id, it: [shape,
        { ty: 'fl', c: fixed(rgba(d.color)), o: fixed(100), r: 1, bm: 0 },
        { ty: 'tr', p: fixed([0, 0]), a: fixed([0, 0]), r: fixed(0), o: fixed(100),
          s: track(samples.map((s) => [100, s.length / length * 100])) },
      ] }],
    };
  });
  // Lottie pinta el primer layer encima. En frontal la cabeza tapa el torso;
  // en lateral el lado cercano queda delante y el lejano detrás del cuerpo.
  const order = ['head', 'near-forearm', 'near-arm', 'pelvis', 'near-foot', 'near-shin', 'near-thigh', 'torso', 'neck',
    'far-forearm', 'far-arm', 'far-foot', 'far-shin', 'far-thigh'];
  layers.sort((a, b) => order.indexOf(a.nm) - order.indexOf(b.nm));
  return { v: '5.7.4', fr: FPS, ip: 0, op: FRAME_COUNT, w: 360, h: 360, nm: `KYNET ${name}`, ddd: 0, assets: [],
    markers: [{ tm: 0, cm: 'arriba', dr: 0 }, { tm: 18, cm: 'medio', dr: 0 }, { tm: 36, cm: 'fondo', dr: 0 }], layers };
}

export async function buildAnimations() {
  const sources = await loadSources();
  return Object.fromEntries(NAMES.map((name) => [name, illustration(name, exercisePoses(name, sources), sources.tokens)]));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const animations = await buildAnimations();
  const dir = new URL('../../assets/lottie/exercises/', import.meta.url);
  await mkdir(dir, { recursive: true });
  for (const [name, animation] of Object.entries(animations)) {
    const json = `${JSON.stringify(animation)}\n`;
    await writeFile(new URL(`${name}.json`, dir), json);
    process.stdout.write(`${name}.json: ${Buffer.byteLength(json)} bytes\n`);
  }
}
