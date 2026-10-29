# Grabaciones reales de landmarks (solo desarrollo)

En la build de desarrollo, la pantalla de entrenamiento tiene el botón "Grabar landmarks". Al detenerlo se guarda
`fixture-<ejercicio>-<marca>.json` en los documentos de la app (solo puntos del cuerpo, nunca imagen). No se sube a ningún servidor.

Para sacarlo al PC con el cable USB (build de desarrollo, paquete `com.fitpose.app.dev`):

```bash
adb shell run-as com.fitpose.app.dev ls files
adb exec-out run-as com.fitpose.app.dev cat files/fixture-squat-1700000000000.json > fixture-squat-1.json
```

Después abre el JSON, cambia `labels.realReps` (viene en -1) por las repeticiones contadas a mano y guárdalo en
`src/kinematics/fixtures/real/`. Formato: spec-cinematica §8.
