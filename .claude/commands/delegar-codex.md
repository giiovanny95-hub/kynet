---
description: Asigna una tarea delimitada a Codex con contexto, worktree y entrega verificable
argument-hint: '<id de tarea o descripción de la tarea>'
---

Petición: $ARGUMENTS

Lee `docs/colaboracion-agentes.md` y `docs/agent-coordination-cli.md`.
Este comando coordina trabajo autorizado; no concede permisos adicionales ni sustituye el plugin oficial.

1. Consulta `node scripts/agent-coordination.mjs status`. Si hay coordinador de otra sesión, entrega la solicitud
   a ese coordinador; no tomes su identidad ni borres locks. Si está libre, usa `claim` con TU ID de sesión.
2. Antes de crear una tarea, busca su ID y resultado. Nunca repitas una ejecución por un aviso duplicado.
3. Define tarea JSON (base SHA fija, owner codex, session_id, scope, acceptance, dependencias) y registra `create`.
4. Crea `worktree`, instala dependencias del lockfile allí si son necesarias y pasa a `en-curso`.
5. Delega por el agente oficial `codex:codex-rescue` desde el worktree; verifica cwd. Si invocas el companion
   directamente, conserva las instrucciones del plugin, usa su ruta resuelta de instalación y pasa `--cwd <worktree>`.
   Nunca hardcodees la versión/ruta de caché en archivos versionados. Usa `--prompt-file` para instrucciones extensas.
6. El prompt contiene ID, base SHA, archivos permitidos, aceptación, pruebas, limitaciones y prohibición de usar
   Metro/teléfonos o escribir en el checkout principal. Pide commit local con mensaje en español y entrega por SHA.
   Para diagnóstico indicar expresamente solo lectura. Dejar modelo/esfuerzo sin fijar salvo petición del usuario.
7. Recupera job ID/salida con las herramientas oficiales. No lances otro job mientras el primero siga activo.
8. Confirma los hallazgos y diff; registra `revision` con SHA y checks. Revisa el cambio antes de integrarlo,
   ejecuta `npm run verify` en el resultado combinado y registra `integrada` con su SHA y evidencia.
9. Publica el resumen por buzón como integrador, bajo reserva `buzon-publish`. Libera recursos propios y el rol
   si entregas la coordinación. No declares pruebas de teléfono como realizadas sin medición.

Si el plugin falta: instalar `codex@openai-codex` en alcance proyecto, recargar plugins y `/codex:setup`.
Si falla autenticación/runtime, registrar bloqueo; no copiar tokens ni inventar resultados.
