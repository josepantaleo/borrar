"use strict";

const fs = require("node:fs");
const assert = require("node:assert/strict");

const firebaseClient = fs.readFileSync("actividad-firebase.js", "utf8");
const appClient = fs.readFileSync("actividad-app.js", "utf8");
const backend = fs.readFileSync("index.js", "utf8");
const evaluator = fs.readFileSync("evaluator.js", "utf8");
const rules = fs.readFileSync("reglas.txt", "utf8");
const firebaseConfig = JSON.parse(fs.readFileSync("firebase.json", "utf8"));

assert.equal(firebaseConfig.functions?.source, ".", "Firebase debe desplegar el backend desde la raiz.");
assert.match(backend, /enforceAppCheck:\s*true/, "Las callables deben exigir App Check.");
assert.match(backend, /consumeAppCheckToken:\s*true/, "Las callables deben protegerse contra repetición.");
assert.match(backend, /email_verified/, "El backend debe exigir correo verificado.");
assert.match(backend, /runTransaction/, "Las cuotas deben reservarse mediante transacciones.");
assert.match(backend, /backendUsage/, "Las cuotas deben persistirse fuera del documento editable del alumno.");
assert.match(backend, /resultadosVerificados/, "La evaluación debe persistir un resultado protegido.");
assert.match(evaluator, /acorn\.parse/, "El servidor debe analizar sintaxis sin ejecutar código no confiable.");
assert.doesNotMatch(evaluator, /\beval\s*\(|new\s+Function\s*\(|\bvm\./, "El evaluador no debe ejecutar código del alumno.");
assert.match(rules, /match \/backendUsage\/\{uid\}\/\{document=\*\*\}/, "Las cuotas deben estar bloqueadas al cliente.");
assert.match(rules, /match \/estudiantes\/\{uid\}\/evaluacionesServidor\/\{sectionId\}/, "Las evaluaciones verificadas deben tener reglas explícitas.");
assert.match(rules, /allow create, update, delete: if false;/, "La evidencia server-side debe ser inmutable para el cliente.");
assert.match(firebaseClient, /borrarConsultasIAEstudiantesFirebase/, "El panel docente debe exponer el borrado de consultas IA.");
assert.match(firebaseClient, /chatIABorradoId/, "El borrado docente debe notificar a la sesion del estudiante.");
assert.match(rules, /validTeacherChatDeleteUpdate/, "Las reglas deben validar el borrado docente de consultas IA.");
assert.match(rules, /request\.resource\.data\.chatIA\s*==\s*\{\}/, "El docente solo debe poder vaciar chatIA, no editarlo libremente.");
assert.match(rules, /request\.resource\.data\.chatIABorradoEn\s*==\s*request\.time/, "El borrado docente debe registrar timestamp del servidor.");
assert.doesNotMatch(firebaseClient, /getGenerativeModel|GoogleAIBackend/, "La IA no debe invocarse directamente desde el navegador.");
assert.match(firebaseClient, /httpsCallable/, "El cliente debe usar funciones callable autenticadas.");
assert.match(firebaseClient, /limitedUseAppCheckTokens:\s*true/, "El cliente debe solicitar tokens App Check de uso limitado.");
assert.match(appClient, /evaluarCodigoServidorFirebase/, "La entrega debe usar la evaluación del servidor.");

console.log("Contrato de backend seguro: OK");
