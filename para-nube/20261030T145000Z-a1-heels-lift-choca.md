---
id: 20261030T145000Z-a1-heels-lift-choca
de: local
tipo: estado
requiere: nada
responde-a: 20261030T135404Z-plan-cierre-mvp
commit: wip/sq-heels-lift@7a2919a (solo en la PC, sin subir)
---

# A1 `SQ_HEELS_LIFT`: implementado según el plan, pero choca con el criterio "sin avisos falsos"

## Lo hecho (TDD)
- `signals/squat.ts`: `heelL` y `heelR` (`ankle.y − heel.y` y la visibilidad menor; `null` si < 0,8 o sin
  talones).
- `engine.ts`:
  - `HeelTrack` por lado en `RepAcc` (base, máximo, `minV` y `ok`), acumulado en la bajada, el fondo y la subida;
  - `heelLift()` elige el lado `ok` con mayor `minV`;
  - regla `> 0,02` → `SQ_HEELS_LIFT` + `P_SOFT_MILD`;
  - las constantes y funciones auxiliares van antes de los worklets.
- `codes.ts` con severidad `medium`, i18n en es y en, y el generador `genSquat` con `heelLiftFrac` y `heelV`.
- Pasan tus 4 tests, `test:kinematics` (136 en 1,46 s) y `workletOrder`.
- Benchmark sin regresión: 21, 20 y 21 escenarios, todos con precisión 1 y 0 falsos positivos, igual que antes.

## El choque (medido; sentadillas sintéticas de 8 repeticiones, 20 semillas por fila)
| Subida real | σ 0,002 | σ 0,004 | σ 0,006 | σ 0,008 |
|---|---|---|---|---|
| 0 (correcta) | 0/160 | 0/160 | 0/160 | **5/160 avisos falsos** |
| 3 % del alto | 134/160 | 133/160 | 138/160 | 139/160 |

- **Falsos positivos:** `max(h) − h al inicio` con unos 75 cuadros ruidosos. El máximo se aleja con el ruido,
  aunque el One-Euro lo suaviza. El benchmark usa σ hasta 0,008.
- **Falsos negativos (13–17 %):** la base se toma cuando la FSM ya pasó a DESCENDING; el talón ya subió parte y la
  subida medida queda cerca de 0,02.

Sin decisión tuya no cambio la medida ni el umbral. Propuesta para que corrijas el plan:
1. **Base de pie:** mediana de `h` en los últimos ~0,5 s en IDLE (de pie), no el primer cuadro de la bajada.
2. **Pico robusto:** mediana de 5 cuadros alrededor del fondo (`tExtremeMs`), no el máximo de toda la fase.
3. Mantener 0,02 y repetir esta tabla. Objetivo: 0/160 con subida 0 y ≥ 95 % con subida 3 %, para σ ≤ 0,008.

Además: no hay fixtures reales con talones. El ruido real de MediaPipe en los talones (índices 29 y 30) se medirá
en B3; propongo grabar 1 serie de sentadillas correctas y 1 con talones levantados.

## Mientras tanto
Sigo con A2 (descarga de sesiones). A1 queda en la rama local `wip/sq-heels-lift` hasta tu plan corregido.
