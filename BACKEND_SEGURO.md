# Backend seguro de evaluación y tutor IA

Actualizado el 19 de septiembre de 2026.

## Arquitectura

- `consultarTutorSeguro`: callable autenticada para el tutor generativo.
- `evaluarEntregaSegura`: callable autenticada para evaluar una entrega.
- Firebase App Check obligatorio y con protección contra repetición de tokens.
- Cuotas almacenadas en `backendUsage`, sin acceso desde el navegador.
- Resultados guardados en `estudiantes/{uid}/evaluacionesServidor/{sectionId}` y
  en el mapa protegido `resultadosVerificados` del documento del estudiante.
- Vertex AI se invoca con la identidad administrada de Cloud Functions. No se
  utilizan claves de API ni secretos en los archivos web.
- El evaluador analiza el AST con Acorn. No ejecuta código presentado por estudiantes.

## Límites predeterminados

- Tutor: valor docente de `limiteConsultasTutor`, entre 1 y 50, por estudiante,
  clase y desafío.
- Tutor: límite adicional de 20 consultas diarias por desafío.
- Evaluación: 5 códigos distintos por día y desafío.
- Repetir exactamente el mismo código reutiliza el resultado y no consume otra evaluación.
- Código: máximo 12.000 caracteres.

## Preparación de Google Cloud

Ejecutar con una cuenta que pueda habilitar APIs y administrar IAM:

```powershell
gcloud services enable `
  aiplatform.googleapis.com `
  artifactregistry.googleapis.com `
  cloudbuild.googleapis.com `
  cloudfunctions.googleapis.com `
  run.googleapis.com `
  --project ipem146js

$projectNumber = gcloud projects describe ipem146js --format="value(projectNumber)"
gcloud projects add-iam-policy-binding ipem146js `
  --member="serviceAccount:$projectNumber-compute@developer.gserviceaccount.com" `
  --role="roles/aiplatform.user"
```

La cuenta de servicio efectiva debe confirmarse en Cloud Run o Cloud Functions
después del primer despliegue. Si el proyecto utiliza una cuenta personalizada,
asignar el rol a esa cuenta en lugar de la cuenta de cómputo predeterminada.

## Instalación y pruebas

```powershell
npm.cmd ci
npm.cmd run check:functions
npm.cmd run test:functions
npm.cmd run test:backend-contract
npm.cmd run validate
```

Las pruebas de reglas necesitan Java 11 o superior:

```powershell
npm.cmd run test:rules
```

## Despliegue

```powershell
npx.cmd firebase-tools@14.17.0 deploy `
  --only functions,firestore:rules `
  --project ipem146js
```

Después del despliegue:

1. Confirmar que App Check está habilitado para la aplicación web.
2. Confirmar que ambas funciones están en `southamerica-east1`.
3. Realizar una consulta con una cuenta activa y verificada.
4. Verificar que aparece un documento en `backendUsage`.
5. Entregar un código y confirmar `resultadosVerificados.{sectionId}`.
6. Intentar modificar ese campo desde el navegador y comprobar que Firestore lo rechaza.

## Variables opcionales

El modelo predeterminado es `gemini-2.5-flash`. Puede definirse `TUTOR_MODEL`
como variable de entorno de Functions para cambiarlo sin modificar el cliente.

## Limitaciones deliberadas

- El tutor local sigue disponible cuando no hay conexión o Vertex AI falla; no
  consume cuota ni costo de IA.
- Alcanzar la cuota remota no debe habilitar otra consulta generativa.
- La evaluación automática no reemplaza la revisión docente.
- Para ejecutar programas de estudiantes en servidor se necesita un servicio
  aislado con límites de CPU, memoria, red y tiempo; no debe agregarse `eval` o
  `vm` a las funciones actuales.
