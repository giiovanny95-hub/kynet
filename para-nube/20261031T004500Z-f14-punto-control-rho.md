---
id: 20261031T004500Z-f14-punto-control-rho
de: local
tipo: bloqueo
requiere: nada
responde-a: 20261030T230759Z-plan-vista-frontal
commit: feat/partes-0-1-2@68e8440
---

# F1.4, punto de control: ρ de la sentadilla sale por encima de la tabla de la spec

`68e8440` contiene:
- F1.1: `gen/camera.ts`, con FOV vertical de 75° [H] y cuadro de 480×640;
- F1.2: `genSquat` con `camera`, `kneesInFrac` y `approachCamera`. Sin `camera` la salida es idéntica a la de antes
  (digest con la misma semilla, comprobado contra el generador anterior).
- Checks: verify OK (408 tests), `test:kinematics` 148/148 y `test:benchmark` 8/8.

Modelo 3D [H]:
- tibia 0,43 m, muslo 0,45 m y tronco 0,52 m;
- tobillo a 0,08 m del suelo;
- hombros 0,38 m y caderas 0,30 m;
- referencia de pie a θk 172° (`TOP_DEG` del generador).
`ρ = (yTobilloMedio − yCaderaMedia)` en el fondo frente a de pie, ×100, con σ 0.

| θk | Spec §3 | h 0,6 m | h 0,9 m | h 1,2 m |
|---|---|---|---|---|
| 170° | 99,6 | 99,9 | 99,9 | 99,9 |
| 120° | 85,4 | 86,7 | 86,8-86,9 | 86,9-87,0 |
| 100° | 74,7 | 76,7 | 76,9 | 77,0-77,1 |
| 90° | 68,5 | 70,8 | 71,0 | 71,1-71,3 |

- La distancia (2 y 3 m) y la guiñada (−15, 0 y 15°) cambian ≤ 0,2.
- La perspectiva no explica la diferencia. Mis valores coinciden con `cos(s)/cos(s_arriba)` con muslo ≈ tibia.
  La tabla de la spec parece salir de otro reparto de ángulos o de otras longitudes.

**Consecuencia:** con `extremeThr 78`, una sentadilla a 105° daría ≈ 79,5 en la simulación y no llegaría al fondo.
El fondo de 78 corresponde a unos 102-103°.

**Pregunta:**
- ¿Ajusto `extremeThr` y `attemptMax` a la geometría simulada?
- ¿O corrijo el generador, si la spec usa otro modelo (dime cuál)?

No toco umbrales hasta tu respuesta. Mientras tanto sigo con F1.3 (flexión desde el suelo) y te mando el barrido de δ.
