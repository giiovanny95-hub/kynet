# Guías propias KYNET (G1)

`npm run lottie:build` regenera los cinco JSON, sin red ni dependencias nuevas.
Vite carga los generadores TypeScript y los tokens del checkout. Ruido cero, semilla fija,
72 cuadros de movimiento y 9 de pausa arriba: 2,7 s a 30 fps. Marcadores: arriba 0,
medio 18, fondo 36. El último cuadro visible (80) coincide con el primero.

Las coordenadas normalizadas vuelven a unidades de alto de imagen antes de obtener los
ángulos. Una escala uniforme por clip encuadra toda la trayectoria. Cada capa gira sobre
la articulación inicial; su posición y rotación son relativas a la capa padre. La escala
del grupo de forma reproduce el acortamiento por perspectiva sin escalar los hijos.
Solo se animan transformaciones. Los lados usan ice, slate claro y teal de los tokens.

`node --test scripts/lottie/buildExerciseLottie.test.mjs` comprueba además que los assets
versionados coinciden byte a byte con dos construcciones independientes. Se ejecuta en
`npm run verify` mediante `test:agents` para no modificar el verificador compartido.

En Windows, las capturas se regeneran con:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/lottie/renderExerciseLottie.ps1
```

El renderer offline lee los JSON y evalúa las claves hold, la jerarquía y las formas con
System.Drawing. Solo admite el subconjunto que genera este script; no es un reproductor
Lottie general. PNG transparentes de 360×360, sin teléfono. La compatibilidad visual y el
rendimiento del player Android siguen pendientes de la integración G2/G4m.

La flexión frontal usa `camera` y el modelo existente: `shoulderForwardM` aún no forma
parte del generador en la base G1. El punto para añadirlo está comentado en el builder.
