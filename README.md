# Mateo Arena

Prototipo navegable del sistema de torneos de ajedrez descrito en `especificaciones.txt`.

## Incluye

- Vista de jugador y panel de administrador.
- Inscripción independiente del registro del administrador.
- Mesa de ajedrez con relojes, chat privado y estados de presencia.
- Clasificación oficial separada de resultados pendientes.
- Supervisión de mesas con aprobación/rechazo de resultados.
- Historial de eventos y estados en tiempo real simulados para demo.

## Integración Firebase pendiente

La UI está lista para conectar:

- Firebase Authentication con Google.
- Firestore para `tournaments`, `players`, `rounds`, `matches`, `messages` y `auditEvents`.
- Cloud Functions para movimientos transaccionales, reloj oficial, emparejamientos, aprobación de resultados y clasificación.
- Reglas de seguridad basadas en `request.auth.uid` y los UID registrados en cada mesa.

Abre `index.html` directamente en el navegador para probar el prototipo.
