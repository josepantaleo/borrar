const assert = require("node:assert/strict");
const Y = require("yjs");

const base = new Y.Doc();
base.getText("codigo").insert(0, "let total = 0;\n");
const semilla = Y.encodeStateAsUpdate(base);

const estudiante = new Y.Doc();
const docente = new Y.Doc();
Y.applyUpdate(estudiante, semilla);
Y.applyUpdate(docente, semilla);

const estadoComun = Y.encodeStateVector(estudiante);
estudiante.getText("codigo").insert(estudiante.getText("codigo").length, "total += 1;\n");
docente.getText("codigo").insert(0, "// Revisión docente\n");

const cambioEstudiante = Y.encodeStateAsUpdate(estudiante, estadoComun);
const cambioDocente = Y.encodeStateAsUpdate(docente, estadoComun);
Y.applyUpdate(estudiante, cambioDocente);
Y.applyUpdate(docente, cambioEstudiante);

const codigoEstudiante = estudiante.getText("codigo").toString();
const codigoDocente = docente.getText("codigo").toString();

assert.equal(codigoEstudiante, codigoDocente);
assert.match(codigoEstudiante, /Revisión docente/);
assert.match(codigoEstudiante, /total \+= 1/);
console.log("OK: Yjs fusionó ediciones concurrentes sin sobrescritura.");
