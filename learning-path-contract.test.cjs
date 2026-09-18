const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("actividad-app.js", "utf8");
const start = source.indexOf("// LEARNING_PATH_MODEL_START");
const end = source.indexOf("// LEARNING_PATH_MODEL_END");
assert.ok(start >= 0 && end > start, "Debe existir el bloque puro del modelo de ruta");

const block = source.slice(start, end);
const sandbox = { module: { exports: {} }, exports: {}, Map, Set, Math, Number, String, Array, Object };
vm.runInNewContext(`${block}
module.exports = { crearModeloRutaAprendizaje, filtrarRutaAprendizaje };`, sandbox);
const { crearModeloRutaAprendizaje, filtrarRutaAprendizaje } = sandbox.module.exports;

const desafios = Array.from({ length: 6 }, (_, index) => ({
  id: `sec-${index + 1}`,
  title: `${index + 1}. Desafío ${index + 1}`
}));

{
  const modelo = crearModeloRutaAprendizaje(desafios, {
    seccionActiva: "sec-3",
    finalizadas: { "sec-1": true, "sec-2": true }
  });
  assert.equal(modelo.progreso, 33, "El progreso debe usar desafíos finalizados sobre el total");
  assert.equal(modelo.unidades[0].completados, 2, "Debe calcular progreso por unidad");
}

{
  const modelo = crearModeloRutaAprendizaje(desafios, {
    seccionActiva: "sec-2",
    finalizadas: {}
  });
  const tercero = modelo.desafios.find(item => item.id === "sec-3");
  assert.equal(tercero.bloqueado, true, "Debe informar el bloqueo cuando falta el prerrequisito anterior");
  assert.deepEqual(Array.from(tercero.prerequisitos), ["sec-2"]);
}

{
  const modelo = crearModeloRutaAprendizaje(desafios, {
    seccionActiva: "sec-4",
    finalizadas: { "sec-1": true }
  });
  assert.equal(modelo.actualId, "sec-4");
  assert.equal(modelo.desafios.find(item => item.id === "sec-4").estado, "en_curso");
  assert.ok(modelo.recomendaciones.some(item => item.tipo === "anterior_incompleto"));
}

{
  const modelo = crearModeloRutaAprendizaje(desafios, {
    seccionActiva: "sec-3",
    finalizadas: { "sec-1": true },
    notasDocente: { "sec-1": { nota: 8 } }
  });
  assert.equal(filtrarRutaAprendizaje(modelo, { estado: "corregido" }).length, 1);
  assert.ok(filtrarRutaAprendizaje(modelo, { dificultad: "Intermedia" }).length > 0);
  assert.ok(filtrarRutaAprendizaje(modelo, { unidad: modelo.unidades[0].nombre }).length > 0);
  assert.ok(filtrarRutaAprendizaje(modelo, { estado: "bloqueado" }).every(item => item.bloqueado));
}

{
  const modelo = crearModeloRutaAprendizaje([{ id: "sec-1" }, null, {}], {
    historial: { "sec-1": null },
    ayudas: { "sec-1": null }
  });
  assert.equal(modelo.desafios.length, 1, "Debe ignorar desafíos inválidos sin fallar");
  assert.equal(modelo.desafios[0].titulo, "Desafío 1");
}

{
  const modelo = crearModeloRutaAprendizaje(desafios, {});
  assert.equal(modelo.progreso, 0, "Un estudiante nuevo comienza con progreso cero");
  assert.equal(modelo.actualId, "sec-1", "Debe elegir el primer desafío como actual");
  assert.equal(modelo.recomendaciones.length, 0, "No debe inventar dificultades para un estudiante nuevo");
}

{
  const modelo = crearModeloRutaAprendizaje(desafios, {
    seccionActiva: "sec-3",
    finalizadas: { "sec-1": true, "sec-2": true },
    historial: {
      "sec-1": { notaFinal: 4, analista: { conteoNiveles: { incorrecta: 2 } } }
    },
    ayudas: {
      "sec-2": { pasosVistos: 3, materialApoyoVistas: 2, verificacion: { intentos: 1 } }
    }
  });
  assert.ok(modelo.recomendaciones.some(item => item.tipo === "errores_repetidos"));
  assert.ok(modelo.recomendaciones.some(item => item.tipo === "baja_nota"));
  assert.ok(modelo.recomendaciones.some(item => item.tipo === "demasiadas_ayudas"));
}

console.log("learning-path-contract.test.cjs: OK");
