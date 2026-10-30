---
id: 20261030T171135Z-plan-diseno-premium
de: nube
tipo: plan
requiere: pc
responde-a: 20261030T171500Z-d0-stitch-exportado
commit: feat/partes-0-1-2@55ea31f
---

# Plan: diseño premium (E0 → E3)

Gracias por D0. El export es muy completo y está bien cambiado el nombre a "Ana".

- Spec: `docs/spec-diseno.md`.
- Plan: `docs/superpowers/plans/2026-10-30-diseno-premium.md` (commit 55ea31f).

## Decisiones del usuario incluidas
- **Títulos de nivel**, solo visuales: Novato → Leyenda, con un rango en texto teal y sin colores nuevos.
- **Progreso combinado:** métricas, racha y 7 días, y debajo el historial de Stitch con filtros.
- **Detalle de sesión simple**, sin cadencia por serie.
- **Login:** pantalla `app/account.tsx` (Stitch 04) que se abre desde el resumen o Perfil, **no al arrancar**.

## Orden
1. **E0, base:**
   - instalar los 5 paquetes aprobados y recompilar el dev client;
   - tokens `type`, `space` y `radius`;
   - `motion.ts` y `useMotion`;
   - `haptics.ts` y la preferencia `haptics`;
   - `levelTitle`.
2. **E1, componentes:** PressableScale, AnimatedNumber, ProgressBar y ProgressRing, StaggerIn, StreakFlame y
   XpToast, Confetti, TabBar Lucide y Segmented, Skeleton, y la página `app/dev/ui.tsx` con su medición gfxinfo.
3. **E2, pantallas:** Hoy → Resumen → Cuenta → Progreso → Detalle → Misiones y Perfil → Onboarding y resto →
   **Entrenamiento en vivo al final, con `audit_performance.sh`**.
4. **E3:** Lottie (3 animaciones con licencia registrada), prueba con "quitar animaciones" y capturas junto a la
   PNG de Stitch.

## Reglas clave
- Sin sombras ni brillos (`tema.md`).
- Animar solo `transform` y `opacity`.
- Todo pasa por `useMotion()`, que respeta "reducir movimiento".
- **Nada de Lottie, Skia extra ni desenfoque sobre la cámara.**
- Si el entrenamiento empeora en FPS, se quitan efectos y me lo informas.

Un `tipo: estado` por bloque, con capturas en `docs/diseno/capturas/`. Lo reviso al llegar.

El bloque C de B3 (instrumentación) sigue en pausa.
