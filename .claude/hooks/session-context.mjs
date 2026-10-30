// Contexto al iniciar, reanudar o compactar una sesión de Claude Code (hook SessionStart).
// Lo que se imprime por stdout entra en el contexto. Sin dependencias; nunca falla (siempre sale con código 0).
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();

function git(args) {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 4000 }).trim();
  } catch {
    return '';
  }
}

/** Devuelve el cuerpo de una sección `## título` de un markdown, recortado. */
function section(md, title, maxLines) {
  const lines = md.split(/\r?\n/);
  const start = lines.findIndex((l) => l.trim().toLowerCase() === `## ${title}`.toLowerCase());
  if (start < 0) return '';
  const body = [];
  for (const l of lines.slice(start + 1)) {
    if (l.startsWith('## ')) break;
    if (l.trim() !== '') body.push(l);
  }
  return body.slice(0, maxLines).join('\n');
}

const out = ['# Contexto de KYNET (hook SessionStart)'];
try {
  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']) || '?';
  const dirty = git(['status', '--porcelain']).split('\n').filter(Boolean).length;
  out.push(`Rama: ${branch} · archivos con cambios sin commit: ${dirty}`);
  const log = git(['log', '--oneline', '-5']);
  if (log) out.push('Últimos commits:', log);

  let estado = '';
  try {
    estado = readFileSync(join(root, 'docs', 'estado.md'), 'utf8');
  } catch {
    // Sin estado.md no hay nada más que mostrar.
  }
  const next = section(estado, 'Siguiente paso', 6);
  if (next) out.push('Siguiente paso (docs/estado.md):', next);
  const decide = section(estado, 'Para decidir (usuario)', 6);
  if (decide) out.push('Pendiente de decisión del usuario:', decide);

  out.push(
    'Protocolo: usa superpowers (brainstorming → writing-plans → TDD → verification-before-completion);',
    'lee la regla del área en .claude/rules/ antes de tocarla; skill `aprender` cuando te corrijan;',
    'skill `cerrar-sesion` al terminar una tarea. El buzón con la otra sesión está en la rama `coordinacion`.',
  );
} catch {
  // Nunca bloquear el arranque.
}
process.stdout.write(out.join('\n') + '\n');
process.exit(0);
