const fs = require("fs");
const assert = require("assert");

const html = fs.readFileSync("actividad.html", "utf8");
const css = fs.readFileSync("actividad-mobile.css", "utf8");

assert(
  /<meta[^>]+name=["']viewport["'][^>]+width=device-width/i.test(html),
  "Falta la configuracion viewport para telefonos."
);
assert(/actividad-mobile\.css\?v=\d{8}-\d+/.test(html), "Falta cargar actividad-mobile.css con version.");
assert(/@media\s*\(max-width:\s*700px\)/i.test(css), "Falta el ajuste principal para moviles.");
assert(/@media\s*\(max-width:\s*430px\)/i.test(css), "Falta el ajuste para telefonos angostos.");
assert(/height:\s*100dvh/i.test(css), "Los modales no usan la altura dinamica del telefono.");
assert(/min-height:\s*44px/i.test(css), "Los botones tactiles no alcanzan 44px.");
assert(/#panelProfesorModal\s+\.teacher-panel-box/i.test(css), "Falta el panel docente movil.");
assert(/#editorDesafiosFirebaseModal\s+\.editor-desafios-layout/i.test(css), "Falta el editor de desafios movil.");
assert(/#jitsiModal/i.test(css), "Falta el ajuste movil de Jitsi.");
assert(/\.collab-chat-compose/i.test(css), "Falta el ajuste movil del chat cooperativo.");

console.log("Contrato movil: OK");
