# Estado del proyecto (traspaso entre sesiones)

## Última actualización
2026-10-31. Sesión de la **nube**: los 3 GIF entregados; la PC implementa las guías en modo continuo. Último commit de la PC: `560cd95`.

## Estado
- **Equipo (2026-10-31):** la nube planifica y revisa; **Claude Code (PC)** implementa todo (lógica y pantallas).
  - El usuario usa Codex por su cuenta para diseñar y entrega assets.
  - Política: `docs/colaboracion-agentes.md`, válida si el usuario vuelve a delegar en Codex.
  - `npm run verify`, también en CI.
- **Vista de frente (2026-10-30):** spec `docs/spec-vista-frontal.md` y plan
  `docs/superpowers/plans/2026-10-30-vista-frontal.md`. El usuario elige Frente (por defecto) o Lado en sentadilla y
  flexión.
- **Vista de frente, F1-F4.3 (PC, revisado en la nube):**
  - F1.1-F1.3: generadores con perspectiva (`68e8440`, `02cc06d`);
  - F2.1 y F3.1: señales de frente (`c80f63a`, `031f210`);
  - F4.3: preferencia `exerciseView` (`d2986f8`);
  - checks: 412 tests, kinematics 152/152 y benchmark 8/8;
  - **F1.4 resuelto:** umbrales de frente en la spec §3-§5 (`decisions.md`, 2026-10-31).
  - F2.2 (`2f0d898`): sentadilla de frente en el motor y referencia de pie corregida.
    - σ 0,004: 540/540 series de 10/10.
    - σ 0,008: 457/540, con un mínimo de 7 a 3 m, por la histéresis frente al ruido.
    - Decidido `abortHoldMs` 150 (F2.2b) antes de F3.2.
- **F0 de vista de frente hecho (`728635f`, aceptado):**
  - reproductor `npm run replay`;
  - el grabador guarda `view`, `profile` y `realReps`, y se puede armar antes de la salida;
  - `PAUSE` lleva su causa.
- **B1 cerrado (PC, 2026-10-31):**
  - login con Google, exportar, y cerrar sesión y volver a entrar en los dos teléfonos;
  - en el servidor siguen 3 sesiones, 119 `rep_summaries` y 331 XP, sin duplicados;
  - A2 verificado;
  - **sin probar:** borrar la cuenta, hasta tener una cuenta de prueba aparte.
- **Cierre del MVP, bloque A (2026-10-30):** `SQ_HEELS_LIFT` robusto y descarga de sesiones de otros dispositivos,
  hechos por la PC y revisados en la nube. El bloque B (mediciones en el teléfono) espera al usuario.
- **Memoria de Claude Code (nube, 2026-10-30):** `CLAUDE.md` con flujo (superpowers) y mapa de memoria, reglas por
  área en `.claude/rules/` con las lecciones reales, hook `SessionStart` (`.claude/hooks/session-context.mjs`),
  skills `cerrar-sesion` y `aprender`, y plugins del proyecto (superpowers, claude-md-management, context7 y expo).
  Falta confirmar en la PC con `/context` y `/plugin`.
- **Partes 5-6 (nube, 2026-10-30), sin probar en teléfono:**
  - Reglas de XP, nivel, racha y misiones iguales en `src/gamification` y en SQL.
  - Migraciones 0001-0009 **aplicadas en `kynet-dev`**, con prueba de `sync_session` en la base real (115 XP,
    reintento idempotente; transacción revertida).
  - `delete-account` desplegada.
  - App: almacén SQLite (`kynet.db`), onboarding 18+, pestañas, aviso médico y XP en el resumen.
  - Login con Google (`signInWithIdToken`), importación de sesiones locales, cola de subida (al terminar, al abrir y
    cada 15 min), exportar y borrar cuenta.
  - **Falta:**
    - Recompilar el dev client (módulos nativos nuevos).
- **Marca KYNET (2026-10-29):** app renombrada por completo (`com.kynet.app`, esquema `kynet`,
  `modules/kynet-native`) con los colores y tipografías del manual (`docs/marca/kynet.md`). La navegación y el
  alcance siguen las specs.
- **Tubería de pose:** MediaPipe lite en modo `LIVE_STREAM`, resultados entregados en orden desde una cola,
  delegado elegido por teléfono midiendo CPU y GPU (S26 Ultra → CPU, Pixel 7 Pro → GPU), cámara a 30 FPS.
- **Parte 1, prueba final de 10 min (`34b8fb5`):**
  - **Pixel 7 Pro: cumple** (30 FPS, ~0,3 % de descartes, térmica LIGHT estable, memoria estable).
  - **S26 Ultra: no cumple** los descartes (~10,5 %): desde ~5 min la inferencia en CPU tarda el doble sin que
    Android reporte térmica. Pendiente: 10 min del S26 con GPU forzada.
- **Prueba de humo de la parte 3 en el Pixel (sin persona):** lista de ejercicios, colocación de los tres
  ejercicios, entrenamiento (pausa, seguir, terminar) y resumen funcionan sin errores de JS. Encontrados y
  corregidos:
  - `69992f6`: el motor no se creaba en el teléfono (worklets que usaban funciones declaradas más abajo:
    `createEngine → resolveConfig`, `fsmStep → finishCompleted`) y el esqueleto fallaba
    (`BLAZEPOSE_BONES` como valor por defecto). Test nuevo `tests/lint/workletOrder.test.ts`.
  - `c205b17`: fuga de ~80 MB por visita a una pantalla con cámara (MediaPipe sin `dispose()`); ahora estable.
- **No verificado:** conteo real de repeticiones en el teléfono, voz y vibración, prueba de 15 min de la parte 3
  (necesitan una persona).
- **Builds:** se compila en local (EAS gratuito no termina en 45 min). Metro con `NODE_OPTIONS=--max-old-space-size=4096`.
- **Coordinación:** buzón en la rama `coordinacion`.

## Mediciones
[`docs/spike-results.md`](spike-results.md)

## Decisiones tomadas
| Qué | Por qué | Coste si es errónea |
|---|---|---|
| `LIVE_STREAM` + cola de resultados | En síncrono la cámara esperaba a la inferencia; con "solo el último" se perdía el 17-19 % de las poses | Medio: latencia de ~1 cuadro más |
| Delegado por teléfono, medido al arrancar | El más rápido depende del chip | Bajo; el S26 elige CPU en frío y se degrada con carga sostenida |
| `v = min(visibility, presence)` | MediaPipe inventa puntos fuera de cuadro con visibility alta | Bajo |
| Sin orejas ni puntos de mano en el overlay; modelo lite | Pose no rastrea dedos; full no cabe en 30 FPS (decisiones del usuario) | Bajo |
| Helpers y constantes **antes** del worklet que los usa | El plugin captura el cierre al definir la función | Ninguno; lo vigila un test |
| `dispose()` del landmarker al desmontar | El recolector de JS no ve la memoria nativa y de GPU | Ninguno |

## Para decidir (usuario)
- **Diseño en Stitch:** la clave ya está guardada en la PC (`STITCH_API_KEY`); falta conectar el MCP y la orden de
  diseñar. Faltan el icono y el wordmark definitivos.
- S26 Ultra: ¿probar GPU con carga sostenida y, si aguanta, re-evaluar el delegado durante el uso?

## Siguiente paso
0. **En paralelo (decisión del usuario, 2026-10-30):**
   - **Reparto (decisión del usuario, 2026-10-31):** el usuario diseña con Codex por su cuenta y entrega assets;
     **Claude Code (PC) lo implementa todo**.
   - **Guías y pantallas v2:** plan `docs/superpowers/plans/2026-10-31-diseno-v2-guias.md`, H1 → H6 y después H7.
     - H1: los 3 GIF desde Descargas.
     - H2: manifiesto y preferencias.
     - H3: "Así se hace" la primera vez.
     - H4: ayuda tras 3 correcciones, con pausa.
     - H5: ajuste en Perfil.
     - H6: bienvenida "Empezar" y "Ya tengo cuenta".
     - H7: resto de pantallas y HUD.
     - **Los 3 GIF entregados** por el usuario (Descargas). La PC ejecuta H1 → H7 en **modo continuo** (sin esperar
       revisión entre tareas; informa por bloque).
     - G0 hecho (`cc934bb`). G1 Lottie (`560cd95`) sin usar.
   - **Vista de frente: en pausa por el usuario.** Con `abortHoldMs`, σ 0,008 da 488/540 (mínimo 8). Al reanudar,
     F2.2c (guardia de sujeto con mediana) y el resto de la ruta rápida.
   - Decisiones de diseño ya tomadas: títulos de nivel solo visuales, Progreso combinado y detalle de sesión simple.
Plan `docs/superpowers/plans/2026-10-30-cierre-mvp.md`:
1. **Bloque A terminado y revisado en la nube** (366 tests, typecheck, lint e i18n):
   - A1 `SQ_HEELS_LIFT` (`a4d1e54`): ventana de ±150 ms; 0/160 falsos con cualquier σ; detección con subida del
     3 %: 154/160 con σ 0,006 y 144/160 con σ 0,008, provisional hasta B3;
   - A2 descarga de sesiones (`b5f75bb`).
2. **Con el usuario frente al teléfono:**
   - B2: modo avión;
   - B4: 15 min entrenando;
   - B3: precisión con persona, incluidas las series de talones;
   - B1: hecho, salvo borrar la cuenta;
   - B5: S26 con GPU.

## Pendiente que requiere la PC o un teléfono
- Pruebas con persona: S26 con GPU, conteo real de los tres ejercicios, voz y vibración, 15 min de la parte 3.

## Pendiente que puede hacer la sesión remota
- Revisar lo que entregue la PC del plan de cierre y actualizar los criterios cumplidos en `docs/requirements.md`.
