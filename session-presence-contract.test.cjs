const assert = require("node:assert/strict");
const fs = require("node:fs");

const app = fs.readFileSync("actividad-app.js", "utf8");
const firebase = fs.readFileSync("actividad-firebase.js", "utf8");
const rules = fs.readFileSync("reglas.txt", "utf8");

const contracts = [
  [app, "const usuario = evento.detail", "El evento de autenticación debe leer detail"],
  [app, "const esNuevoRegistro = !datosFirebase", "Debe distinguir documento existente"],
  [app, "perfilFirebaseCompleto", "Debe detectar perfiles parciales"],
  [app, "diagnostico-presencia-estudiante", "Debe mostrar diagnóstico de presencia"],
  [app, "segundo_plano_prolongado", "Debe manejar segundo plano prolongado"],
  [firebase, "SESION_ESTUDIANTE_ID", "Debe identificar cada sesión"],
  [firebase, "sesionesDuplicadas", "Debe detectar sesiones simultáneas"],
  [firebase, "historialAccesos", "Debe registrar el historial de accesos"],
  [firebase, "marcarDesconexionEstudianteFirebase", "Debe registrar la desconexión explícita"],
  [firebase, "ultimaComprobacionSesiones", "Debe limitar las lecturas para detectar sesiones duplicadas"],
  [rules, "['activo', 'pendiente']", "Las cuentas pendientes deben publicar presencia limitada"],
  [rules, "validLegacyStudentRecovery", "Debe recuperar perfiles antiguos de forma limitada"],
  [rules, "match /estudiantes/{uid}/historialAccesos/{eventoId}", "Las reglas deben proteger el historial"]
];

for (const [source, pattern, message] of contracts) {
  assert.ok(source.includes(pattern), message);
}

assert.match(app, /estadoCuenta\s*\|\|\s*'pendiente'/, "Un registro antiguo incompleto debe volver a pendiente");
assert.match(firebase, /duracionSesionSegundos/, "El cierre debe guardar duración aproximada");

console.log("Contratos de inicio de sesión y presencia: OK");
