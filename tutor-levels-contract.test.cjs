const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = __dirname;
const appSource = fs.readFileSync(path.join(root, "actividad-app.js"), "utf8");
const firebaseSource = fs.readFileSync(path.join(root, "actividad-firebase.js"), "utf8");
const trackingSource = fs.readFileSync(path.join(root, "mejoras-seguimiento.js"), "utf8");
const cssSource = fs.readFileSync(path.join(root, "mejoras-seguimiento.css"), "utf8");

const policyMatch = appSource.match(
  /\/\/ TUTOR_LEVEL_POLICY_START([\s\S]*?)\/\/ TUTOR_LEVEL_POLICY_END/
);
assert.ok(policyMatch, "Debe existir un bloque aislable con la política del tutor.");

const context = {};
vm.createContext(context);
vm.runInContext(
  `${policyMatch[1]}
  globalThis.__tutorPolicy = {
    niveles: NIVELES_AYUDA_TUTOR,
    normalizar: normalizarConfiguracionTutor,
    evaluar: evaluarAccesoTutor
  };`,
  context
);

const { niveles, normalizar, evaluar } = context.__tutorPolicy;
assert.deepEqual(
  Array.from(niveles, item => item.nombre),
  [
    "Recordatorio conceptual",
    "Pregunta orientadora",
    "Identificación del error",
    "Pseudocódigo",
    "Fragmento parcial",
    "Solución comentada"
  ],
  "Deben conservarse los seis niveles pedagógicos en orden."
);

const normalizada = normalizar({
  tutorHabilitado: true,
  evaluacionFormal: true,
  nivelMaximoTutor: 4,
  limiteConsultasTutor: 2
});
assert.equal(normalizada.habilitado, true);
assert.equal(normalizada.evaluacionFormal, true);
assert.equal(normalizada.nivelMaximo, 4);
assert.equal(normalizada.limiteConsultas, 2);

assert.equal(evaluar({
  desafioExiste: false
}).codigo, "desafio-inexistente", "Debe bloquear desafíos inexistentes.");

const formalBloqueada = evaluar({
  habilitado: false,
  evaluacionFormal: true
});
assert.equal(formalBloqueada.codigo, "tutor-desactivado");
assert.match(formalBloqueada.mensaje, /evaluación formal/i);

assert.equal(evaluar({
  nivel: 5,
  nivelMaximo: 4
}).codigo, "nivel-limitado", "Debe respetar el nivel máximo docente.");

assert.equal(evaluar({
  consultasUsadas: 1,
  limiteConsultas: 2
}).permitido, true, "La consulta previa al límite debe permitirse.");
assert.equal(evaluar({
  consultasUsadas: 2,
  limiteConsultas: 2
}).codigo, "cuota-agotada", "La cuota debe bloquear nuevas consultas.");

for (let nivel = 1; nivel <= 6; nivel += 1) {
  assert.match(appSource, new RegExp(`data-ai-level="${nivel}"`));
  assert.match(appSource, new RegExp(`nivel${nivel}`));
}

assert.match(appSource, /proveedor de IA no respondió/i);
assert.match(appSource, /Tutor local activo/);
assert.match(appSource, /navigator\.onLine === false/);
assert.match(appSource, /no hay conexión\. Se utilizó el tutor local/i);
assert.match(appSource, /error-servicio/);
assert.match(appSource, /consultas disponibles/);
assert.match(appSource, /actualizarControlesTutorProgramacion\(\);/);
assert.match(appSource, /firebaseAIRealConfigurada/);

assert.match(trackingSource, /configTutorHabilitado/);
assert.match(trackingSource, /configEvaluacionFormal/);
assert.match(trackingSource, /configNivelMaximoTutor/);
assert.match(trackingSource, /configLimiteConsultasTutor/);

assert.match(cssSource, /\.student-ai-policy/);
assert.match(cssSource, /repeat\(3,minmax\(0,1fr\)\)/);

const payloadMatch = firebaseSource.match(
  /window\.consultarTutorIAFirebase[\s\S]*?const parametros = \{([\s\S]*?)\};/
);
assert.ok(payloadMatch, "Debe existir el payload seguro del tutor Firebase.");
assert.doesNotMatch(
  payloadMatch[1],
  /\b(?:uid|email|correo|nombreEstudiante|displayName|photoURL)\b/i,
  "El proveedor no debe recibir identidad personal del estudiante."
);
assert.match(payloadMatch[1], /codigo: textoSeguro\(payload\.codigo, 5000\)/);
assert.match(payloadMatch[1], /historialReciente: textoSeguro\(payload\.historialReciente, 1800\)/);

console.log("Tutor por niveles: contratos verificados correctamente.");
