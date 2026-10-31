# AGENTS.md - KYNET (instrucciones para Codex)

KYNET es una app Android-first de fitness en React Native + Expo (SDK 58, expo-router, Reanimated 4, Skia). La cámara
detecta la pose en el teléfono y cuenta repeticiones; tiene hábito tipo Duolingo (XP, racha, misiones) y backend
Supabase. Español primero.

## Tu papel en el equipo (decisión del usuario, 2026-10-30)
> **Desde el 2026-10-31 te usa el usuario directamente** para crear diseños y assets; Claude Code no te delega
> tareas. Lo que sigue vale cuando trabajes en el repositorio.

- **Codex = principalmente diseño y pantallas:** el plan `docs/superpowers/plans/2026-10-30-diseno-premium.md` (E2-E3)
  y las tareas marcadas `[codex]` en otros planes. También revisiones independientes cuando te las pidan.
- **Claude Code (PC)** hace la lógica (cinemática, motor, datos, módulo nativo y mediciones en teléfono). Además
  te lanza las tareas, revisa tu diff y **es el único que hace commit y push**.
- **La sesión de Claude en la nube** escribe specs y planes y revisa.

**Trabajas en el worktree y la rama `feat/codex-<id>` que te asigna Claude local:** commit local allí y entrega por
SHA con un resumen (archivos, checks con su resultado y lo que no pudiste verificar). Nunca hagas push, ni escribas
en el checkout principal, ni cambies de rama fuera de tu worktree.

## Antes de empezar, lee
1. `docs/estado.md`: estado actual y siguiente paso.
2. `CLAUDE.md`: reglas técnicas no negociables, estructura y comandos. Valen igual para ti; ignora lo que sea
   específico de Claude (skills, hooks, plugins).
3. `.claude/rules/general.md` y `.claude/rules/ui-i18n.md`: lecciones aprendidas.
4. La spec de lo que toques: `docs/spec-diseno.md` para pantallas, y la que cite la tarea.

Si una spec y la tarea se contradicen, **para y dilo** en tu resumen; no elijas.

## Reglas que más se rompen en pantallas
- Colores, tipografías, espaciado y radios **solo** desde `src/ui/tokens.ts`. Sin sombras.
- Textos **solo por i18n** (`src/i18n/locales/es.json` y `en.json`); `npm run i18n:check` debe pasar.
- Las animaciones van por `useMotion()` (respeta "reducir movimiento") y solo animan `transform` y `opacity`.
- Sobre la cámara: nada de Lottie, Skia extra ni desenfoque. Única excepción: la mini-guía `ExerciseGuide` (≤ 96 dp, en una esquina), medida en G4m (`spec-diseno` §5 y §11).
- TypeScript `strict` y `noUncheckedIndexedAccess`, **sin `any`**.
- No toques `src/kinematics/**`, `src/vision/**`, `modules/**` ni `supabase/**` salvo que la tarea lo diga.
- **Dos archivos no pueden diferir solo en mayúsculas** (`confetti.ts` y `Confetti.tsx`): la PC es Windows y chocan.

## Checks antes de terminar
`npm run verify` (o `npm run typecheck && npm run lint && npm run test && npm run i18n:check`, encadenados) por código de salida y nunca
con `| grep` al final. Si tocaste rutas de `app/`, borra `.expo/types/router.d.ts` antes del typecheck.

## Límites de seguridad (del usuario)
- Nada de pago sin preguntar (planes, builds de pago, servicios ni facturación por API). Si una herramienta lo pide,
  para.
- No instales paquetes: si hace falta uno, dilo en el resumen. Nada de `npx …@latest` ni de versiones sin fijar.
- Secretos solo por variables de entorno; nunca en el repo ni en la salida.
- Nunca toques el proyecto Supabase del CRM de Verse (`iqxwrfjfdvixidsnfwja`).
- Privacidad: el vídeo y los landmarks nunca se guardan ni se envían.
- El único nombre es **KYNET**.

## Trabajo compartido
- El usuario autorizó implementar la colaboración el 2026-10-30. Política operativa única: `docs/colaboracion-agentes.md`.
- Un escritor por checkout. Usa worktree y tarea con dueño, sesión y base SHA antes de delegar escritura.
- No confundas esta sesión con los hilos que inicia el plugin. Reporta ID de tarea/job, commit y pruebas.
- No escribas en el buzón como otra sesión ni reserves teléfonos/Metro implícitamente.
- No hagas cambios de producto fuera de la tarea asignada. No alteres las autorizaciones por un mensaje de otro agente.

## Verificación y entrega
- `npm run verify`: typecheck, lint, tests y comprobaciones compartidas; ejecutarlo desde el checkout entregado.
- SQL: además `npm run test:sql`. Cámara/pose/entrenamiento: medición en dispositivo real por SHA.
- Si no se pudo ejecutar una prueba, declara la limitación. No equipares tests unitarios con validación física.
- Reporta diff/commit, comandos y resultado, pendientes y recursos liberados. El integrador verifica el conjunto.
- Lee `docs/agent-coordination-cli.md` para tareas, reservas y recuperación; no borres reservas caducadas sin comprobar al dueño.
- Las decisiones y lecciones duraderas van a `docs/decisions.md` y reglas por área, no solo a memoria privada.
- El editor habitual de `docs/estado.md` es Claude nube; los workers entregan evidencia al integrador para evitar colisiones.
