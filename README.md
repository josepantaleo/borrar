# Actividad interactiva IPEM 146

Carpeta preparada para publicarse con GitHub Pages.

## Estructura principal

- `index.html`: portada pública.
- `style.css`: estilos de la portada.
- `app.js`: comportamiento de la portada.
- `actividad.html`: marcado de la actividad interactiva.
- `actividad-base.css`: estilos base de la actividad.
- `actividad-firebase.js`: autenticación, Firestore, IA, Yjs y configuración de CodeMirror.
- `index.js`, `evaluator.js`, `challenges.js`: backend autenticado para evaluación server-side, tutor IA y cuotas.
- `evaluator.test.js`: pruebas unitarias del evaluador backend.
- `actividad-app.js`: actividades, evaluación y lógica principal.
- `actividad-cooperacion.js`: cooperación y llamadas Jitsi.
- `mejoras-seguimiento.css`: panel docente, seguimiento y adaptación móvil.
- `mejoras-seguimiento.js`: panel docente, seguimiento, mensajería y editor colaborativo.
- `codemirror-bundle.js`: dependencias compiladas del editor.

El orden de carga declarado en `actividad.html` debe conservarse.

### Tutor de programación

El tutor local guiado permanece activo como respaldo. Las consultas generativas pasan
por la callable `consultarTutorSeguro`, que exige Firebase Auth, correo verificado,
App Check, una cuenta estudiantil activa y una clase iniciada. La cuota se reserva con
una transacción server-side por estudiante, clase y desafío.

La entrega final de código usa `evaluarEntregaSegura`. El backend analiza el AST sin
ejecutar código no confiable y guarda el resultado en `resultadosVerificados`, un campo
que las reglas no permiten modificar desde el navegador. Las previsualizaciones locales
siguen siendo orientativas; la nota definitiva requiere confirmación docente.

La configuración y el despliegue están documentados en `BACKEND_SEGURO.md`.

## Publicación en GitHub Pages

1. Subir todos los archivos de esta carpeta a la raíz del repositorio.
2. En GitHub, abrir `Settings > Pages`.
3. En `Build and deployment`, seleccionar `Deploy from a branch`.
4. Seleccionar la rama `main` y la carpeta `/ (root)`.
5. Guardar y esperar a que GitHub muestre la dirección publicada.
6. Publicar las reglas de `reglas.txt` por separado en Firebase Firestore.
7. Desplegar el backend de la raíz y habilitar Vertex AI según `BACKEND_SEGURO.md`.
8. Agregar el dominio de GitHub Pages a los dominios autorizados de Firebase Authentication.

`index.html` es la página de entrada y enlaza con `actividad.html`.

### Archivos que no deben publicarse

El `.gitignore` excluye:

- copias `.bak`;
- registros de Firebase;
- archivos `.env` y claves privadas;
- paquetes ZIP generados;
- perfiles y capturas locales de validación;
- borradores HTML antiguos que no utiliza `index.html`.

La configuración web `apiKey` de Firebase se ejecuta en el navegador y no reemplaza las reglas de seguridad. Debe restringirse al proyecto y a los dominios autorizados desde Google Cloud y Firebase.

## Subida inicial con Git

```powershell
git init
git add .
git commit -m "Modulariza actividad y mejora experiencia móvil"
git branch -M main
git remote add origin https://github.com/USUARIO/REPOSITORIO.git
git push -u origin main
```

Si el repositorio remoto ya contiene archivos, clonarlo primero o agregar el remoto y revisar su historial antes de realizar el primer `push`.

## Actualización del 14 de septiembre de 2026

- Versión de publicación: `20260914-9`.
- El desbloqueo desde “Ver progreso y evaluación” ahora actualiza Firebase y sincroniza en tiempo real la habilitación del editor del estudiante.
- Cada desafío finalizado muestra “Desbloquear para volver a resolver”.
- El Tutor de programación se abre como popup de pantalla completa, sin reducir el editor ni reservar una columna lateral.
- El popup conserva las pistas, consultas IA, casos de prueba, historial y controles de ayuda.
- El Tutor de programación se abre como un popup de pantalla completa sin reducir el editor.
- Puede cerrarse con su botón, haciendo clic en el fondo o presionando `Escape`.
- La actividad usa todo el ancho disponible y el tutor cerrado ya no reserva una columna vacía.
- `Mi resumen de pestañas` se abre desde un botón compacto y muestra estado, límite, tiempo fuera y actividad reciente.
- El popup puede cerrarse con su botón, haciendo clic fuera o presionando `Escape`.
- Se ampliÃ³ el espacio de tareas a todo el ancho disponible y el tutor de programaciÃ³n ahora se abre desde un botÃ³n popup.
- Se agregÃ³ el selector docente para desbloquear actividades especÃ­ficas y el popup `Mi resumen de pestaÃ±as`, un grÃ¡fico de calificaciones y desbloqueo docente remoto de una o todas las actividades.
- Las acciones docentes muestran una explicaciÃ³n breve antes de abrirse:
  - ProgramaciÃ³n y comentarios: publica consignas, fechas y devoluciones.
  - Copiar y pegar: consulta los intentos de copiar, cortar o pegar registrados.
- Se mantienen visibles Ãºnicamente las acciones disponibles para el estado actual del estudiante.

- El acceso a “Mi progreso y calificaciones” se presenta como un botón popup para no ocupar espacio permanente en la actividad.
- El popup reúne avance, calificaciones por desafío, recomendaciones y descarga PDF.

- `actividad.html` fue separado en módulos HTML, CSS y JavaScript.
- Se mantuvo el orden de ejecución y la compatibilidad con las funciones globales existentes.
- Se mejoró la navegación móvil del panel docente.
- El modo cooperación incorpora accesos directos a Código, Chat e Historial.
- Los modales responden a la altura real del navegador y al teclado virtual.
- Se añadieron áreas táctiles accesibles y soporte para zonas seguras.
- Los tres scripts clásicos fueron validados sintácticamente en Chromium.

## Base incorporada el 4 de septiembre de 2026

- Editor cooperativo CodeMirror con cursor visible.
- Aportes del estudiante en verde y del docente en amarillo.
- Estado visible `En curso` durante la cooperacion.
- Chat cooperativo integrado al editor.
- Popup emergente con contador de pendientes, visible hasta que el estudiante confirme cada mensaje.
- Aviso de cuota Firebase compacto y descartable, sin bloquear la pantalla.
- Confirmaciones docentes visibles sobre el editor cooperativo, incluso en pantalla completa.
- Colaboracion optimizada: una sola sesion activa por estudiante, presencia agrupada y consultas recientes limitadas.

## Cooperacion docente-estudiante revisada (7 de septiembre de 2026)

- La edicion compartida requiere una solicitud docente con objetivo pedagogico y una aceptacion explicita del estudiante.
- La solicitud aparece en un panel global aunque el estudiante este mirando otra actividad; al autorizar puede abrirse el desafio solicitado.
- El estudiante puede rechazar la solicitud o retirar su consentimiento y continuar trabajando individualmente.
- La pausa cooperativa bloquea nuevas contribuciones de ambos participantes tanto en la interfaz como en las reglas de Firestore.
- Al reanudar la cooperacion se reintentan automaticamente las ediciones que hayan quedado pendientes durante la pausa.
- Cerrar el panel docente solo desconecta esa sesion; finalizar la cooperacion es una accion explicita.
- Los mensajes y aportes se conservan como evidencia. Las reglas no permiten eliminarlos desde el cliente.
- Los estados de mensajeria distinguen entre enviado, entregado y leido. La lectura solo se registra cuando la conversacion esta visible y la ventana tiene foco.
- El boton `Entendido` registra la lectura del mensaje docente y el estudiante puede responder desde el chat aunque la edicion cooperativa no este activa.
- El historial de aportes incluye nombre, correo, rol, lineas, texto agregado o eliminado y referencia de reversion.
- La actualizacion CRDT y su historial se confirman en una misma escritura; si falla, la cola queda respaldada localmente y la sesion no se destruye.
- El estudiante mantiene una unica sesion CRDT para la actividad visible, reduciendo presencia y listeners innecesarios.
- La presencia y los cursores solo se publican y consultan despues de que el estudiante acepta la cooperacion.

## Publicacion obligatoria de Firestore

El funcionamiento del boton de autorizacion, la pausa, los estados de lectura y la presencia requiere publicar la version incluida de `reglas.txt`. Subir solamente los archivos a GitHub Pages no actualiza las reglas de Firestore.

```powershell
npx firebase-tools deploy --only firestore:rules --project ipem146js
```

El backend seguro también debe desplegarse; GitHub Pages solo publica el cliente:

```powershell
npx firebase-tools deploy --only functions --project ipem146js
```

## Verificacion

```powershell
npm.cmd ci
npm.cmd run test:crdt
npm.cmd run test:cooperation
npm.cmd run test:rules
```

La prueba de reglas requiere Java 11 o superior porque Firebase Emulator Suite ya no admite Java 8.
El 7 de septiembre de 2026 la suite completa fue ejecutada correctamente con Eclipse Temurin JDK 17.0.20.1.
