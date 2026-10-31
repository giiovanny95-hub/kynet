# Mejoras de experiencia del benchmark: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** que se pueda entrenar sin mirar ni tocar el teléfono: contador legible a 3 m con borde de color según la forma, silueta guía en la colocación, arranque automático con cuenta atrás y voz que corrige y cuenta.

**Architecture:** cada mejora tiene una parte pura en `src/features/workout/` o `src/audio/` (probada con Vitest) y una parte de pantalla en `app/workout/` (typecheck y lint; la verifica la sesión local en el teléfono). No cambia la cinemática ni el módulo nativo. Nada nuevo corre por cuadro en JS: todo se alimenta de los eventos del motor, del HUD que ya se publica al cambiar y de relojes de 100-250 ms.

**Tech Stack:** el de las partes 3-4. Paquete nuevo: `expo-speech` (SDK 58, con `EXPO_OFFLINE=1 npx expo install expo-speech`). **Requiere aprobación explícita del usuario antes de instalarlo (Task 4).**

**Spec:**
- `docs/spec-producto.md` §3.3 (colocación: silueta, "usuario se mueve durante la cuenta atrás"), §3.4 (HUD, audio con voz opcional), §5.1 (avisos de forma) y §9 punto 10 (voz).
- `docs/spec-cinematica.md` §6.3 (calidades Miss, Good, Great y Perfect) y §7 (códigos y severidades).
- Benchmark del usuario (2026-10-29), resumido en el chat: el contador ocupa al menos el 20 % del alto de la pantalla; borde verde, ámbar o rojo; arranque sin tocar con cuenta atrás por voz de 3 s; voz que corrige y cuenta.

## Global Constraints
- Siguen vigentes todas las reglas de `CLAUDE.md`:
  - textos solo por i18n (es base, en con las mismas claves; `npm run i18n:check` en verde);
  - sin `any`;
  - nada de cinemática ni datos por cuadro en el hilo de JS.
- Contador: alto de fuente = `round(0.20 × alto de la ventana)` (`useWindowDimensions`).
- Tonos del borde (`FormTone`):
  - `good` (verde, `tokens.accent`) = última repetición `Perfect` o `Great`;
  - `warn` (ámbar, `tokens.warn`) = `Good`, o un `FEEDBACK` de severidad `medium`;
  - `bad` (rojo, `tokens.danger`) = `Miss` (incluye incompleta y falta), o un `FEEDBACK` `high`;
  - `neutral` = sin repeticiones todavía, en descanso o en pausa.
  - El tono de un aviso dura 2000 ms y después vuelve al de la última repetición.
- Colocación: verde tras **1500 ms** sin pausa del motor (como ahora).
- Cuenta atrás: **3000 ms**, con un tick por segundo ("3", "2", "1") y "¡Vamos!" al terminar.
- Si durante la cuenta atrás el motor pausa más de **500 ms** seguidos, se vuelve a colocación.
- Voz:
  - idioma `es-MX` si el idioma de la app es español, `en-US` si es inglés; velocidad 1,0;
  - corrige con los textos `feedback.*` existentes;
  - dice el número de repetición en múltiplos de 5 y "Serie completa" al acabar la serie;
  - una corrección (`FEEDBACK` `medium`, `high` o `pause`) interrumpe una frase de menor prioridad, y nunca al revés;
  - los tonos siguen sonando siempre (confirman al instante);
  - interruptor "Voz" en el HUD, encendido por defecto y en memoria (la parte 5 lo guardará).
- Sin cobro en el MVP: la estrategia de cobro queda solo como sugerencia en `docs/spec-producto.md` §8.1.

## Review Focus
1. **La persona se mueve o sale del encuadre durante la cuenta atrás:** la cuenta se cancela, vuelve a colocación y no arranca el entrenamiento con la persona fuera. Test en la Task 3.
2. **Avisos encadenados:** una ráfaga de eventos (repetición, aviso y pausa en el mismo lote) no hace que la voz hable encima de sí misma, ni que una frase de conteo corte una corrección. Test en la Task 4.
3. **Voz apagada o sin voz en español instalada:** la app sigue funcionando solo con tonos y sin errores. `Speech.speak` falla en silencio. Test en la Task 4 (política con `enabled: false`) y comprobación en dispositivo en la Task 5.
4. **Contador de 3 dígitos en un teléfono pequeño:** "100 / 100" cabe sin cortarse (`adjustsFontSizeToFit` con `numberOfLines={1}`). Se comprueba en la Task 5.
5. **El borde no parpadea con avisos seguidos:** el tono de aviso dura 2000 ms desde el último aviso, y no se reinicia a `neutral` entre avisos. Test en la Task 1.

---

### Task 1: Tono de forma y HUD legible a 3 m

**Files:**
- Create: `src/features/workout/formTone.ts`, `src/features/workout/formTone.test.ts`.
- Modify: `app/workout/[exercise]/live.tsx` (contador al 20 % de la altura, borde de color de 8 px alrededor de la pantalla) y `src/ui/tokens.ts` (añade `neutral: '#9aa3b2'` si no existe).

**Interfaces:**
- Produces:
  - `type FormTone = 'good' | 'warn' | 'bad' | 'neutral'`;
  - `interface ToneState { readonly repTone: FormTone; readonly alertTone: FormTone | null; readonly alertUntilMs: number }`;
  - `createToneState(): ToneState`;
  - `toneStep(s: ToneState, event: EngineEvent, nowMs: number): ToneState`;
  - `toneAt(s: ToneState, nowMs: number, phase: SessionPhase): FormTone`, que devuelve `neutral` si `phase !== 'active'`;
  - `TONE_ALERT_MS = 2000`.
- [ ] **Step 1: Write the failing tests** (`formTone.test.ts`):
  - `Perfect` → `good`; `Good` → `warn`; repetición `incomplete` → `bad`;
  - `FEEDBACK medium` a t=0 → `warn` a t=1999 y vuelve al tono de la repetición a t=2001;
  - `FEEDBACK high` → `bad`;
  - (Review Focus 5) dos avisos a t=0 y t=1500 → `warn` todavía a t=3000;
  - fase `rest` → `neutral`.
- [ ] **Step 2:** `npx vitest run src/features/workout/formTone.test.ts`. Expected: FAIL (módulo no existe).
- [ ] **Step 3: Implement** las funciones de Interfaces.
- [ ] **Step 4:** el mismo comando. Expected: PASS.
- [ ] **Step 5: HUD en `live.tsx`:**
  - `toneState` en `useRef`, actualizado en `onEvent` con cada evento;
  - un reloj de 250 ms re-renderiza el tono (el mismo `setInterval` del HUD que ya existe);
  - el contador usa `fontSize = Math.round(0.2 * height)`, `numberOfLines={1}` y `adjustsFontSizeToFit`;
  - el borde es una `View` absoluta con `borderWidth: 8` y `pointerEvents="none"`, en el color del tono (`neutral` = transparente).
- [ ] **Step 6:** `npm run typecheck && npm run lint && npm test`. Expected: en verde.
- [ ] **Step 7: Commit** `feat(workout): contador grande y borde de color según la forma`.

### Task 2: Silueta guía y esqueleto con el color de la forma

**Files:**
- Create: `src/ui/silhouettes.ts`, `src/ui/silhouettes.test.ts`.
- Modify: `src/ui/Skeleton.tsx` (prop `color` ya existe; se usa con el tono), `app/workout/[exercise]/setup.tsx` y `app/workout/[exercise]/live.tsx`.

**Interfaces:**
- Consumes: `BLAZEPOSE_BONES` y `toOverlayBones` de `src/vision/overlay.ts`; `FormTone` de la Task 1.
- Produces:
  - `silhouetteFor(exercise: EngineExercise): Float32Array`: 132 valores con el formato de landmarks (x, y en 0-1 del cuadro vertical, z 0, v 1 en los puntos del esqueleto y 0 en el resto):
    - sentadilla: de perfil y de pie;
    - jumping jack: de frente y de pie, con los brazos abajo;
    - flexión: de perfil, en plancha en el tercio inferior;
  - `toneColor(t: FormTone): string`.
- [ ] **Step 1: Write the failing tests:**
  - para cada ejercicio, `silhouetteFor` devuelve 132 valores con x e y en `[0.05, 0.95]` en los puntos visibles;
  - `toOverlayBones(silhouetteFor(e), 400, 800, false, 0.75)` da al menos 10 huesos;
  - la silueta de flexión tiene el hombro y el tobillo a menos de 30° de la horizontal.
- [ ] **Step 2:** `npx vitest run src/ui/silhouettes.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `silhouettes.ts` con coordenadas fijas.
- [ ] **Step 4:** el mismo comando. Expected: PASS.
- [ ] **Step 5: Pantallas:**
  - en `setup.tsx`, mientras `stage === 'placing'`, se dibuja la silueta con un segundo `<Skeleton>` (sus `landmarks` son un `useSharedValue` con la silueta fija; color `tokens.muted`, opacidad 0,5) debajo del esqueleto en vivo;
  - en `live.tsx`, el esqueleto usa `toneColor(tono)` en lugar del verde fijo.
- [ ] **Step 6:** `npm run typecheck && npm run lint && npm test`. Expected: en verde.
- [ ] **Step 7: Commit** `feat(ui): silueta guía en la colocación y esqueleto con el color de la forma`.

### Task 3: Arranque sin tocar el teléfono

**Files:**
- Create: `src/features/workout/placement.ts`, `src/features/workout/placement.test.ts`.
- Modify: `app/workout/[exercise]/setup.tsx` (sustituye el botón "Empezar" y el sondeo de colocación por el modelo) y las claves i18n `setup.countdown`, `voice.go`.

**Interfaces:**
- Produces:
  - `type PlacementPhase = 'placing' | 'countdown' | 'go'`;
  - `interface PlacementState { readonly phase: PlacementPhase; readonly okSinceMs: number | null; readonly badSinceMs: number | null; readonly countdownStartMs: number | null; readonly lastTick: number | null }`;
  - `createPlacement(): PlacementState`;
  - `placementStep(s: PlacementState, ok: boolean, nowMs: number): { s: PlacementState; tick: 3 | 2 | 1 | 'go' | null }`. `ok` = el motor no está en pausa y hay persona;
  - constantes `PLACED_MS = 1500`, `COUNTDOWN_MS = 3000`, `CANCEL_AFTER_MS = 500`.
- [ ] **Step 1: Write the failing tests:**
  - `ok` continuo desde t=0: a t=1500 pasa a `countdown` y emite tick 3; ticks 2 y 1 a t=2500 y t=3500; `go` a t=4500;
  - `ok` intermitente (cada 400 ms falso) nunca llega a `countdown`;
  - (Review Focus 1) en `countdown`, `ok` falso de t=2000 a t=2600 vuelve a `placing` sin emitir `go`; con `ok` falso solo 300 ms, la cuenta sigue;
  - cada tick se emite una sola vez aunque se llame cada 100 ms.
- [ ] **Step 2:** `npx vitest run src/features/workout/placement.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `placementStep` según los tests y las constantes.
- [ ] **Step 4:** el mismo comando. Expected: PASS.
- [ ] **Step 5: `setup.tsx`:**
  - un reloj de 100 ms llama a `placementStep` con `!hud.value.paused && landmarks.value !== undefined`;
  - en cuenta atrás muestra el número grande (20 % del alto) y en cada tick suena el tono `rep` (la voz se añade en la Task 4);
  - en `go`: con perfil conocido, `goLive()`; si no, pasa a `calibrating`;
  - el botón "Omitir (usar valores estándar)" se mantiene.
- [ ] **Step 6:** `npm run typecheck && npm run lint && npm run i18n:check && npm test`. Expected: en verde.
- [ ] **Step 7: Commit** `feat(workout): arranque sin tocar con cuenta atrás de 3 s`.

### Task 4: Voz que corrige y cuenta

**Files:**
- Create: `src/audio/voicePolicy.ts`, `src/audio/voicePolicy.test.ts` y `src/audio/useVoice.ts`.
- Modify: `app/workout/[exercise]/live.tsx` (interruptor "Voz" y llamada en `onEvent`), `app/workout/[exercise]/setup.tsx` (cuenta atrás hablada), `package.json` y `package-lock.json`, y las claves i18n `voice.*`.

**Interfaces:**
- Consumes: `EngineEvent` y `FeedbackEvent` (cinemática); `tick` de la Task 3; `t` de i18next.
- Produces:
  - `type VoicePriority = 0 | 1 | 2`: 0 conteo, 1 aviso `medium`, 2 aviso `high` o `pause` y cuenta atrás;
  - `interface Utterance { readonly key: string; readonly params?: Readonly<Record<string, string | number>>; readonly priority: VoicePriority }`;
  - `pickUtterance(events: readonly EngineEvent[], ctx: { readonly repsInSet: number; readonly repsPerSet: number }): Utterance | null`. Elige la de más prioridad del lote:
    - un `FEEDBACK` `low` no habla;
    - una repetición válida habla solo si `repsInSet % 5 === 0` (`voice.count`, `{ n }`) o si `repsInSet === repsPerSet` (`voice.setDone`);
  - `shouldSpeak(current: { readonly priority: VoicePriority; readonly untilMs: number } | null, next: Utterance, nowMs: number, enabled: boolean): boolean`: `false` si `!enabled`; `true` si no hay frase en curso (`nowMs ≥ untilMs`) o si `next.priority > current.priority`;
  - `useVoice(): { say(u: Utterance): void; enabled: boolean; setEnabled(v: boolean): void }` en `useVoice.ts`. Usa `Speech.speak(t(u.key, u.params), { language, rate: 1, onDone, onStopped, onError })` y `Speech.stop()` antes de interrumpir. `untilMs` = ahora + 3000 hasta `onDone`.
- [ ] **Step 0 (aprobación):** con la aprobación explícita del usuario, `EXPO_OFFLINE=1 npx expo install expo-speech`. Después lee los tipos instalados (`node_modules/expo-speech/build/Speech.d.ts`) y ajusta los nombres de opciones si difieren. Sin aprobación, para aquí y pregunta.
- [ ] **Step 1: Write the failing tests** (`voicePolicy.test.ts`):
  - un lote con una repetición válida (`repsInSet` 3) no habla; con `repsInSet` 5 da `voice.count` `{ n: 5 }`; con `repsInSet === repsPerSet` da `voice.setDone`;
  - (Review Focus 2) un lote [repetición válida en múltiplo de 5, `FEEDBACK high SQ_DEPTH_SHALLOW`] da `feedback.SQ_DEPTH_SHALLOW` con prioridad 2;
  - `shouldSpeak`: con una frase de prioridad 2 en curso, un conteo (0) no habla y otro aviso de prioridad 2 tampoco; con una frase de prioridad 0 en curso, un aviso de prioridad 1 sí;
  - (Review Focus 3) con `enabled: false` nunca habla.
- [ ] **Step 2:** `npx vitest run src/audio/voicePolicy.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `voicePolicy.ts`, y después `useVoice.ts`, sin test unitario (envoltura del paquete). Si `Speech.speak` lanza una excepción, se ignora.
- [ ] **Step 4:** el mismo comando. Expected: PASS.
- [ ] **Step 5: Pantallas:**
  - en `live.tsx`, `onEvent` (solo en `active`) llama a `pickUtterance` y, si procede, a `say`;
  - el interruptor "Voz" va en la barra superior, junto a Pausa;
  - en `setup.tsx`, los ticks 3, 2 y 1 dicen `voice.tick` `{ n }` y `go` dice `voice.go`, con prioridad 2.
- [ ] **Step 6:** `npm run typecheck && npm run lint && npm run i18n:check && npm test`. Expected: en verde.
- [ ] **Step 7: Commit** `feat(audio): voz que corrige y cuenta, con interruptor`. Avisa a la sesión local por el buzón: hace falta `npm install` y una build nueva (módulo nativo de `expo-speech`).

### Task 5: Verificación en dispositivo (sesión local)
La sesión local compila y anota en `docs/spike-results.md`, en la sección "Mejoras de experiencia":
- [ ] **Contador** legible a 3 m en el S26 Ultra y el Pixel 7 Pro, y "100 / 100" sin cortarse (Review Focus 4).
- [ ] **Borde:** cambia de color con repeticiones buenas, flojas y fallidas, sin parpadeo.
- [ ] **Silueta** visible durante la colocación en los 3 ejercicios.
- [ ] **Cuenta atrás:** arranca sin tocar y se cancela al salir del encuadre (Review Focus 1).
- [ ] **Voz:**
  - en español; latencia de la corrección perceptible o no (si supera ~500 ms, se anota);
  - sin voz en español instalada o con el interruptor apagado, solo tonos y sin errores (Review Focus 3).
- [ ] **Rendimiento:** FPS de inferencia sin cambios respecto a la medición anterior (la voz no debe bajarlos).

## Fuera de este plan
- Voz grabada con locutor (se decide tras medir la síntesis del sistema).
- Avisos por voz de la calibración.
- Guardado del interruptor de voz (parte 5).
- Cobro: solo sugerencia en `docs/spec-producto.md` §8.1.
