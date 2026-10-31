# Investigación: animación, transiciones y efectos para KYNET (2026-10-30)

Objetivo del usuario: una app **muy visual, dinámica y premium**, con el mockup de Stitch como punto de partida.
Restricción del usuario: código más herramientas **gratuitas**.
Restricciones de marca (`docs/marca/kynet.md`): oscura, turquesa, "nunca aspecto de videojuego" y respetar "reducir
movimiento".

## Decisión
| Capa | Herramienta | Por qué |
|---|---|---|
| Interacciones, transiciones y entradas | **Reanimated 4.7.1** (ya instalada) | Corre en el hilo de UI. Trae API de estilo CSS (`transitionProperty`, `animationName` con keyframes), animaciones de entrada y salida (`entering`, `exiting`, `layout`) y soporte de "reducir movimiento" (`useReducedMotion`, `ReduceMotion`) |
| Efectos dibujados: anillos con gradiente, partículas o confeti, brillos y desenfoque | **Skia 2.14.0** (ya instalada) | Gratuita; dibuja en GPU desde valores compartidos de Reanimated, sin pasar por JS en cada cuadro |
| Gestos: pulsar con escala y deslizar | `react-native-gesture-handler` ~3.3.0 | Gestos en el hilo de UI (versión del SDK 58) |
| Iconos (el manual pide Lucide) | `react-native-svg` 15.16.0 + `lucide-react-native` | Iconos de línea con trazo uniforme |
| Degradados estáticos | `expo-linear-gradient` ~58.0.3 | Barato; los degradados animados se hacen en Skia |
| Ilustraciones animadas: celebraciones, logros y estados vacíos | **Lottie** (`lottie-react-native` ~7.5.0) | Runtime gratuito; biblioteca enorme y gratuita en LottieFiles; se recolorea a la paleta con `colorFilters` |

### Descartados
- **Rive:** el editor es gratis, pero **exportar `.riv` para una app requiere plan de pago** (unos 9 USD al mes,
  según su blog y su documentación de precios). No cumple "herramientas gratuitas".
- **`expo-blur`:** el desenfoque nativo es caro en Android. Si hace falta, se hace con Skia y se mide.
- **Moti y otras capas sobre Reanimated:** Reanimated 4 ya trae API declarativa de estilo CSS. No hace falta otra
  dependencia.

## Licencia de las animaciones de LottieFiles
- Las animaciones gratuitas usan la **Lottie Simple License**: uso personal y **comercial gratis**, y la
  atribución no es obligatoria, aunque se recomienda.
- No se pueden revender ni redistribuir como archivos sueltos. Las modificaciones quedan bajo la misma licencia.
- Cada ficha puede tener condiciones propias: **revisar la página de cada animación**.
- Regla del proyecto: cada archivo se registra en `docs/licencias-assets.md` con URL, autor, licencia y fecha.

## Reglas de rendimiento
1. Animar solo `transform` y `opacity`; nunca `width` ni `height` en bucle. El layout se anima con `layout`
   transitions.
2. **Pantalla de entrenamiento:** la cámara y la inferencia mandan (30 FPS medidos).
   - Solo animaciones baratas (pop del contador y transición del color del borde);
   - **sin Lottie ni partículas sobre la cámara**;
   - cualquier cambio se mide con `scripts/audit_performance.sh`.
3. Pantallas sin cámara: 60 FPS en el Pixel 7 Pro durante las animaciones, medido.
4. Con "reducir movimiento" activo:
   - sin confeti ni bucles;
   - las entradas se muestran directamente en su estado final y las salidas se omiten (comportamiento de
     Reanimated).

## Fuentes
- Reanimated 4 (documentación oficial vía Context7): transiciones y animaciones CSS, animaciones de entrada y salida,
  transiciones de elemento compartido y accesibilidad. https://docs.swmansion.com/react-native-reanimated/
- Rive React Native (vía Context7): runtime y uso en Expo. https://github.com/rive-app/rive-react-native
- Precios de Rive: [nuevos precios](https://rive.app/blog/new-pricing),
  [plan de 9 USD/mes](https://rive.app/blog/rive-s-new-9-mo-plan),
  [precios en la documentación](https://rive.app/docs/account-admin/pricing) y
  [exportar para el runtime](https://rive.app/docs/editor/exporting/exporting-for-runtime).
- Licencia de LottieFiles:
  [¿uso comercial de las animaciones gratuitas?](https://help.lottiefiles.com/hc/en-us/articles/900002438343-Can-I-use-a-free-animation-on-Lottiefiles-for-commercial-business-use)
  y [conceptos básicos de licencias](https://help.lottiefiles.com/animation-licensing-basics-).
- Versiones de los paquetes: `node_modules/expo/bundledNativeModules.json` (SDK 58).
