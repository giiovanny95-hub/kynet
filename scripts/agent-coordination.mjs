import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const transitions = {
  asignada: ['en-curso', 'bloqueada', 'cancelada'],
  'en-curso': ['revision', 'bloqueada', 'cancelada'],
  revision: ['integrada', 'en-curso', 'bloqueada', 'cancelada'],
  bloqueada: ['asignada', 'cancelada'],
  integrada: [],
  cancelada: [],
};
function invariant(condition, message) { if (!condition) throw new Error(message); }
function identifier(value) {
  invariant(typeof value === 'string' && /^[a-z0-9][a-z0-9_-]{0,79}$/.test(value), 'ID inválido: usa minúsculas, dígitos, guion o guion bajo (máximo 80).');
  invariant(!/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/.test(value), 'ID reservado por Windows.');
  return value;
}
function text(value, name) { invariant(typeof value === 'string' && value.trim().length > 0, `Falta ${name}.`); return value; }
function strings(value, name) {
  invariant(Array.isArray(value) && value.length > 0 && value.every(v => typeof v === 'string' && v.trim()), `${name} debe ser una lista no vacía.`);
  return value;
}
function read(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function atomicWrite(file, value) {
  const temporary = `${file}.${randomUUID()}.tmp`;
  const fd = fs.openSync(temporary, 'wx');
  try { fs.writeFileSync(fd, `${JSON.stringify(value, null, 2)}\n`); fs.fsyncSync(fd); }
  finally { fs.closeSync(fd); }
  try { fs.renameSync(temporary, file); }
  finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
}
function git(cwd, args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}
function contains(parent, child) {
  const relative = path.relative(parent, child);
  return relative.length > 0 && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative);
}

export function openCoordination(cwd = process.cwd()) {
  const common = fs.realpathSync(git(cwd, ['rev-parse', '--path-format=absolute', '--git-common-dir']));
  invariant(path.basename(common) === '.git', 'Se requiere un repositorio normal (no bare ni git-dir separado).');
  const repository = path.dirname(common);
  const workspace = fs.realpathSync(path.dirname(repository));
  const state = path.join(workspace, '.kynet-coordination', path.basename(repository));
  fs.mkdirSync(state, { recursive: true });
  invariant(contains(workspace, fs.realpathSync(state)), 'El estado debe permanecer dentro del workspace.');
  for (const directory of ['tasks', 'resources']) fs.mkdirSync(path.join(state, directory), { recursive: true });
  const coordinatorFile = path.join(state, 'coordinator.json');
  const taskFile = id => path.join(state, 'tasks', `${identifier(id)}.json`);
  const resourceFile = id => path.join(state, 'resources', `${identifier(id)}.json`);
  function records(directory) {
    return fs.readdirSync(path.join(state, directory)).filter(f => f.endsWith('.json')).sort().map(f => read(path.join(state, directory, f)));
  }
  function locked(action) {
    const lock = path.join(state, 'mutation.lock');
    let fd;
    try { fd = fs.openSync(lock, 'wx'); }
    catch (error) { if (error.code === 'EEXIST') throw new Error(`Coordinación ocupada: ${lock}. No borrar sin comprobar el proceso registrado.`, { cause: error }); throw error; }
    try {
      fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, host: os.hostname(), started_at: new Date().toISOString() }));
      return action();
    } finally { fs.closeSync(fd); fs.unlinkSync(lock); }
  }
  function authorized(session) {
    identifier(session);
    invariant(fs.existsSync(coordinatorFile), 'Reclama primero el rol con claim.');
    invariant(read(coordinatorFile).session_id === session, 'Solo la sesión coordinadora puede mutar el estado.');
  }
  function mutation(session, action) { return locked(() => { authorized(session); return action(); }); }
  function commit(value) {
    invariant(typeof value === 'string' && /^[a-f0-9]{7,40}$/.test(value), 'Se requiere SHA explícito (7–40 hex), no rama ni HEAD.');
    return git(repository, ['rev-parse', '--verify', `${value}^{commit}`]);
  }
  function getTask(id) { invariant(fs.existsSync(taskFile(id)), `Tarea inexistente: ${id}.`); return read(taskFile(id)); }
  return {
    state,
    snapshot() {
      return { repository, state, coordinator: fs.existsSync(coordinatorFile) ? read(coordinatorFile) : null, tasks: records('tasks'), resources: records('resources') };
    },
    claim(session, owner = 'claude-local') {
      identifier(session); identifier(owner);
      return locked(() => {
        if (fs.existsSync(coordinatorFile)) {
          const previous = read(coordinatorFile);
          invariant(previous.session_id === session && previous.owner === owner, `Coordinador ocupado por ${previous.owner}/${previous.session_id}.`);
          return previous;
        }
        const record = { owner, session_id: session, claimed_at: new Date().toISOString() };
        atomicWrite(coordinatorFile, record); return record;
      });
    },
    releaseCoordinator(session) {
      return mutation(session, () => {
        invariant(records('resources').length === 0, 'Libera primero las reservas de recursos.');
        invariant(!records('tasks').some(t => t.status === 'en-curso'), 'Hay tareas en curso; deben entregar o bloquearse antes del relevo.');
        fs.unlinkSync(coordinatorFile); return { released: true };
      });
    },
    create(session, input) {
      return mutation(session, () => {
        const id = identifier(input.id);
        invariant(!fs.existsSync(taskFile(id)), `Tarea duplicada: ${id}; consulta status, no vuelvas a despacharla.`);
        const scope = strings(input.scope, 'scope');
        invariant(scope.every(p => !path.isAbsolute(p) && !/^[A-Za-z]:/.test(p) && !p.split(/[\\/]/).includes('..')), 'scope debe contener rutas relativas sin ..');
        const dependencies = input.depends_on ?? [];
        invariant(Array.isArray(dependencies), 'depends_on debe ser una lista.');
        dependencies.forEach(d => { identifier(d); getTask(d); });
        const task = {
          id, owner: identifier(input.owner), session_id: identifier(input.session_id), status: 'asignada',
          base_sha: commit(input.base_sha), branch: `feat/codex-${id}`, worktree: null,
          scope, depends_on: dependencies, acceptance: strings(input.acceptance, 'acceptance'),
          write: input.write !== false, result_sha: null, checks: [], limitations: [],
          'responde-a': input['responde-a'] ?? null, created_at: new Date().toISOString(), events: [],
        };
        atomicWrite(taskFile(id), task); return task;
      });
    },
    createWorktree(session, id) {
      return mutation(session, () => {
        const task = getTask(id);
        invariant(task.status === 'asignada' && task.worktree === null, 'El worktree solo se crea una vez para una tarea asignada.');
        const parent = path.join(workspace, 'worktrees');
        fs.mkdirSync(parent, { recursive: true });
        const physicalParent = fs.realpathSync(parent);
        invariant(contains(workspace, physicalParent), 'worktrees apunta fuera del workspace.');
        const target = path.resolve(physicalParent, identifier(id));
        invariant(contains(physicalParent, target), 'Destino fuera de worktrees.');
        if (task.worktree_intent === target && fs.existsSync(target)) {
          const recovered = fs.realpathSync(target);
          invariant(recovered === target, 'La ruta a recuperar debe ser un directorio real, no un enlace.');
          invariant(fs.realpathSync(git(target, ['rev-parse', '--show-toplevel'])) === recovered, 'El destino no es la raíz de un worktree.');
          invariant(fs.realpathSync(git(target, ['rev-parse', '--path-format=absolute', '--git-common-dir'])) === common, 'El worktree pertenece a otro repositorio.');
          invariant(git(target, ['branch', '--show-current']) === task.branch && git(target, ['rev-parse', 'HEAD']) === task.base_sha, 'La rama o base cambió; no recuperar automáticamente.');
          invariant(git(target, ['status', '--porcelain']) === '', 'Hay cambios en el worktree; preservar e inspeccionar.');
          task.worktree = recovered; delete task.worktree_intent;
          atomicWrite(taskFile(id), task); return task;
        }
        invariant(!fs.existsSync(target), 'Destino existente: no reutilizar un directorio sin intención registrada.');
        invariant(git(repository, ['branch', '--list', task.branch]) === '', 'La rama ya existe; inspecciona antes de recuperar.');
        // Record intent first: a crash after git worktree add must never silently dispatch twice.
        task.worktree_intent = target; atomicWrite(taskFile(id), task);
        git(repository, ['worktree', 'add', '-b', task.branch, target, task.base_sha]);
        task.worktree = fs.realpathSync(target); delete task.worktree_intent;
        atomicWrite(taskFile(id), task); return task;
      });
    },
    transition(session, id, next, delivery = {}) {
      return mutation(session, () => {
        const task = getTask(id);
        invariant(transitions[task.status]?.includes(next), `Transición inválida: ${task.status} → ${next}.`);
        if (next === 'en-curso') {
          invariant(task.depends_on.every(d => getTask(d).status === 'integrada'), 'Dependencias sin integrar.');
          invariant(task.worktree && fs.existsSync(task.worktree), 'Falta worktree aislado.');
          invariant(git(task.worktree, ['branch', '--show-current']) === task.branch, 'La rama del worktree no coincide.');
          if (task.status === 'asignada') invariant(git(task.worktree, ['rev-parse', 'HEAD']) === task.base_sha, 'La base del worktree cambió antes del despacho.');
          if (task.write) invariant(!records('tasks').some(t => t.id !== id && t.write && t.status === 'en-curso'), 'Ya hay un worker con escritura en curso.');
        }
        if (next === 'revision' || next === 'integrada') {
          task.result_sha = commit(delivery.result_sha ?? task.result_sha);
          git(repository, ['merge-base', '--is-ancestor', task.base_sha, task.result_sha]);
          if (next === 'revision') {
            invariant(git(task.worktree, ['rev-parse', 'HEAD']) === task.result_sha, 'El SHA entregado no coincide con HEAD del worktree.');
            invariant(git(task.worktree, ['status', '--porcelain']) === '', 'El worktree tiene cambios sin entregar.');
          }
          if (next === 'integrada') {
            invariant(git(repository, ['rev-parse', 'HEAD']) === task.result_sha, 'El SHA integrado debe coincidir con HEAD del checkout integrador.');
            invariant(git(repository, ['status', '--porcelain']) === '', 'El checkout integrador tiene cambios sin commit.');
          }
          task.checks = strings(delivery.checks ?? task.checks, 'checks');
          const limitations = delivery.limitations ?? task.limitations;
          invariant(Array.isArray(limitations) && limitations.every(v => typeof v === 'string'), 'limitations debe ser una lista.');
          task.limitations = limitations;
        }
        if (next === 'bloqueada' || next === 'cancelada') text(delivery.reason, 'reason');
        task.events.push({ from: task.status, to: next, at: new Date().toISOString(), coordinator: session, reason: delivery.reason ?? null });
        task.status = next; atomicWrite(taskFile(id), task); return task;
      });
    },
    reserve(session, resource, holder, holderSession, minutes = 30) {
      return mutation(session, () => {
        identifier(holder); identifier(holderSession);
        invariant(Number.isFinite(minutes) && minutes > 0 && minutes <= 1440, 'Duración entre 0 y 1440 minutos.');
        const file = resourceFile(resource);
        invariant(!fs.existsSync(file), `Recurso reservado: ${resource}. Incluso caducado requiere liberación explícita tras comprobar el proceso.`);
        const record = { resource, owner: holder, session_id: holderSession, coordinator: session, expires_at: new Date(Date.now() + minutes * 60000).toISOString() };
        atomicWrite(file, record); return record;
      });
    },
    releaseResource(session, resource, holderSession) {
      return mutation(session, () => {
        const file = resourceFile(resource);
        invariant(fs.existsSync(file), 'Reserva inexistente.');
        invariant(read(file).session_id === holderSession, 'La sesión titular no coincide.');
        fs.unlinkSync(file); return { released: resource };
      });
    },
  };
}

export function main(args) {
  const [command, ...rest] = args;
  const options = {};
  invariant(rest.length % 2 === 0, 'Usa pares --opcion valor.');
  for (let i = 0; i < rest.length; i += 2) {
    invariant(/^--[a-z-]+$/.test(rest[i]) && !Object.hasOwn(options, rest[i].slice(2)), 'Opción inválida o repetida.');
    options[rest[i].slice(2)] = rest[i + 1];
  }
  const known = ['cwd', 'session', 'owner', 'file', 'id', 'status', 'resource', 'holder', 'holder-session', 'minutes'];
  invariant(Object.keys(options).every(k => known.includes(k)), 'Opción desconocida.');
  const api = openCoordination(options.cwd);
  switch (command) {
    case 'status': return api.snapshot();
    case 'claim': return api.claim(options.session, options.owner);
    case 'release-coordinator': return api.releaseCoordinator(options.session);
    case 'create': return api.create(options.session, read(text(options.file, 'file')));
    case 'worktree': return api.createWorktree(options.session, options.id);
    case 'transition': return api.transition(options.session, options.id, options.status, options.file ? read(options.file) : {});
    case 'reserve': return api.reserve(options.session, options.resource, options.holder, options['holder-session'], options.minutes === undefined ? 30 : Number(options.minutes));
    case 'release': return api.releaseResource(options.session, options.resource, options['holder-session']);
    default: throw new Error('Comandos: status, claim, release-coordinator, create, worktree, transition, reserve, release. Consulta docs/agent-coordination-cli.md.');
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.stdout.write(`${JSON.stringify(main(process.argv.slice(2)), null, 2)}\n`); }
  catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
