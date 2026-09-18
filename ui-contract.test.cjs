const fs = require("fs");
const assert = require("assert");

const html = fs.readFileSync("actividad.html", "utf8");
const firebase = fs.readFileSync("actividad-firebase.js", "utf8");
const requiredIds = [
  "firebaseAuthOverlay",
  "panelProfesorModal",
  "filtroPortapapelesProfesor",
  "ordenProfesor",
];
for (const id of requiredIds) {
  assert(html.includes(`id="${id}"`), `Falta el control crítico #${id}`);
}

for (const archivo of [
  "actividad-app.js",
  "actividad-firebase.js",
  "actividad-pdf-loader.js",
  "actividad-utils.js",
  "actividad-network-status.js",
  "codemirror-bundle.js",
  "panel-profesor.js",
  "actividad-cooperacion.js",
  "mejoras-seguimiento.js"
]) {
  assert(fs.existsSync(archivo), `Falta el script ${archivo}`);
}

assert(/actividad-firebase\.js\?v=\d{8}-\d+/.test(html), "Falta versión de actividad-firebase.js");
assert(/mensajeRecibidoToast/.test(firebase), "Falta la alerta unificada de mensajes");
assert(/auditoriaPortapapeles/.test(firebase), "Falta la subcolección de auditoría");
console.log("Contrato de interfaz: OK");
