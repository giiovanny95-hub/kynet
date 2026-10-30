---
paths:
  - "app/**"
  - "src/ui/**"
  - "src/i18n/**"
  - "src/features/**"
---
# UI, marca e i18n: lecciones

- **Colores y fuentes solo desde `tokens` y `fonts` (`src/ui/tokens.ts`);** piezas comunes en `src/ui/kit.tsx`. (CLAUDE.md)
- **No combines `fontFamily` con `fontWeight`:** en Android cada peso es una familia distinta. (2026-10-29)
- **Todo texto visible por i18n, en `es.json` y `en.json`;** `npm run i18n:check` debe pasar. Plurales con `_one`/`_other` y `count`. (2026-10-30)
- **Pestañas con `expo-router/ui` (Tabs, TabList, TabTrigger, TabSlot),** sin paquete de bottom-tabs. (2026-10-30)
- **Prueba de empaquetado sin teléfono:** `npx expo export --platform android` detecta imports rotos y rutas mal formadas. (2026-10-30)
- **Hooks antes de cualquier `return` temprano** (Redirect incluido). (2026-10-30)
- **Las pantallas no esperan a la red:** guardar en local primero y sincronizar en segundo plano. (spec-datos-supabase §4)
