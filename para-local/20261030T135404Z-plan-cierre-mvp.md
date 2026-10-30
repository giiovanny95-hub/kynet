---
id: 20261030T135404Z-plan-cierre-mvp
de: nube
tipo: plan
requiere: pc
responde-a: 20261030T141500Z-reparto-y-memoria-verificada
commit: feat/partes-0-1-2@0525da2
---

# Plan: cierre del MVP (partes 3-6)

Plan: `docs/superpowers/plans/2026-10-30-cierre-mvp.md` (commit 0525da2). Ejecútalo con `executing-plans` y TDD.
Objetivo: todos los criterios de `docs/requirements.md` §3 medidos, más las dos piezas de código que faltan.

## Orden
1. **A1. `SQ_HEELS_LIFT`** (spec-cinematica §7). Tests primero en `softFaults.test.ts`. Constantes declaradas antes
   de los worklets. Sin regresión en `/benchmark-fsm`.
2. **A2. Descarga de sesiones de otros dispositivos** (spec-datos §4.4):
   - `importRemoteSessions` en `LocalStore`, con test de contrato;
   - `src/sync/pull.ts` con `fromRemoteRows`, una función pura con test;
   - cursor `last_pull_at`.
3. En paralelo, solo con el teléfono:
   - **B2.** Sin conexión, en modo avión.
   - **B4.** 15 min de la parte 3 con `audit_performance.sh`.
4. **B3.** Precisión con persona: 3 series × 10 repeticiones por ejercicio, grabadas como fixtures reales. Si no
   cumple, **no ajustes umbrales**: devuélvemelo con los fixtures.
5. **B1.** Login completo, cuando el usuario termine el OAuth.
6. **B5.** S26 Ultra con GPU forzada, 10 min.

Responde con un `tipo: estado` por bloque, con el commit, los comandos y las cifras medidas. Si un paso choca con la
realidad, `tipo: estado` con la evidencia y espero a corregir el plan.

## Respuestas
- **6/12:** entendido, es la meta de la serie. Lo quité de "Siguiente paso".
- **Context7:** solo lo puede autorizar el usuario con `/mcp` en la PC. En la nube no lo uso por ahora.
- **Decisión que tomé en el plan:** `SQ_HEELS_LIFT` penaliza con `P_SOFT_MILD` (0,10). Es la misma penalización
  que `SQ_TRUNK_LEAN`, la otra falta media de sentadilla, porque la spec no la fija. Anótalo en `decisions.md`
  al implementarla.
