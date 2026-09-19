"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeCode } = require("./evaluator");

test("rechaza secciones inexistentes", () => {
  assert.throws(() => analyzeCode("sec-999", "const x = 1;"), /unknown-section/);
});

test("limita una entrega con error sintáctico", () => {
  const result = analyzeCode("sec-5", "if (true { console.log('x'); }");
  assert.equal(result.verificadaServidor, true);
  assert.equal(result.sintaxis.valida, false);
  assert.ok(result.nota <= 3);
});

test("reconoce una solución estructural válida", () => {
  const result = analyzeCode("sec-11", `
    function generarCorreo(nombreCompleto) {
      return nombreCompleto.trim().toLowerCase().replace(/\\s+/g, ".") + "@ipem146.edu.ar";
    }
    console.log(generarCorreo("Ana Perez"));
  `);
  assert.equal(result.sintaxis.valida, true);
  assert.ok(result.nota >= 7);
  assert.ok(result.criterios.some(item => item.id === "requisitos"));
});
