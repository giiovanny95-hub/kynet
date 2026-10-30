# Estado del proyecto (traspaso entre sesiones)

## Última actualización
2026-10-30. Sesión de la **nube**: plan de vista de frente y Codex en el equipo. Último commit de la PC: `6497ca1`.

## Estado
- **Equipo (2026-10-30):** la nube planifica y revisa; **Codex** (PC) hace diseño y pantallas (`AGENTS.md`);
  **Claude Code** (PC) hace la lógica y coordina a Codex (`codex exec`, revisión y commits). Detalle en `CLAUDE.md`.
- **Vista de frente (2026-10-30):** spec `docs/spec-vista-frontal.md` y plan
  `docs/superpowers/plans/2026-10-30-vista-frontal.md`. El usuario elige Frente (por defecto) o Lado en sentadilla y
  flexión.
- **B1 casi completo (PC, `7dfa372` y `6497ca1`):**
  - login con Google en los dos teléfonos;
  - XP igual al del servidor;
  - A2 verificado;
  - falta exportar los datos, y cerrar sesión y volver a entrar sin duplicados.
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
    - Crear los clientes OAuth de Google y activar el proveedor en Supabase.
    - `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` en `.env.local`.
    - ~~Descargar sesiones de otros dispositivos~~: hecho en `b5f75bb` (PC); falta verlo en el teléfono con login.
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
   - **Codex:** plan de diseño `2026-10-30-diseno-premium.md`, desde E2.1 (E0 y E1 hechos), y después F5 de la vista
     de frente.
   - **Claude Code (PC):** termina lo que queda de B1 y después el plan de vista de frente, F0 → F4, F6 y F7. F0
     retoma la instrumentación de B3, que estaba en pausa.
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
   - B1: casi hecho (ver Estado);
   - B5: S26 con GPU.

## Pendiente que requiere la PC o un teléfono
- Pruebas con persona: S26 con GPU, conteo real de los tres ejercicios, voz y vibración, 15 min de la parte 3.

## Pendiente que puede hacer la sesión remota
- Revisar lo que entregue la PC del plan de cierre y actualizar los criterios cumplidos en `docs/requirements.md`.
