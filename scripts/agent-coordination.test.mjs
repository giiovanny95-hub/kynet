import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import * as fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, URL } from 'node:url';
import { test } from 'node:test';
import { openCoordination } from './agent-coordination.mjs';

function fixture(t) {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'kynet-coordination-'));
  const repository = path.join(workspace, 'app'); fs.mkdirSync(repository);
  const git = args => execFileSync('git', args, { cwd: repository, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git(['init']); git(['config', 'user.email', 'test@example.invalid']); git(['config', 'user.name', 'Test']);
  fs.writeFileSync(path.join(repository, 'README.md'), 'test\n'); git(['add', '.']); git(['commit', '-m', 'fixture']);
  const sha = git(['rev-parse', 'HEAD']);
  // All cleanup targets are generated under this test's known temporary workspace.
  t.after(() => { assert.ok(workspace.startsWith(path.join(os.tmpdir(), 'kynet-coordination-'))); fs.rmSync(workspace, { recursive: true, force: true }); });
  const api = openCoordination(repository); api.claim('coordinator');
  const task = id => ({ id, owner: 'codex', session_id: `worker-${id}`, base_sha: sha, scope: ['src/pure.ts'], acceptance: ['Prueba pasa'] });
  return { workspace, repository, api, sha, task };
}

test('single coordinator, duplicate task and durable restart/worktree shared state', t => {
  const f = fixture(t);
  assert.throws(() => f.api.claim('other'), /ocupado/);
  assert.throws(() => f.api.create('other', f.task('one')), /coordinadora/);
  f.api.create('coordinator', f.task('one'));
  assert.throws(() => f.api.create('coordinator', f.task('one')), /duplicada/);
  const task = f.api.createWorktree('coordinator', 'one');
  const reopened = openCoordination(task.worktree);
  assert.equal(reopened.state, f.api.state);
  assert.equal(reopened.snapshot().tasks[0].base_sha, f.sha);
  assert.throws(() => reopened.createWorktree('coordinator', 'one'), /una vez/);
});

test('transitions require isolated worktree, delivered evidence and one writer', t => {
  const f = fixture(t);
  f.api.create('coordinator', f.task('one'));
  assert.throws(() => f.api.transition('coordinator', 'one', 'en-curso'), /worktree/);
  f.api.createWorktree('coordinator', 'one');
  f.api.transition('coordinator', 'one', 'en-curso');
  assert.throws(() => f.api.transition('coordinator', 'one', 'en-curso'), /inválida/);
  f.api.create('coordinator', f.task('two')); f.api.createWorktree('coordinator', 'two');
  assert.throws(() => f.api.transition('coordinator', 'two', 'en-curso'), /worker/);
  assert.throws(() => f.api.transition('coordinator', 'one', 'revision'), /SHA/);
  f.api.transition('coordinator', 'one', 'revision', { result_sha: f.sha, checks: ['node test: 1 passed'], limitations: [] });
  f.api.transition('coordinator', 'one', 'integrada');
  assert.throws(() => f.api.transition('coordinator', 'one', 'en-curso'), /inválida/);
  f.api.transition('coordinator', 'two', 'en-curso');
  assert.throws(() => f.api.releaseCoordinator('coordinator'), /en curso/);
  f.api.transition('coordinator', 'two', 'bloqueada', { reason: 'Necesita evidencia física' });
  f.api.releaseCoordinator('coordinator'); f.api.claim('replacement');
  assert.equal(f.api.snapshot().tasks[1].status, 'bloqueada');
});

test('expired reservations cannot be stolen and require matching holder for release', t => {
  const f = fixture(t);
  f.api.reserve('coordinator', 'metro-8081', 'claude-local', 'worker-one', 0.000001);
  assert.throws(() => f.api.reserve('coordinator', 'metro-8081', 'codex', 'worker-two'), /reservado/);
  assert.throws(() => f.api.releaseResource('coordinator', 'metro-8081', 'worker-two'), /titular/);
  assert.throws(() => f.api.releaseCoordinator('coordinator'), /reservas/);
  openCoordination(f.repository).releaseResource('coordinator', 'metro-8081', 'worker-one');
  f.api.reserve('coordinator', 'metro-8081', 'codex', 'worker-two');
});

test('path traversal, unsupported base ref, pending dependencies and mutex fail closed', t => {
  const f = fixture(t);
  assert.throws(() => f.api.create('coordinator', { ...f.task('../escape') }), /inválido/);
  assert.throws(() => f.api.create('coordinator', { ...f.task('bad'), scope: ['../secret'] }), /relativas/);
  assert.throws(() => f.api.create('coordinator', { ...f.task('bad'), base_sha: 'HEAD' }), /SHA/);
  f.api.create('coordinator', f.task('first'));
  f.api.create('coordinator', { ...f.task('second'), depends_on: ['first'] });
  f.api.createWorktree('coordinator', 'second');
  assert.throws(() => f.api.transition('coordinator', 'second', 'en-curso'), /Dependencias/);
  const lock = path.join(f.api.state, 'mutation.lock'); fs.writeFileSync(lock, '{}');
  assert.throws(() => f.api.create('coordinator', f.task('third')), /ocupada/);
  fs.unlinkSync(lock);
  assert.equal(f.api.snapshot().tasks.length, 2);
});

test('two processes racing for a resource grant it once', async t => {
  const f = fixture(t);
  const script = fileURLToPath(new URL('./agent-coordination.mjs', import.meta.url));
  const attempt = holder => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, 'reserve', '--cwd', f.repository, '--session', 'coordinator', '--resource', 'pixel', '--holder', 'codex', '--holder-session', holder], { stdio: 'pipe' });
    child.on('error', reject);
    child.on('exit', resolve);
  });
  const results = await Promise.all([attempt('worker-a'), attempt('worker-b')]);
  assert.deepEqual(results.sort(), [0, 1]);
  assert.equal(f.api.snapshot().resources.length, 1);
});

test('recover interrupted worktree creation only for the recorded repository, branch and base', t => {
  const f = fixture(t);
  f.api.create('coordinator', f.task('one'));
  const created = f.api.createWorktree('coordinator', 'one');
  const taskFile = path.join(f.api.state, 'tasks', 'one.json');
  fs.writeFileSync(taskFile, JSON.stringify({ ...created, worktree: null, worktree_intent: created.worktree }));
  const recovered = openCoordination(f.repository).createWorktree('coordinator', 'one');
  assert.equal(recovered.worktree, created.worktree);
  assert.equal(recovered.worktree_intent, undefined);
});
