const fs = require("node:fs");
const assert = require("node:assert/strict");

const firebase = fs.readFileSync("actividad-firebase.js", "utf8");
const improvements = fs.readFileSync("mejoras-seguimiento.js", "utf8");
const rules = fs.readFileSync("reglas.txt", "utf8");

function extractRuleBlock(marker) {
  const start = rules.indexOf(marker);
  assert.ok(start >= 0, `Falta ${marker}`);
  const opening = rules.indexOf("{", start + marker.length);
  let depth = 0;
  for (let index = opening; index < rules.length; index++) {
    if (rules[index] === "{") depth++;
    if (rules[index] === "}") {
      depth--;
      if (depth === 0) return rules.slice(start, index + 1);
    }
  }
  throw new Error(`Bloque incompleto para ${marker}`);
}

[
  "solicitarCooperacion",
  "establecerPausaCooperacion",
  "finalizarCooperacion",
  "onModoCooperacion"
].forEach(contract => {
  assert.ok(firebase.includes(contract), `Falta el contrato ${contract}`);
});

assert.ok(
  firebase.includes('estadoConsentimiento: "aceptado"') &&
    firebase.includes("edicionCooperativaPausada: false"),
  "El docente debe activar directamente la cooperacion"
);
assert.ok(
  !firebase.includes("solicitudCooperacionGlobalEstudiante") &&
    !firebase.includes("responderConsentimiento") &&
    !firebase.includes("retirarConsentimiento"),
  "El estudiante no debe recibir ni responder solicitudes de autorizacion"
);
assert.ok(
  firebase.includes("actualizarBloqueoEditorEstudiante(sectionId, aceptada && modo.pausada)"),
  "La pausa docente debe controlar el bloqueo del editor"
);
assert.ok(
  firebase.includes("modoCooperacionActual = normalizarModoCooperacion(estadoInicial.datos)"),
  "La sesion debe iniciar con el estado cooperativo real"
);
assert.ok(
  firebase.includes('window.addEventListener("seccion-estudiante-cambiada"'),
  "Cambiar de actividad debe iniciar su sesion cooperativa"
);
assert.ok(
  firebase.includes("const loteFirestore = writeBatch(database)") &&
    firebase.includes('notificar("synced", "Cambios sincronizados")'),
  "El CRDT debe confirmar la sincronizacion del codigo"
);
assert.ok(
  firebase.includes("cooperation_pending:") &&
    firebase.includes("persistirColaPendiente()") &&
    firebase.includes("if (!sincronizada || cola.length)"),
  "Una sesion no debe destruir cambios locales sin sincronizar"
);
assert.ok(
  firebase.includes("temporizador = setTimeout(publicarCola, 0)"),
  "Reanudar la cooperacion debe reintentar la cola pendiente"
);
assert.ok(
  firebase.includes("!document.hidden") && firebase.includes("document.hasFocus()"),
  "La lectura debe depender de que la conversacion este visible"
);
assert.ok(
  firebase.includes("marcarMensajeChatColaborativoLeidoFirebase") &&
    improvements.includes("confirmarPopupMensajeCooperativoEstudiante"),
  "Entendido debe registrar la lectura del mensaje"
);
assert.ok(
  improvements.includes('typeof enviarFirebase!=="function"') &&
    improvements.includes('rol:"estudiante"'),
  "La respuesta del estudiante debe validar y ejecutar el envio"
);
assert.ok(
  improvements.includes("finalizarCooperacionDocente"),
  "Falta la finalizacion explicita de la cooperacion"
);
assert.ok(
  !improvements.includes('id="vaciarChatColaborativoDocente"'),
  "La interfaz todavia ofrece borrado unilateral del chat"
);

[
  "match /actualizaciones/{actualizacionId}",
  "match /mensajes/{mensajeId}"
].forEach(collection => {
  const block = extractRuleBlock(collection);
  assert.ok(block.includes("allow delete: if false;"), `${collection} debe conservar sus datos`);
});

const historyBlock = extractRuleBlock("match /historialAportes/{aporteId}");
assert.ok(
  historyBlock.includes("allow create, update: if false;") &&
    historyBlock.includes("allow delete: if isPrincipalTeacherAdmin();"),
  "El historial retirado solo debe admitir limpieza administrativa"
);
assert.ok(
  firebase.includes('collectionGroup(database, "historialAportes")') &&
    !firebase.includes("Historial de cambios colaborativos") &&
    !improvements.includes("Historial de aportes"),
  "La interfaz debe permanecer retirada y la limpieza administrativa disponible"
);

console.log("OK: cooperacion directa, chat, presencia, cola y limpieza cubiertos.");
