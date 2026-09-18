const fs = require("node:fs");
const path = require("node:path");

const root = __dirname;
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const app = read("actividad-app.js");
const firebase = read("actividad-firebase.js");
const network = read("actividad-network-status.js");
const html = read("actividad.html");

const checks = [
  ["estado Guardado local", html.includes("Guardado local")],
  ["estado y hora de ultima sincronizacion", html.includes("firebaseLastSync") && app.includes("ultimaSincronizacion")],
  ["cola local de cambios pendientes", app.includes("SYNC_QUEUE_KEY") && app.includes("respaldarPaqueteLocal")],
  ["la cola se elimina solo tras confirmacion", app.includes("confirmarSincronizacionLocal") && app.includes("localStorage.removeItem(storageKey(SYNC_QUEUE_KEY))")],
  ["reintento al recuperar conexion", network.includes("app-network-online") && app.includes("programarReintentoSincronizacion")],
  ["proteccion transaccional contra versiones antiguas", firebase.includes("runTransaction") && firebase.includes("sync-conflict") && firebase.includes("versionRemota > versionLocal")],
  ["recuperacion de copia local mas nueva", app.includes("versionLocal > versionRemota") && app.includes("Cambios locales recuperados")],
  ["aviso al cerrar con pendientes", app.includes("beforeunload") && app.includes("Hay cambios pendientes de sincronizaci")],
  ["posicion del editor", app.includes("editor_position_") && app.includes("selectionStart") && app.includes("scrollTop")],
  ["desafio activo", app.includes("active_section_v1")],
  ["listeners de sincronizacion idempotentes", app.includes("__syncLifecycleListenersInstalled")]
];

const failed = checks.filter(([, ok]) => !ok);
for (const [name, ok] of checks) {
  console.log(`${ok ? "OK" : "FAIL"}: ${name}`);
}
if (failed.length) {
  console.error(`\nFallaron ${failed.length} controles de sincronizacion.`);
  process.exit(1);
}
console.log("\nContrato de sincronizacion verificado.");
