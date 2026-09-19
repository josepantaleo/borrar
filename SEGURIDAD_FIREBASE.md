# Seguridad Firebase y Firestore

## Controles incorporados

- Las operaciones de estudiante activo requieren correo verificado.
- Un estudiante solo puede leer su propio documento y sus subcolecciones autorizadas.
- El alta inicial solo puede crear cuentas con `estadoCuenta: "pendiente"`.
- El estudiante no puede modificar `estadoCuenta`, notas docentes ni campos de rol.
- Las actualizaciones docentes del documento principal quedan limitadas a una lista explícita de campos.
- El docente debe conservar `uid` y `email` del estudiante y enviar `actualizadoEn == request.time`.
- Un docente inactivo no satisface `isTeacher()`.
- Las colecciones de auditoría, historial, mensajes y actualizaciones CRDT conservan sus restricciones de inmutabilidad.
- El historial colaborativo antiguo solo puede ser eliminado por la cuenta administradora principal.
- Las rutas no declaradas quedan denegadas por la regla comodín final.
- Las consultas generativas se realizan exclusivamente mediante Cloud Functions callable.
- Las callables exigen Firebase Auth, correo verificado y Firebase App Check.
- Las cuotas se reservan en transacciones y no son legibles ni modificables por el cliente.
- Las evaluaciones verificadas se escriben con Admin SDK en campos y subcolecciones protegidos.
- El evaluador del servidor analiza el AST y no usa `eval`, `Function` ni `vm` con código del alumno.

## Pruebas agregadas

`firestore-rules.test.cjs` cubre intentos de:

- leer datos de otro estudiante;
- modificar `estadoCuenta`;
- modificar notas docentes;
- crear permisos docentes;
- acceder como docente desactivado;
- escribir con correo no verificado;
- enviar campos adicionales;
- superar límites de tamaño;
- borrar evidencia protegida;
- escribir actualizaciones cooperativas como docente inactivo.

## Pendientes conocidos

- La suite completa de reglas todavía necesita una corrección independiente: el emulador alcanza el límite de 1000 expresiones en algunas validaciones antiguas y un caso de cooperación usa un payload sin `respondidoEn`.
- La seguridad efectiva depende de publicar `reglas.txt` en el proyecto Firebase correcto.
- La configuración cliente de Firebase no es un secreto; la protección depende de estas reglas, App Check, dominios autorizados y cuotas del proyecto.
- La evaluación server-side es estructural y sintáctica. No ejecuta el código no confiable; las pruebas dinámicas completas requieren un servicio aislado por proceso o contenedor.
- Vertex AI debe estar habilitado y la cuenta de servicio de las funciones debe tener `roles/aiplatform.user`.
