# Plan de colaboración Claude Code + Codex para KYNET

Fecha: 2026-10-30. Estado: propuesta lista para implementar; no se ha activado ni modificado la configuración.
Objetivo: conservar la continuidad nube/PC, repartir trabajo verificable y evitar cambios concurrentes sobre el mismo checkout.

## 1. Diagnóstico verificado

- El repositorio real es `C:/dev/KYNET-App/app`, remoto `giiovanny95-hub/kynet`; la carpeta superior es un contenedor local.
- Al revisar: rama `feat/partes-0-1-2`, HEAD `6497ca1`, árbol limpio. Buzón: worktree `../buzon`, rama `coordinacion`.
- App Android-first: Expo 58, React Native 0.88.1, React 19.3, TypeScript estricto, Expo Router.
- Visión: VisionCamera 5, worklets, Skia y módulo Kotlin/Nitro `kynet-native` para MediaPipe; motor de cinemática puro con fixtures y pruebas.
- Datos: SQLite local, cola de sincronización, Supabase, Google OAuth, reglas de gamificación y nueve migraciones SQL.
- Hay implementación de pantallas, audio, onboarding, entrenamiento, progreso y perfil. El historial reciente incluye componentes visuales, errores de login y sincronización al enfocar.
- `docs/estado.md` reporta pendientes físicos: conteo con persona, voz/vibración, sesión prolongada y rendimiento sostenido del S26. Es evidencia histórica, no medición ejecutada en esta revisión.
- CI ejecuta typecheck, lint, Vitest e i18n en PR y push a main. No incluye pruebas SQL ni build Android; existen scripts para comprobaciones adicionales.
- Claude tiene reglas por área, hook SessionStart, skills de aprendizaje/cierre y plugins superpowers, gestión de memoria, Context7 y Expo.
- No se encontró `AGENTS.md`: Codex necesita un punto de entrada explícito; las reglas y hooks de Claude no deben suponerse cargados aquí.
- Claude CLI responde `2.1.314`; Codex CLI responde `0.166.0-alpha.5.1` con advertencias de acceso a temporales en este entorno. Compatibilidad y autenticación del plugin quedan por probar desde Claude.
- El registro local contiene `codex@openai-codex` 1.0.6, fuente `openai/codex-plugin-cc`, instalado con alcance local para OTRO proyecto. KYNET no lo declara habilitado.

## 2. Problemas a resolver antes del trabajo concurrente

1. `CLAUDE.md`, `CLAUDE.local.md`, reglas generales y README del buzón discrepan sobre permisos de push, instalaciones y migraciones. Consolidar el alcance vigente sin interpretar mensajes de otros agentes como autorizaciones.
2. `CLAUDE.local.md` todavía dice que la nube programa en paralelo; `CLAUDE.md` asigna a la nube planificación. El plan mantiene esta última división.
3. `docs/estado.md` combina OAuth configurado con OAuth pendiente y conserva una fecha de actualización anterior a varias entradas. Reconciliarlo contra commits y evidencia; no marcar pruebas físicas como hechas.
4. El buzón supone dos escritores. Una tercera sesión escribiendo como “local” rompe esa premisa.
5. El vigilante notifica a varias sesiones; un aviso no reserva una tarea. Sus “vistos” significan notificación, no trabajo completado.
6. `herramientas/verificar.sh` fija el checkout principal y usa un log compartido. En un worktree de Codex podría verificar código distinto del entregado.
7. Herramientas locales no versionadas y rutas Windows absolutas no están disponibles en la nube.
8. El hook de contexto recorta “Siguiente paso” a seis líneas: no debe sustituir la lectura de la tarea asignada.

## 3. Reparto inicial propuesto

| Participante | Responsabilidad | Entrega |
|---|---|---|
| Claude nube | Requisitos, investigación, diseño, planes y revisión de aceptación | Plan con base SHA, archivos, pruebas, dependencias y criterios |
| Claude local | Integrar, resolver dependencias entre tareas, UI en dispositivo, Android/ADB/Metro, mediciones | Commit integrado y evidencia del dispositivo |
| Codex delegado desde Claude | Implementaciones acotadas, depuración reproducible, tests, refactors y revisión independiente | Commit o diff, pruebas ejecutadas y limitaciones |
| Codex en esta app | Auditorías o tareas asignadas explícitamente en checkout propio | Mismo contrato de entrega; identidad de sesión distinta |

Este reparto usa continuidad de contexto y herramientas disponibles. No presupone que una marca sea superior en todas las tareas de un área.
Después de tres tareas comparables, ajustar según tiempo total, correcciones, calidad de pruebas y consumo disponible.
Un autor por tarea y un revisor diferente para cambios relevantes. Claude local es el único integrador inicial.
Seguridad, OAuth, RLS y migraciones conservan las restricciones existentes de delegación hasta armonizar explícitamente las políticas; Codex puede aportar revisión de solo lectura.
Las decisiones de producto y arquitectura permanecen en el plan de Claude nube y el usuario.

## 4. Fase A — Contexto compartido y política única

Archivos propuestos:
- `AGENTS.md`: entrada breve de Codex, comandos, reglas críticas y enlaces a estado/specs/política compartida.
- `docs/colaboracion-agentes.md`: roles, permisos, asignación, entrega, integración y recuperación.
- `CLAUDE.md`: conservar reglas de producto y enlazar el protocolo común.
- `.claude/rules/general.md`: eliminar duplicidades y contradicciones con el protocolo acordado.
- `CLAUDE.local.md`: actualizar rol de la nube y reserva de recursos; mantenerlo local.
- `docs/estado.md`: reconciliar pendientes contra commits y evidencia, con fecha y base verificable.

No copiar todas las instrucciones en dos archivos: mantener una fuente común y entradas pequeñas por agente.
Codex leerá explícitamente las reglas técnicas del área; no se asumirá soporte para imports `@...` ni auto-carga de `.claude/rules`.
Mantener cada documento operativo por debajo de 200 líneas; separar referencias cuando sea necesario.
Aceptación: sesiones nuevas de ambos agentes identifican el mismo repo, alcance, restricciones y siguiente tarea; ninguna depende de memoria privada de otra máquina.

## 5. Fase B — Activar el plugin oficial en KYNET

1. Respaldar configuración actual y registrar versiones; no modificar el plugin instalado de otro proyecto.
2. Dentro de Claude Code abierto en `C:/dev/KYNET-App/app`, comprobar `/plugin` y el marketplace existente.
3. Si falta el marketplace, usar `/plugin marketplace add openai/codex-plugin-cc`.
4. Instalar `codex@openai-codex` con alcance de proyecto desde el gestor; reflejar marketplace y habilitación en `.claude/settings.json`.
5. Recargar con `/reload-plugins` y ejecutar `/codex:setup`. Resolver autenticación solo si la comprobación lo requiere, sin copiar credenciales a Git ni a la nube.
6. Empezar con la versión inspeccionada 1.0.6 como referencia reproducible. Si el gestor instala otra, revisar sus cambios y registrar versión/commit antes del piloto; no asumir que el marketplace queda fijado por declarar su nombre.
7. Confirmar comandos review, adversarial-review, rescue, status, result y cancel, además del agente `codex:codex-rescue`.
8. Mantener el review gate al detenerse desactivado durante el piloto; después evaluar activarlo según duplicación de revisiones y consumo.

El plugin inspeccionado soporta revisiones de solo lectura y tareas con escritura. `rescue` puede habilitar escritura por defecto: indicar expresamente “solo lectura” en diagnósticos.
No seleccionar modelos ni esfuerzo arbitrarios; usar los defaults configurados y medir. Registrar el modelo efectivo cuando esté disponible.
No añadir un segundo puente MCP propio mientras el plugin cubra el flujo; reduce mantenimiento y duplicación de sesiones.
Aceptación: una revisión pequeña finaliza, puede consultarse por ID y devuelve resultados sin modificar el código.

## 6. Fase C — Aislar ejecución y recursos

- Mantener `app/` para Claude local. Crear worktrees de tarea en `C:/dev/KYNET-App/worktrees/<id>` desde una base SHA explícita, con ramas `feat/codex-<id>`.
- Ejecutar la delegación desde el worktree asignado y comprobar el cwd efectivo del job. No asumir que el plugin crea aislamiento automáticamente.
- Si no puede verificarse el cwd, usar escritura secuencial con el propietario del checkout en pausa; no lanzar dos escritores en el mismo checkout.
- Limitar inicialmente a un trabajo de Codex con escritura. Revisión paralela solo sobre snapshot/commit estable.
- Registrar dueño, sesión y expiración para recursos compartidos: Metro/8081, build Android y cada teléfono por separado.
- Usar un coordinador local único para otorgar reservas y evitar adquisiciones simultáneas. Una reserva expirada exige comprobar que el proceso anterior terminó.
- Preparar dependencias por worktree con las versiones del lockfile y entorno reproducible. No compartir directorios de build mutables entre tareas.
- No ejecutar prebuild, instalar APK ni reiniciar Metro desde un worker genérico; solicitar al integrador local mediante el contrato de tarea.
- No usar reset duro ni borrar worktrees con cambios para recuperar errores; preservar diff/commit primero.

Aceptación: dos tareas independientes no se pisan; un intento de usar un recurso ocupado se rechaza; el commit medido coincide con el entregado.

## 7. Fase D — Sincronización durable

Conservar la rama `coordinacion`. Durante el piloto Claude local será el único escritor de `para-nube/`; Codex le entrega resultados y no escribe fingiendo ser la sesión local.
Claude nube conserva `para-local/`. Los mensajes son append-only y las respuestas referencian el ID original.
El coordinador registra asignaciones antes de delegar. Añadir registros de tarea por ID, evitando un único archivo que todos editen.

Contrato mínimo:
`id`, `owner`, `session_id`, `status`, `base_sha`, `branch`, `worktree`, `scope`, `depends_on`, `acceptance`, `result_sha`, `checks`, `limitations`, `responde-a`.
Estados: propuesta → asignada → en curso → revisión → integrada; estados alternos: bloqueada y cancelada.
Solo el coordinador asigna/reasigna; el worker informa resultados. Repetir un aviso del mismo ID no inicia otra ejecución.
Separar “mensaje notificado”, “tarea aceptada” y “tarea integrada”. Persistir cursores; recuperar pendientes al reiniciar.
Serializar escrituras/push del buzón; ante divergencia incorporar cambios y reintentar sin force-push. Nunca sobrescribir el mensaje ajeno.
El vigilante puede leer refs remotas sin modificar el worktree que otro proceso esté usando; fallos de red deben conservar pendientes.
El estado global tendrá un único editor responsable (Claude nube), alimentado por resultados del integrador local. Evitar que todos actualicen `docs/estado.md` a la vez.
No sincronizar transcripciones completas, secretos ni caches. Compartir tareas, decisiones, commits y evidencia resumida.

El plugin crea sus propios jobs/hilos. Esta conversación de Codex no se convierte automáticamente en ese worker.
`/codex:transfer` sirve para un traspaso puntual y devuelve una sesión reanudable; no constituye sincronización bidireccional continua.
La nube recibe código/contexto versionado por Git. Comprobar en la sesión remota instalación, autenticación y conectividad antes de habilitar Codex allí.
Si no puede ejecutar el plugin remoto, mantener la delegación en la PC; no bloquear la planificación ni copiar tokens locales.

Aceptación: reiniciar una sesión recupera la misma tarea sin duplicarla; un fallo de red no pierde mensajes; un resultado incluye base y SHA final verificables.

## 8. Fase E — Verificación portable e integración

- Crear `scripts/verify.mjs` o equivalente portable, con cwd explícito/raíz detectada y salida no cero al primer fallo; exponer `npm run verify`.
- Migrar el wrapper local a ese comando, sin ruta fija a `app/` ni `/tmp/verificar.log` compartido.
- Reutilizar los tests versionados de orden de worklets; comparar el script local adicional antes de retirarlo para no perder cobertura.
- Ejecutar typecheck, lint, test e i18n en el worktree del autor; añadir SQL cuando cambie SQL y build Android cuando cambie código nativo/configuración.
- Para cámara, pose o entrenamiento, adjuntar medición física por dispositivo y SHA; una revisión de Codex no sustituye esa prueba.
- Revisar el diff frente al base SHA de la tarea. Evitar revisar toda la rama histórica para cada cambio pequeño.
- Claude local integra sin reescribir historia, vuelve a verificar el resultado combinado y entrega evidencia a la nube.
- Si el entorno Windows depende de rutas Expo generadas, regenerarlas en ese worktree antes del typecheck y documentar el paso.

Aceptación: el mismo comando funciona en Windows y CI Linux; un error intencional en una prueba falla correctamente; ningún resultado corresponde a otro checkout.

## 9. Piloto y criterios de éxito

Piloto 1: revisión de solo lectura de un cambio pequeño y estable, con `/codex:review --wait --base <base-sha>`; confirmar hallazgos contra archivos reales.
Piloto 2: tarea acotada de test o lógica pura elegida por el planificador, en worktree propio; Claude revisa y el integrador verifica el commit combinado.
Piloto 3: revisión cruzada de un cambio de Claude más recuperación tras reinicio/aviso repetido; probar cancelación y trazabilidad del resultado.
No comenzar con migraciones, login ni selección de delegado CPU/GPU: tienen restricciones o dependen del dispositivo.
Medir tiempo total hasta aceptación, retrabajo, fallos posteriores, conflictos, duplicación y consumo mostrado por las herramientas; no inventar costes o ahorros.
Éxito: tareas sin doble ejecución, cero archivos pisados, pruebas atribuibles al SHA, contexto recuperable y aceptación por el responsable.
Reversión: deshabilitar el plugin solo en KYNET, detener sus jobs identificados y volver al flujo nube/local preservando commits, registros y configuración previa.

## 10. Fuentes y límites de esta revisión

- Código y configuración local inspeccionados; registro de plugins, manifiesto y comandos de `codex@openai-codex` 1.0.6.
- README local del marketplace: `C:/Users/Giova/.claude/plugins/marketplaces/openai-codex/README.md`.
- Comandos inspeccionados: `setup.md`, `review.md`, `rescue.md`, `transfer.md`; scripts muestran ejecución read-only/workspace-write según tarea.
- Documentación oficial consultada: https://developers.openai.com/learn/developers-codex-plugin . Ese producto es OpenAI Developers, orientado a API/documentación; es distinto del plugin Codex ya encontrado localmente.
- La disponibilidad remota, autenticación y ejecución real del plugin no se han probado. No se ejecutaron tests, build ni mediciones físicas para este plan.
- Esta revisión cubre arquitectura y coordinación con lecturas representativas de código; no es una auditoría completa de seguridad ni certificación funcional del MVP.

Orden: A → B → C → D → E → pilotos. No activar delegación de escritura antes de tener aislamiento y contrato de entrega.
