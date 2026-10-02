# Auditoría y corrección — Modo Cooperación V2

## Correcciones aplicadas

### 1. Seguridad de respuesta del estudiante
Se agregó una condición de Firestore para que un estudiante solamente pueda aceptar o rechazar una solicitud cuando `solicitanteRol == 'docente'`.

Esto evita que el estudiante pueda cambiar directamente una solicitud propia desde el cliente manipulando Firestore.

### 2. Intervención docente directa
Se separó la lógica de:

- **Cooperación con consentimiento:** requiere aceptación del estudiante cuando la solicitud fue iniciada por el docente.
- **Intervención docente directa:** un docente autorizado puede abrir y editar el documento del estudiante desde el Panel Profesor sin depender del estado de consentimiento.

Las reglas de Firestore permiten al docente autorizado:

- escribir actualizaciones Yjs;
- publicar presencia;
- utilizar el chat colaborativo;
- actualizar los campos de auditoría del documento colaborativo.

El acceso continúa limitado por `isTeacher()` y por el UID del estudiante objetivo.

### 3. Identidad de la solicitud
Se incorporó `solicitanteRol` a la metadata de `colaboracionCodigo` y se validan los valores permitidos.

### 4. Solicitudes de colaboración
`solicitudesColaboracion/{uid}_{sectionId}` ahora admite solicitudes originadas por:

- estudiante → docente;
- docente → estudiante.

El estudiante solamente puede leer y responder una solicitud cuyo `uid` sea el suyo y cuyo `solicitanteRol` sea `docente`.

### 5. Finalización
Se agregó soporte para `finalizadaEn` y transición:

`pendiente → aceptado/rechazado → finalizado`

La finalización exige timestamp de servidor y conserva los datos de respuesta.

### 6. Mensajes
El estudiante solamente puede crear mensajes cuando la cooperación está aceptada y activa.

El docente autorizado puede utilizar el chat en intervención directa.

### 7. Presencia
El docente autorizado puede publicar presencia en intervención directa.

El estudiante continúa limitado a cooperación aceptada y activa.

### 8. Tests
`firestore.rules.cooperacion.test.js` ya utiliza `firestore.rules` en lugar del archivo inexistente `REGLAS.TXT.corregidas`.

Se agregaron pruebas para:

- impedir autoaceptación/autorechazo;
- permitir respuesta estudiantil a una solicitud docente;
- permitir intervención docente directa con Yjs;
- permitir presencia docente directa;
- impedir escritura estudiantil mientras una solicitud docente permanece pendiente.

Los timestamps de escritura de las pruebas usan `serverTimestamp()` cuando las reglas exigen `request.time`.

## Flujo resultante

```text
ESTUDIANTE → SOLICITUD → DOCENTE → ACEPTAR → COOPERACIÓN ACTIVA
                                      ↓
                                   RECHAZAR

DOCENTE → SOLICITUD → ESTUDIANTE → ACEPTAR/RECHAZAR

DOCENTE AUTORIZADO → INTERVENCIÓN DIRECTA
                    → Yjs + presencia + chat
                    → no requiere consentimiento previo
```

## Nota de validación

Se verificó la sintaxis JavaScript con `node --check`.

La ejecución completa de las pruebas de reglas requiere Firebase Emulator Suite / `@firebase/rules-unit-testing`; el entorno de esta corrección no tenía un emulador Firebase disponible, por lo que no se debe interpretar esta entrega como una ejecución completa de las pruebas contra un emulador.

Antes de publicar en producción:

1. publicar `firestore.rules`;
2. ejecutar `firestore.rules.cooperacion.test.js` contra el emulador;
3. probar una cuenta estudiante y una cuenta docente autorizada;
4. probar tanto cooperación con consentimiento como intervención docente directa.
