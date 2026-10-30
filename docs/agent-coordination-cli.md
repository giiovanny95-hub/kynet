# Coordinador local: tareas y recursos

CLI Node sin dependencias: `node scripts/agent-coordination.mjs <comando> [--opcion valor]`.
Todos los comandos aceptan `--cwd <checkout>`, emiten JSON y fallan con salida 1 ante conflicto.
El estado vive fuera de Git: `<workspace>/.kynet-coordination/<repo>/`, compartido por los worktrees del mismo repositorio.
No sincroniza ese directorio a la nube: el integrador publica resúmenes por el buzón, con IDs y SHA.
Es coordinación entre colaboradores de la misma cuenta local, no un control de acceso frente a procesos maliciosos.

## Inicio y recuperación

```text
node scripts/agent-coordination.mjs status
node scripts/agent-coordination.mjs claim --session claude-local-20261030
```

`claim` registra un único coordinador. Repetir la misma identidad es idempotente; otra sesión falla.
`status` recupera tareas, reservas y eventos tras reiniciar. Conserva el ID de la sesión coordinadora para reanudar.
Para un relevo, el coordinador anterior bloquea o entrega tareas en curso, libera recursos y ejecuta:
`release-coordinator --session <anterior>`; después la nueva sesión hace `claim`.
No reclamar automáticamente un rol antiguo ni reiniciar una tarea por volver a recibir su aviso.

## Asignar y aislar una tarea

Preparar un JSON local sin secretos (por ejemplo en `.kynet-coordination/`) con:

```json
{
  "id": "test-throttle",
  "owner": "codex",
  "session_id": "codex-pilot-1",
  "base_sha": "SHA_REAL_DEL_COMMIT",
  "scope": ["src/sync/throttle.test.ts"],
  "acceptance": ["Prueba de regresión pasa sin cambiar lógica de producto"],
  "depends_on": [],
  "write": true,
  "responde-a": "id-mensaje-del-buzon"
}
```

La base debe ser SHA existente, nunca `HEAD` ni una rama móvil. Los IDs son minúsculas/dígitos/guiones; no rutas.

```text
node scripts/agent-coordination.mjs create --session claude-local-20261030 --file <tarea.json>
node scripts/agent-coordination.mjs worktree --session claude-local-20261030 --id test-throttle
node scripts/agent-coordination.mjs transition --session claude-local-20261030 --id test-throttle --status en-curso
```

El CLI crea `<workspace>/worktrees/<id>` y `feat/codex-<id>` desde la base explícita, sin reutilizar rutas o ramas existentes.
Comprobar el `worktree` devuelto antes de lanzar Codex allí. Instalar dependencias por checkout y ejecutar `npm run verify` en ese checkout.
Solo una tarea de escritura puede estar `en-curso`. No se concede propiedad al primer agente que recibe un mensaje.
Los campos scope/acceptance son el contrato del worker, no un sandbox del sistema operativo; el integrador revisa el diff.

## Entregar, integrar y bloquear

El worker devuelve evidencia al coordinador; solo este modifica el registro. Entrega JSON:

```json
{
  "result_sha": "SHA_REAL_DEL_RESULTADO",
  "checks": ["npm run verify: pasó, fecha/dispositivo si aplica"],
  "limitations": []
}
```

```text
node scripts/agent-coordination.mjs transition --session <coordinador> --id <id> --status revision --file <entrega.json>
node scripts/agent-coordination.mjs transition --session <coordinador> --id <id> --status integrada --file <integracion.json>
```

En integración indicar el SHA combinado y las comprobaciones posteriores. El CLI exige que coincida con HEAD del checkout integrador, limpio; en revisión exige HEAD del worktree autor, limpio. El resultado debe descender de la base. No sustituye ejecutar ni revisar los checks declarados.
Estados: `asignada → en-curso → revision → integrada`; `revision → en-curso` permite correcciones.
Desde los estados no terminales se puede pasar a `bloqueada` o `cancelada` con JSON `{"reason":"motivo"}`.
`bloqueada → asignada` permite reanudar; la identidad del worker permanece. Crear otra tarea para reasignar y referenciar la anterior.
`integrada` y `cancelada` son terminales. Las dependencias deben estar integradas antes de iniciar.

## Reservar recursos físicos

```text
node scripts/agent-coordination.mjs reserve --session <coordinador> --resource metro-8081 --holder claude-local --holder-session <sesion-worker> --minutes 30
node scripts/agent-coordination.mjs release --session <coordinador> --resource metro-8081 --holder-session <sesion-worker>
```

Reservas separadas recomendadas: `metro-8081`, `android-build`, `pixel-7-pro`, `s26-ultra`, `buzon-publish`.
La caducidad informa, nunca libera automáticamente. Antes de `release`, confirmar que el proceso/teléfono ya no está ocupado.
Una reserva de otra sesión no se puede liberar sin indicar su identidad exacta. Las mutaciones se serializan con creación exclusiva de `mutation.lock`.

## Recuperar fallos y límites

- Si un proceso muere durante una mutación, el lock bloquea nuevos cambios: inspeccionar PID/host/fecha del archivo y comprobar que terminó antes de retirar SOLO ese lock.
- Si Git creó un worktree pero el registro conserva `worktree_intent`, repetir `worktree --session <coordinador> --id <id>` recupera el registro solo si ruta real, repositorio, rama, base y estado limpio coinciden. Si discrepan, preservar e inspeccionar; nunca borrar ni recrear encima.
- Nunca usar reset duro, force-push ni borrar un worktree con trabajo para desbloquearse.
- Los registros se escriben con archivo temporal, fsync y rename; no editar JSON mientras el CLI está ejecutándose.
- Este CLI no hace push ni envía mensajes, no arranca agentes, y no reserva recursos usados por herramientas que ignoren el protocolo.
- Pruebas: `node --test scripts/agent-coordination.test.mjs` (repos temporales, sin red ni producto).
