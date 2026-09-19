"use strict";

const profiles = [
  ["sec-1", "Introducción a JS", ["declaración de variables", "console.log", "Date"], ["VariableDeclaration", "CallExpression"], ["console.log", "Date"]],
  ["sec-2", "Variables", ["const", "let", "operaciones aritméticas"], ["VariableDeclaration", "BinaryExpression"], ["const", "let"]],
  ["sec-3", "Tipos de datos", ["string", "number", "boolean", "null", "typeof"], ["VariableDeclaration", "UnaryExpression"], ["typeof"]],
  ["sec-4", "Operadores", ["comparación", "operador lógico AND"], ["LogicalExpression", "BinaryExpression"], ["&&"]],
  ["sec-5", "Condicionales", ["if", "else if", "else"], ["IfStatement"], ["if", "else"]],
  ["sec-6", "Funciones", ["función con parámetros", "return", "condicional"], ["FunctionDeclaration", "ReturnStatement", "IfStatement"], ["calcularAhorroEgresados"]],
  ["sec-7", "Arrays", ["array", "push", "shift", "length"], ["ArrayExpression", "CallExpression", "MemberExpression"], ["push", "shift", "length"]],
  ["sec-8", "Bucles", ["array", "bucles anidados", "validación de índices"], ["ArrayExpression", "ForStatement", "IfStatement"], ["for"]],
  ["sec-9", "Objetos literales", ["objeto", "método", "this", "reduce"], ["ObjectExpression", "ThisExpression", "CallExpression"], ["alumno", "obtenerEstado", "reduce"]],
  ["sec-10", "Arrays avanzados", ["objetos", "filter", "reduce"], ["ArrayExpression", "ObjectExpression", "CallExpression"], ["filter", "reduce"]],
  ["sec-11", "Métodos de strings", ["función", "trim", "toLowerCase", "replace"], ["FunctionDeclaration", "CallExpression", "ReturnStatement"], ["generarCorreo", "trim", "toLowerCase", "replace"]],
  ["sec-12", "Scope", ["variable global", "función", "variable de bloque"], ["VariableDeclaration", "FunctionDeclaration", "IfStatement"], ["let"]],
  ["sec-13", "DOM simulado", ["función", "innerText", "style", "condicional"], ["FunctionDeclaration", "AssignmentExpression", "IfStatement"], ["actualizarAnuncio", "innerText", "style"]],
  ["sec-14", "Formularios y eventos", ["función", "validación", "array de errores"], ["FunctionDeclaration", "IfStatement", "ArrayExpression"], ["validarInscripcion", "push"]],
  ["sec-15", "Persistencia", ["objeto de almacenamiento", "guardar", "obtener"], ["ObjectExpression", "FunctionDeclaration", "AssignmentExpression"], ["mockLocalStorage", "guardarPref", "obtenerPref"]],
  ["sec-16", "JSON", ["JSON.parse", "condicional", "reporte"], ["CallExpression", "IfStatement"], ["JSON.parse"]],
  ["sec-17", "Manejo de errores", ["try", "catch", "finally", "throw"], ["TryStatement", "ThrowStatement"], ["registrarNota", "Error"]],
  ["sec-18", "Clases", ["class", "constructor", "método", "timestamp"], ["ClassDeclaration", "MethodDefinition", "NewExpression"], ["SalaInformatica", "reservarCompu"]],
  ["sec-19", "Proyecto integrador", ["objeto", "filter", "reduce", "método"], ["ObjectExpression", "CallExpression", "MemberExpression"], ["centroEstudiantes", "generarReporte", "filter", "reduce"]]
];

const CHALLENGES = Object.freeze(Object.fromEntries(profiles.map(([
  id,
  title,
  concepts,
  requiredNodeTypes,
  requiredTokens
]) => [id, Object.freeze({
  id,
  title,
  concepts: Object.freeze(concepts),
  requiredNodeTypes: Object.freeze(requiredNodeTypes),
  requiredTokens: Object.freeze(requiredTokens),
  minimumStatements: id === "sec-19" ? 6 : 3
})])));

function getChallenge(sectionId) {
  return CHALLENGES[String(sectionId || "")] || null;
}

module.exports = { CHALLENGES, getChallenge };
