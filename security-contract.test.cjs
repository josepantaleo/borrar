const fs = require("fs");
const assert = require("assert");

const app = fs.readFileSync("actividad-app.js", "utf8");
const firebase = fs.readFileSync("actividad-firebase.js", "utf8");

assert.match(
  app,
  /<textarea[^>]*>\$\{escapeHtml\(savedCode\)\}<\/textarea>/,
  "El código guardado debe escaparse antes de insertarse en el textarea."
);
assert.match(
  app,
  /<pre id="ai-student-code-\$\{sec\.id\}">\$\{escapeHtml\(savedCode\)\}<\/pre>/,
  "El código guardado debe escaparse en la vista previa."
);
assert.match(
  app,
  /const APIs_PROHIBIDAS = \[/,
  "La ejecución aislada debe rechazar APIs externas."
);
assert.match(
  app,
  /self\.Worker = undefined;/,
  "El Worker evaluador debe impedir Workers anidados."
);
assert.match(
  app,
  /getLocalStorage\(`ai_usage_\$\{sectionId\}`\)/,
  "La cuota del tutor debe persistir fuera del historial visible."
);
assert.match(
  firebase,
  /httpsCallable\(functions,\s*"consultarTutorSeguro"/,
  "El tutor remoto debe pasar por una función callable segura."
);
assert.doesNotMatch(
  firebase,
  /getGenerativeModel|GoogleAIBackend/,
  "El navegador no debe inicializar modelos generativos directamente."
);

console.log("Contratos de seguridad del cliente: OK");
