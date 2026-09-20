const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = __dirname;
const app = fs.readFileSync(path.join(root, "actividad-app.js"), "utf8");
const firebase = fs.readFileSync(path.join(root, "actividad-firebase.js"), "utf8");
const rules = fs.readFileSync(path.join(root, "reglas.txt"), "utf8");
const css = fs.readFileSync(path.join(root, "mejoras-seguimiento.css"), "utf8");

const functionMatch = app.match(/function calcularNotaRubrica\(rubrica = \{\}\) \{[\s\S]*?\n      \}/);
assert(functionMatch, "Falta la función de cálculo de la rúbrica.");
const context = {};
vm.createContext(context);
vm.runInContext(`${functionMatch[0]}; this.calcularNotaRubrica = calcularNotaRubrica;`, context);

assert.strictEqual(context.calcularNotaRubrica({
  criterios: [
    { puntajeMaximo: 4, puntajeObtenido: 3 },
    { puntajeMaximo: 6, puntajeObtenido: 3 }
  ]
}), 6, "La nota proporcional de la rúbrica es incorrecta.");
assert.strictEqual(context.calcularNotaRubrica({ criterios: [] }), null, "Un desafío sin rúbrica debe conservar el cálculo anterior.");
assert.strictEqual(context.calcularNotaRubrica({
  criterios: [{ puntajeMaximo: 4, puntajeObtenido: 10 }]
}), 10, "El puntaje obtenido debe limitarse al máximo.");
assert.strictEqual(context.calcularNotaRubrica({
  criterios: [{ puntajeMaximo: "", puntajeObtenido: "" }]
}), null, "Los datos incompletos no deben producir una nota inválida.");

const checks = [
  [
    "nota automática combinada con respaldo verificado por servidor",
    app.includes("d?.resultadosVerificados?.[sectionId] || {}") &&
      app.includes("verificadaServidor === true") &&
      app.includes("obtenerNotaAutomaticaModulo") &&
      app.includes("resultado?.notaFinal ?? resultado?.notaIA")
  ],
  [
    "null no se muestra como nota",
    app.includes("notaAutomatica !== null ? `${notaAutomatica}/10` : 'Pendiente'") &&
      app.includes("notaAutomatica === null) ? 'pendientes' : ''")
  ],
  ["compatibilidad con nota docente anterior", app.includes("ajuste?.notaDocente ?? ajuste?.notaFinalCalculada ?? ajuste?.nota")],
  ["rúbrica configurable por desafío", app.includes("criteriosRubrica-") && app.includes("agregarCriterioRubrica")],
  ["comentarios y evidencia por criterio", app.includes("comentarioDocente") && app.includes("evidenciaAsociada")],
  ["plantillas reutilizables", app.includes("rubricaPlantillaDesafio") && app.includes("Aplicar plantilla")],
  ["historial de rúbrica e intento", firebase.includes("rubricaAnterior") && firebase.includes("rubricaNueva") && firebase.includes("intento:")],
  ["registro de autor y fecha", firebase.includes("modificadaPorUid") && firebase.includes("fechaCorreccion: serverTimestamp()")],
  ["cálculo validado en Firebase", firebase.includes("obtenidoRubrica * 10 / maximoRubrica")],
  ["vista resumida del estudiante", app.includes("<b>Rúbrica:</b>")],
  ["vista detallada docente", app.includes("teacher-rubric-editor") && css.includes(".teacher-rubric-row")],
  ["estudiante no puede modificar notas docentes", !/studentMutableFields\(\)[\s\S]*?'notasDesafiosDocente'/.test(rules.split("function teacherMutableStudentFields")[0])],
  ["historial inmutable", /match \/estudiantes\/\{uid\}\/historialNotasDesafios\/\{eventoId\}[\s\S]*?allow update: if false;/.test(rules)]
];

const failed = checks.filter(([, ok]) => !ok);
checks.forEach(([name, ok]) => console.log(`${ok ? "OK" : "FAIL"}: ${name}`));
assert.deepStrictEqual(failed, [], `Fallaron ${failed.length} controles de rúbricas.`);
console.log("Contrato de rúbricas e historial pedagógico verificado.");
