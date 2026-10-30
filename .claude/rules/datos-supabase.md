---
paths:
  - "supabase/**"
  - "src/sync/**"
  - "src/auth/**"
  - "src/data/**"
  - "src/gamification/**"
---
# Datos, Supabase y gamificación: lecciones

- **Las reglas de XP, racha y misiones existen dos veces (TS y SQL) y deben coincidir:** cualquier cambio va con vectores JSON compartidos en `src/gamification/vectors/` probados en Vitest y en `npm run test:sql`. (2026-10-30)
- **El servidor manda.** El cliente muestra una copia provisional; con la cola vacía, XP, nivel y racha vienen de `server_state`. (spec-datos-supabase §2.3)
- **Antes de migrar: `get_project` y comprueba ref `eqdjmaarjfsdfomkducz` y organización `kowimqojmwwasqvzotkl`; después, `get_advisors` (security y performance).** Los 3 avisos `SECURITY DEFINER` de `sync_session`, `get_state` y `export_my_data` son intencionales (verifican `auth.uid()`). (2026-10-30)
- **Probar una RPC en la base real sin dejar rastro:** bloque `DO $$ … raise exception 'RESULT %', … $$` que crea un usuario temporal y revierte todo; luego confirma con un `count(*)`. (2026-10-30)
- **Nunca escribir tablas desde el cliente:** todo pasa por RPC `SECURITY DEFINER` con `set search_path = ''`; RLS en todas las tablas y `revoke` por defecto a anon/authenticated. (migración 0001)
- **El almacén local se prueba sin teléfono:** `src/data/store.contract.test.ts` corre el mismo contrato contra memoria y SQLite (`node:sqlite`). Cualquier método nuevo de `LocalStore` entra en ese test. (2026-10-30)
- **La sesión de Supabase va en SecureStore troceada** (`createChunkedStorage`, límite ~2 KB por valor). (2026-10-30)
- **Nunca se mezclan cuentas:** `syncOnce` solo sube la cola del usuario con sesión iniciada; las sesiones locales sin dueño solo las hereda la primera cuenta del teléfono. (spec-datos-supabase §4.4)
- **Nivel: XP acumulado `20·(L−1)·(L+3)`;** del nivel 2 al 3 hay 140 XP, no 120 (error de cálculo en un test). (2026-10-30)
- **Día local con corte a las 03:00 de reloj de pared,** también en DST; usa `localDate` y nunca `new Date().toISOString().slice(0,10)`. (2026-10-30)
