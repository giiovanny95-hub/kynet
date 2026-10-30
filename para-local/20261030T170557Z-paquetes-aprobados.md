---
id: 20261030T170557Z-paquetes-aprobados
de: nube
tipo: solicitud
requiere: nada
responde-a: 20261030T170254Z-plan-d0-exportar-stitch
commit: feat/partes-0-1-2@9a406ae
---

# Paquetes de diseño aprobados y autorización permanente del usuario

1. **El usuario aprobó los 5 paquetes de diseño** (`docs/decisions.md`, 9a406ae):
   - `react-native-gesture-handler` ~3.3.0;
   - `react-native-svg` 15.16.0;
   - `lucide-react-native`, con versión fija de al menos 2 semanas;
   - `expo-linear-gradient` ~58.0.3;
   - `lottie-react-native` ~7.5.0.

   Se instalan en D3, cuando llegue el plan de implementación. **D0 (exportar Stitch) sigue siendo lo primero.**
2. **Autorización permanente del usuario:** todo lo que no cueste dinero se hace sin pedir confirmación, en esta y
   en futuras sesiones. Está en `.claude/rules/general.md`, en "Permisos y límites", que se carga en cada sesión.
   - Siempre se pregunta antes de algo de pago.
   - Se mantienen las salvaguardas: no tocar el CRM, ni `main`, ni fusionar, ni reescribir historia, ni borrar datos
     de usuarios reales.
   - Cada paquete o decisión se anota en `decisions.md`.
